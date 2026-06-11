from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from ..database import get_db
from ..models.debt import DebtAccount
from ..models.transaction import Transaction
from ..schemas.debt import DebtAccountCreate, DebtAccountUpdate, DebtAccountOut
from ..services.auth import get_current_user
from ..models.user import User

router = APIRouter(prefix="/debts", tags=["debts"])


@router.get("/", response_model=list[DebtAccountOut])
def list_debts(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    return db.query(DebtAccount).filter(DebtAccount.is_active == True).order_by(DebtAccount.id).all()


@router.post("/", response_model=DebtAccountOut)
def create_debt(body: DebtAccountCreate, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    debt = DebtAccount(**body.model_dump())
    db.add(debt)
    db.commit()
    db.refresh(debt)
    return debt


@router.patch("/{debt_id}", response_model=DebtAccountOut)
def update_debt(debt_id: int, body: DebtAccountUpdate, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    debt = db.query(DebtAccount).filter(DebtAccount.id == debt_id).first()
    if not debt:
        raise HTTPException(404, "Debt not found")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(debt, k, v)
    db.commit()
    db.refresh(debt)
    return debt


@router.delete("/{debt_id}")
def delete_debt(debt_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    debt = db.query(DebtAccount).filter(DebtAccount.id == debt_id).first()
    if not debt:
        raise HTTPException(404, "Debt not found")
    # Unlink any payments before deleting
    db.query(Transaction).filter(Transaction.debt_account_id == debt_id).update({"debt_account_id": None})
    db.delete(debt)
    db.commit()
    return {"ok": True}


@router.get("/{debt_id}/payments")
def get_payments(debt_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    debt = db.query(DebtAccount).filter(DebtAccount.id == debt_id).first()
    if not debt:
        raise HTTPException(404, "Debt not found")
    txns = (
        db.query(Transaction)
        .filter(Transaction.debt_account_id == debt_id)
        .order_by(Transaction.date.desc())
        .all()
    )
    total = sum(abs(t.amount) for t in txns)
    return {
        "payments": [
            {"id": t.id, "date": str(t.date), "description": t.description, "amount": t.amount}
            for t in txns
        ],
        "total_paid": total,
    }
