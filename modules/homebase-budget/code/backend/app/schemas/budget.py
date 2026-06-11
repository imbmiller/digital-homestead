from pydantic import BaseModel


class BudgetBase(BaseModel):
    category_id: int
    month: str
    allocated: float = 0
    rollover_amount: float = 0
    rollover_cap: float | None = None


class BudgetCreate(BudgetBase):
    pass


class BudgetUpdate(BaseModel):
    allocated: float | None = None
    rollover_amount: float | None = None
    rollover_cap: float | None = None


class BudgetOut(BudgetBase):
    id: int

    model_config = {"from_attributes": True}
