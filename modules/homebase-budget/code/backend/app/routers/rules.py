from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from ..database import get_db
from ..models.rule import CategorizationRule
from ..models.transaction import Transaction
from ..models.user import User
from ..schemas.rule import RuleCreate, RuleUpdate, RuleOut, RuleTestResult
from ..services.auth import get_current_user
from ..services.rules_engine import _matches, bulk_apply_rules


class BulkApplyRequest(BaseModel):
    mode: str = "all"          # "uncategorized" | "all" | "after_date"
    date_from: str | None = None

router = APIRouter(prefix="/rules", tags=["rules"])


@router.get("/", response_model=list[RuleOut])
def list_rules(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    return db.query(CategorizationRule).order_by(CategorizationRule.priority.asc()).all()


@router.post("/", response_model=RuleOut)
def create_rule(body: RuleCreate, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    rule = CategorizationRule(**body.model_dump())
    db.add(rule)
    db.commit()
    db.refresh(rule)
    return rule


@router.patch("/{rule_id}", response_model=RuleOut)
def update_rule(rule_id: int, body: RuleUpdate, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    rule = db.query(CategorizationRule).filter(CategorizationRule.id == rule_id).first()
    if not rule:
        raise HTTPException(404, "Rule not found")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(rule, k, v)
    db.commit()
    db.refresh(rule)
    return rule


@router.delete("/{rule_id}")
def delete_rule(rule_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    rule = db.query(CategorizationRule).filter(CategorizationRule.id == rule_id).first()
    if not rule:
        raise HTTPException(404, "Rule not found")
    db.delete(rule)
    db.commit()
    return {"ok": True}


@router.post("/{rule_id}/test", response_model=RuleTestResult)
def test_rule(rule_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    rule = db.query(CategorizationRule).filter(CategorizationRule.id == rule_id).first()
    if not rule:
        raise HTTPException(404, "Rule not found")
    txns = db.query(Transaction).all()
    matches = [t for t in txns if _matches(rule, t)]
    sample = [{"id": t.id, "description": t.description, "amount": t.amount, "date": str(t.date)} for t in matches[:10]]
    return RuleTestResult(count=len(matches), sample=sample)


@router.post("/{rule_id}/apply")
def apply_single_rule(rule_id: int, body: BulkApplyRequest, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    from datetime import date as date_type
    from ..models.category import Category

    rule = db.query(CategorizationRule).filter(CategorizationRule.id == rule_id).first()
    if not rule:
        raise HTTPException(404, "Rule not found")

    q = db.query(Transaction)
    if body.mode == "uncategorized":
        inbox = db.query(Category).filter(Category.name == "Inbox", Category.is_system == True).first()
        if inbox:
            q = q.filter((Transaction.category_id == None) | (Transaction.category_id == inbox.id))
        else:
            q = q.filter(Transaction.category_id == None)
    elif body.mode == "after_date" and body.date_from:
        q = q.filter(Transaction.date >= date_type.fromisoformat(body.date_from))

    count = 0
    for txn in q.all():
        if _matches(rule, txn):
            if rule.action_category_id is not None:
                txn.category_id = rule.action_category_id
            if rule.action_set_transfer:
                txn.is_transfer = True
            if rule.action_set_ignored:
                txn.is_ignored = True
            if rule.action_set_description:
                txn.description = rule.action_set_description
            count += 1
    db.commit()
    return {"applied": count}


@router.post("/bulk-apply")
def bulk_apply(body: BulkApplyRequest, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    return bulk_apply_rules(db, mode=body.mode, date_from=body.date_from)


@router.put("/reorder")
def reorder_rules(order: list[dict], db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    for item in order:
        rule = db.query(CategorizationRule).filter(CategorizationRule.id == item["id"]).first()
        if rule:
            rule.priority = item["priority"]
    db.commit()
    return {"ok": True}
