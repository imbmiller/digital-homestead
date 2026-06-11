from datetime import date
from datetime import date as date_type
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from pydantic import BaseModel
from sqlalchemy.orm import Session, joinedload
from ..database import get_db
from ..models.transaction import Transaction, TransactionSplit
from ..models.category import Category
from ..models.user import User
from ..schemas.transaction import (
    TransactionOut, TransactionUpdate, TransactionSplitUpdate,
    ImportPreviewRow, ImportResult,
)
from ..services.auth import get_current_user
from ..services.csv_parser import parse_csv, build_preview
from ..services.rules_engine import run_rules_on_transaction

router = APIRouter(prefix="/transactions", tags=["transactions"])


class BulkUpdateRequest(BaseModel):
    ids: list[int]
    category_id: int | None = None
    is_transfer: bool | None = None
    is_ignored: bool | None = None


def _query(db: Session):
    return db.query(Transaction).options(joinedload(Transaction.splits))


@router.get("/", response_model=list[TransactionOut])
def list_transactions(
    month: str | None = Query(None, description="YYYY-MM shorthand"),
    date_from: str | None = Query(None, description="ISO date, e.g. 2026-05-01"),
    date_to: str | None = Query(None, description="ISO date inclusive, e.g. 2026-05-31"),
    category_id: int | None = Query(None),
    account_id: int | None = Query(None),
    search: str | None = Query(None),
    sort_by: str = Query("date", description="date|amount|description"),
    sort_dir: str = Query("desc", description="asc|desc"),
    limit: int = Query(500, le=2000),
    offset: int = Query(0),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    q = _query(db)
    if month and not date_from:
        year, mo = month.split("-")
        date_from = f"{year}-{mo}-01"
        end_mo = int(mo) + 1
        end_yr = int(year)
        if end_mo > 12:
            end_mo, end_yr = 1, end_yr + 1
        date_to = (date(end_yr, end_mo, 1) - __import__("datetime").timedelta(days=1)).isoformat()
    if date_from:
        q = q.filter(Transaction.date >= date_type.fromisoformat(date_from))
    if date_to:
        q = q.filter(Transaction.date <= date_type.fromisoformat(date_to))
    if category_id is not None:
        q = q.filter(Transaction.category_id == category_id)
    if account_id is not None:
        q = q.filter(Transaction.account_id == account_id)
    if search:
        q = q.filter(Transaction.description.ilike(f"%{search}%"))
    sort_col = {"date": Transaction.date, "amount": Transaction.amount, "description": Transaction.description}.get(sort_by, Transaction.date)
    if sort_dir == "asc":
        q = q.order_by(sort_col.asc(), Transaction.id.asc())
    else:
        q = q.order_by(sort_col.desc(), Transaction.id.desc())
    return q.offset(offset).limit(limit).all()


@router.get("/{txn_id}", response_model=TransactionOut)
def get_transaction(txn_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    txn = _query(db).filter(Transaction.id == txn_id).first()
    if not txn:
        raise HTTPException(404, "Transaction not found")
    return txn


@router.patch("/{txn_id}", response_model=TransactionOut)
def update_transaction(
    txn_id: int,
    body: TransactionUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    txn = _query(db).filter(Transaction.id == txn_id).first()
    if not txn:
        raise HTTPException(404, "Transaction not found")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(txn, k, v)
    if "category_id" in body.model_fields_set:
        txn.is_reviewed = True
    db.commit()
    db.refresh(txn)
    return txn


@router.put("/{txn_id}/splits", response_model=TransactionOut)
def update_splits(
    txn_id: int,
    body: TransactionSplitUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    txn = _query(db).filter(Transaction.id == txn_id).first()
    if not txn:
        raise HTTPException(404, "Transaction not found")
    for split in txn.splits:
        db.delete(split)
    for s in body.splits:
        db.add(TransactionSplit(transaction_id=txn_id, **s.model_dump()))
    db.commit()
    db.refresh(txn)
    return txn


@router.post("/bulk-update")
def bulk_update_transactions(body: BulkUpdateRequest, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    if not body.ids:
        return {"updated": 0}
    update_data = {}
    if body.category_id is not None:
        update_data["category_id"] = body.category_id
        update_data["is_reviewed"] = True
    if body.is_transfer is not None:
        update_data["is_transfer"] = body.is_transfer
    if body.is_ignored is not None:
        update_data["is_ignored"] = body.is_ignored
    if update_data:
        db.query(Transaction).filter(Transaction.id.in_(body.ids)).update(update_data, synchronize_session=False)
        db.commit()
    return {"updated": len(body.ids)}


@router.post("/import/preview")
def import_preview(
    account_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    content = file.file.read()
    parsed = parse_csv(content)
    existing = {h for (h,) in db.query(Transaction.import_hash).filter(Transaction.import_hash != None).all()}
    preview = build_preview(parsed, existing)
    # Run rules to get suggested categories
    inbox = db.query(Category).filter(Category.is_system == True, Category.name == "Inbox").first()
    for row in preview:
        if row.status == "new":
            fake_txn = Transaction(
                raw_description=row.description,
                description=row.description,
                amount=row.amount,
                account_id=account_id,
                date=date_type.fromisoformat(row.date),
                category_id=inbox.id if inbox else None,
            )
            run_rules_on_transaction(fake_txn, db)
            if fake_txn.category_id and (not inbox or fake_txn.category_id != inbox.id):
                cat = db.query(Category).filter(Category.id == fake_txn.category_id).first()
                row.suggested_category_id = fake_txn.category_id
                row.suggested_category_name = cat.name if cat else None
    return {"rows": [r.model_dump() for r in preview], "parsed_count": len(parsed)}


@router.post("/import/confirm", response_model=ImportResult)
def import_confirm(
    account_id: int,
    rows: list[ImportPreviewRow],
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    inbox = db.query(Category).filter(Category.is_system == True, Category.name == "Inbox").first()
    imported = 0
    skipped = 0
    inbox_count = 0

    existing = {h for (h,) in db.query(Transaction.import_hash).filter(Transaction.import_hash != None).all()}

    for row in rows:
        if row.status == "duplicate" or row.import_hash in existing:
            skipped += 1
            continue
        txn = Transaction(
            account_id=account_id,
            date=date_type.fromisoformat(row.date),
            description=row.description,
            raw_description=row.description,
            amount=row.amount,
            balance=row.balance,
            import_hash=row.import_hash,
            category_id=row.suggested_category_id or (inbox.id if inbox else None),
        )
        run_rules_on_transaction(txn, db)
        db.add(txn)
        existing.add(row.import_hash)
        imported += 1
        if not txn.category_id or (inbox and txn.category_id == inbox.id):
            inbox_count += 1

    db.commit()
    return ImportResult(imported=imported, skipped=skipped, inbox=inbox_count)
