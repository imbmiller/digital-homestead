import re
from sqlalchemy.orm import Session
from ..models.rule import CategorizationRule
from ..models.transaction import Transaction


def _matches(rule: CategorizationRule, txn: Transaction) -> bool:
    desc = txn.raw_description.lower()
    abs_amount = abs(txn.amount)
    txn_type = "credit" if txn.amount > 0 else "debit"

    if rule.cond_description_contains:
        if rule.cond_description_contains.lower() not in desc:
            return False
    if rule.cond_description_regex:
        if not re.search(rule.cond_description_regex, txn.raw_description, re.IGNORECASE):
            return False
    if rule.cond_merchant_contains:
        if rule.cond_merchant_contains.lower() not in desc:
            return False
    if rule.cond_amount_min is not None:
        if abs_amount < rule.cond_amount_min:
            return False
    if rule.cond_amount_max is not None:
        if abs_amount > rule.cond_amount_max:
            return False
    if rule.cond_transaction_type and rule.cond_transaction_type != "any":
        if txn_type != rule.cond_transaction_type:
            return False
    if rule.cond_account_id is not None:
        if txn.account_id != rule.cond_account_id:
            return False
    return True


def apply_rules(txn: Transaction, rules: list[CategorizationRule]) -> Transaction:
    for rule in rules:
        if not rule.is_active:
            continue
        if _matches(rule, txn):
            if rule.action_category_id is not None:
                txn.category_id = rule.action_category_id
            if rule.action_set_transfer:
                txn.is_transfer = True
            if rule.action_set_ignored:
                txn.is_ignored = True
            if rule.action_set_description:
                txn.description = rule.action_set_description
            break
    return txn


def run_rules_on_transaction(txn: Transaction, db: Session) -> Transaction:
    rules = db.query(CategorizationRule).filter(
        CategorizationRule.is_active == True
    ).order_by(CategorizationRule.priority.asc()).all()
    return apply_rules(txn, rules)


def bulk_apply_rules(db: Session, mode: str = "all", date_from: str | None = None) -> dict:
    from datetime import date as date_type
    from ..models.category import Category

    rules = db.query(CategorizationRule).filter(
        CategorizationRule.is_active == True
    ).order_by(CategorizationRule.priority.asc()).all()

    q = db.query(Transaction)

    if mode == "uncategorized":
        inbox = db.query(Category).filter(
            Category.name == "Inbox", Category.is_system == True
        ).first()
        if inbox:
            q = q.filter(
                (Transaction.category_id == None) | (Transaction.category_id == inbox.id)
            )
        else:
            q = q.filter(Transaction.category_id == None)

    if mode == "after_date" and date_from:
        q = q.filter(Transaction.date >= date_type.fromisoformat(date_from))

    txns = q.all()
    count = 0
    for txn in txns:
        apply_rules(txn, rules)
        count += 1
    db.commit()
    return {"updated": count, "total": len(txns)}
