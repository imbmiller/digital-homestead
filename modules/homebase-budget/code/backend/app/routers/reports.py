import re
import calendar
from collections import defaultdict
from datetime import date as date_type, timedelta
from statistics import median
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from ..database import get_db
from ..models.transaction import Transaction
from ..models.category import Category
from ..models.account import Account
from ..models.debt import DebtAccount
from ..models.asset import Asset, NetWorthSnapshot
from ..models.user import User
from ..services.auth import get_current_user

router = APIRouter(prefix="/reports", tags=["reports"])

SYSTEM_CAT_NAMES = {"Inbox", "Transfer", "Ignored"}


def _excluded_cat_ids(db: Session) -> set[int]:
    cats = db.query(Category).filter(Category.is_system == True).all()
    return {c.id for c in cats}


@router.get("/spending")
def spending_report(
    date_from: str = Query(...),
    date_to: str = Query(...),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    excluded = _excluded_cat_ids(db)
    rows = (
        db.query(
            Transaction.category_id,
            func.sum(Transaction.amount).label("total"),
            func.count(Transaction.id).label("count"),
        )
        .filter(
            Transaction.date >= date_type.fromisoformat(date_from),
            Transaction.date <= date_type.fromisoformat(date_to),
            Transaction.is_ignored == False,
            Transaction.is_transfer == False,
            Transaction.amount < 0,
        )
        .group_by(Transaction.category_id)
        .all()
    )
    cats = {c.id: c for c in db.query(Category).all()}
    result = []
    for row in rows:
        if row.category_id in excluded:
            continue
        cat = cats.get(row.category_id)
        result.append({
            "category_id": row.category_id,
            "category_name": cat.name if cat else "Uncategorized",
            "category_color": cat.color if cat else None,
            "total_spent": abs(row.total),
            "transaction_count": row.count,
        })
    result.sort(key=lambda x: x["total_spent"], reverse=True)
    return result


@router.get("/monthly-trend")
def monthly_trend(
    months: int = Query(6, ge=1, le=24),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    excluded = _excluded_cat_ids(db)
    today = date_type.today()
    result = []
    for i in range(months - 1, -1, -1):
        mo = today.month - i
        yr = today.year
        while mo <= 0:
            mo += 12
            yr -= 1
        _, last_day = calendar.monthrange(yr, mo)
        month_str = f"{yr}-{mo:02d}"
        rows = (
            db.query(Transaction.category_id, func.sum(Transaction.amount).label("total"))
            .filter(
                Transaction.date >= date_type(yr, mo, 1),
                Transaction.date <= date_type(yr, mo, last_day),
                Transaction.is_ignored == False,
                Transaction.is_transfer == False,
                Transaction.amount < 0,
            )
            .group_by(Transaction.category_id)
            .all()
        )
        for row in rows:
            if row.category_id in excluded:
                continue
            result.append({"month": month_str, "category_id": row.category_id, "total_spent": abs(row.total)})
    return result


@router.get("/income-expense")
def income_expense(
    date_from: str = Query(...),
    date_to: str = Query(...),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    excluded = _excluded_cat_ids(db)
    txns = db.query(Transaction).filter(
        Transaction.date >= date_type.fromisoformat(date_from),
        Transaction.date <= date_type.fromisoformat(date_to),
        Transaction.is_ignored == False,
        Transaction.is_transfer == False,
    ).all()
    cats = {c.id: c for c in db.query(Category).all()}

    income = 0.0
    expenses = 0.0
    income_by_cat: dict = defaultdict(float)
    expense_by_cat: dict = defaultdict(float)

    for t in txns:
        if t.category_id in excluded:
            continue
        if t.amount > 0:
            income += t.amount
            income_by_cat[t.category_id] += t.amount
        else:
            expenses += abs(t.amount)
            expense_by_cat[t.category_id] += abs(t.amount)

    def format_by_cat(d):
        return [
            {
                "category_id": cid,
                "category_name": cats[cid].name if cid in cats else "Uncategorized",
                "category_color": cats[cid].color if cid in cats else None,
                "total": round(amt, 2),
            }
            for cid, amt in sorted(d.items(), key=lambda x: -x[1])
        ]

    return {
        "income": round(income, 2),
        "expenses": round(expenses, 2),
        "net": round(income - expenses, 2),
        "income_by_category": format_by_cat(income_by_cat),
        "expense_by_category": format_by_cat(expense_by_cat),
    }


_STRIP_PREFIXES = re.compile(
    r"^(debit card (withdrawal|purchase|payment):\s*|pos purchase\s*|ach\s+|online\s+transfer\s+|check\s+card\s+)",
    re.IGNORECASE,
)
_STRIP_SUFFIX_NUMS = re.compile(r"[\s#*]+\d[\d\s\-*#]*$")


def _normalize(desc: str) -> str:
    s = _STRIP_PREFIXES.sub("", desc).strip()
    s = _STRIP_SUFFIX_NUMS.sub("", s).strip().lower()
    return s[:40]


@router.get("/recurring")
def recurring_detection(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    excluded = _excluded_cat_ids(db)
    txns = db.query(Transaction).filter(
        Transaction.is_ignored == False,
        Transaction.is_transfer == False,
        Transaction.amount < 0,
    ).order_by(Transaction.date.asc()).all()

    groups: dict[str, list] = defaultdict(list)
    for t in txns:
        if t.category_id in excluded:
            continue
        key = _normalize(t.description)
        if key:
            groups[key].append(t)

    FREQ_WINDOWS = {
        "Weekly": (5, 9),
        "Biweekly": (11, 17),
        "Monthly": (25, 35),
    }

    results = []
    for key, items in groups.items():
        if len(items) < 2:
            continue
        dates = sorted(t.date for t in items)
        intervals = [(dates[i + 1] - dates[i]).days for i in range(len(dates) - 1)]
        med = median(intervals)
        freq = None
        for name, (lo, hi) in FREQ_WINDOWS.items():
            if lo <= med <= hi:
                freq = name
                break
        if not freq:
            continue
        amounts = [abs(t.amount) for t in items]
        med_amount = median(amounts)
        results.append({
            "normalized_name": key,
            "original_name": items[-1].description,
            "frequency": freq,
            "median_amount": round(med_amount, 2),
            "last_date": str(dates[-1]),
            "next_expected": str(dates[-1] + timedelta(days=round(med))),
            "transaction_count": len(items),
            "category_id": items[-1].category_id,
        })

    results.sort(key=lambda x: x["median_amount"], reverse=True)
    return results


@router.get("/cashflow")
def cashflow_projection(
    days: int = Query(90, ge=7, le=365),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    recurring = recurring_detection(db=db, _=None)
    accounts = db.query(Account).filter(Account.is_active == True).all()
    starting_balance = sum(a.current_balance or 0 for a in accounts)

    today = date_type.today()
    events = []
    for item in recurring:
        next_d = date_type.fromisoformat(item["next_expected"])
        freq_days = {"Weekly": 7, "Biweekly": 14, "Monthly": 30}[item["frequency"]]
        while next_d <= today + timedelta(days=days):
            if next_d >= today:
                events.append({"date": str(next_d), "label": item["original_name"], "amount": -item["median_amount"], "type": "expense"})
            next_d += timedelta(days=freq_days)

    events.sort(key=lambda x: x["date"])
    running = starting_balance
    result = []
    for ev in events:
        running += ev["amount"]
        result.append({**ev, "running_balance": round(running, 2)})
    return {"starting_balance": round(starting_balance, 2), "events": result}


@router.get("/net-worth")
def net_worth(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    accounts = db.query(Account).filter(Account.is_active == True).all()
    debts = db.query(DebtAccount).filter(DebtAccount.is_active == True).all()
    assets = db.query(Asset).all()

    account_assets = [{"name": a.name, "value": a.current_balance or 0, "type": a.type} for a in accounts if (a.current_balance or 0) >= 0]
    account_liabilities = [{"name": a.name, "value": abs(a.current_balance or 0), "type": a.type} for a in accounts if (a.current_balance or 0) < 0]
    manual_assets = [{"name": a.name, "value": a.value, "type": a.asset_type} for a in assets]
    debt_liabilities = [{"name": d.name, "value": d.balance, "type": d.type} for d in debts]

    total_assets = sum(x["value"] for x in account_assets + manual_assets)
    total_liabilities = sum(x["value"] for x in account_liabilities + debt_liabilities)
    net = total_assets - total_liabilities

    # Snapshot current month
    today = date_type.today()
    month_str = f"{today.year}-{today.month:02d}"
    existing = db.query(NetWorthSnapshot).filter(NetWorthSnapshot.month == month_str).first()
    if not existing:
        db.add(NetWorthSnapshot(month=month_str, value=round(net, 2)))
        db.commit()

    snapshots = db.query(NetWorthSnapshot).order_by(NetWorthSnapshot.month.asc()).all()

    return {
        "total_assets": round(total_assets, 2),
        "total_liabilities": round(total_liabilities, 2),
        "net_worth": round(net, 2),
        "account_assets": account_assets,
        "account_liabilities": account_liabilities,
        "manual_assets": manual_assets,
        "debt_liabilities": debt_liabilities,
        "snapshots": [{"month": s.month, "value": s.value} for s in snapshots],
    }
