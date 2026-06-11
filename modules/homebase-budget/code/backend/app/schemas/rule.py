from datetime import datetime
from pydantic import BaseModel


class RuleBase(BaseModel):
    priority: int = 100
    name: str | None = None
    cond_description_contains: str | None = None
    cond_description_regex: str | None = None
    cond_merchant_contains: str | None = None
    cond_amount_min: float | None = None
    cond_amount_max: float | None = None
    cond_transaction_type: str | None = None
    cond_account_id: int | None = None
    action_category_id: int | None = None
    action_set_transfer: bool = False
    action_set_ignored: bool = False
    action_set_description: str | None = None
    is_active: bool = True


class RuleCreate(RuleBase):
    pass


class RuleUpdate(RuleBase):
    priority: int | None = None
    is_active: bool | None = None


class RuleOut(RuleBase):
    id: int
    created_at: datetime

    model_config = {"from_attributes": True}


class RuleTestResult(BaseModel):
    count: int
    sample: list[dict]
