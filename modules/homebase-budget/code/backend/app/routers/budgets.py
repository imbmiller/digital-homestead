from datetime import date as date_type
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from ..database import get_db
from ..models.budget import Budget
from ..models.transaction import Transaction
from ..models.category import Category
from ..models.user import User
from ..schemas.budget import BudgetCreate, BudgetUpdate, BudgetOut
from ..services.auth import get_current_user

router = APIRouter(prefix="/budgets", tags=["budgets"])


@router.get("/", response_model=list[BudgetOut])
def list_budgets(
    month: str | None = Query(None),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    q = db.query(Budget)
    if month:
        q = q.filter(Budget.month == month)
    return q.all()


@router.post("/", response_model=BudgetOut)
def upsert_budget(body: BudgetCreate, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    existing = db.query(Budget).filter(
        Budget.category_id == body.category_id,
        Budget.month == body.month,
    ).first()
    if existing:
        for k, v in body.model_dump(exclude_unset=True).items():
            setattr(existing, k, v)
        db.commit()
        db.refresh(existing)
        return existing
    budget = Budget(**body.model_dump())
    db.add(budget)
    db.commit()
    db.refresh(budget)
    return budget


@router.patch("/{budget_id}", response_model=BudgetOut)
def update_budget(budget_id: int, body: BudgetUpdate, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    budget = db.query(Budget).filter(Budget.id == budget_id).first()
    if not budget:
        raise HTTPException(404, "Budget not found")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(budget, k, v)
    db.commit()
    db.refresh(budget)
    return budget


@router.get("/rollover")
def get_rollover(
    month: str = Query(..., description="YYYY-MM — current month to compute rollover INTO"),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Compute prior-month rollover credits for categories with rollover enabled (rollover_cap IS NOT NULL)."""
    import calendar
    year, mo = int(month[:4]), int(month[5:7])
    # Previous month
    prev_mo = mo - 1
    prev_yr = year
    if prev_mo == 0:
        prev_mo = 12
        prev_yr -= 1
    prev_month_str = f"{prev_yr}-{prev_mo:02d}"
    _, last_day = calendar.monthrange(prev_yr, prev_mo)
    prev_from = date_type(prev_yr, prev_mo, 1)
    prev_to = date_type(prev_yr, prev_mo, last_day)

    prev_budgets = db.query(Budget).filter(
        Budget.month == prev_month_str,
        Budget.rollover_cap != None,
    ).all()

    results = []
    inbox = db.query(Category).filter(Category.name == "Inbox", Category.is_system == True).first()
    ignored = db.query(Category).filter(Category.name == "Ignored", Category.is_system == True).first()
    transfer = db.query(Category).filter(Category.name == "Transfer", Category.is_system == True).first()
    excluded_ids = {c.id for c in [inbox, ignored, transfer] if c}

    for b in prev_budgets:
        if b.category_id in excluded_ids:
            continue
        spent = db.query(Transaction).filter(
            Transaction.category_id == b.category_id,
            Transaction.date >= prev_from,
            Transaction.date <= prev_to,
            Transaction.is_ignored == False,
            Transaction.is_transfer == False,
            Transaction.amount < 0,
        ).all()
        total_spent = sum(abs(t.amount) for t in spent)
        unused = b.allocated - total_spent
        if unused <= 0:
            results.append({"category_id": b.category_id, "rollover_amount": 0})
            continue
        cap = b.rollover_cap
        rollover = min(unused, cap) if cap and cap > 0 else unused
        results.append({"category_id": b.category_id, "rollover_amount": round(rollover, 2)})

    return results
