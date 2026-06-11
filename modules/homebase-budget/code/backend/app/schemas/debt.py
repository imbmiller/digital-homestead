from pydantic import BaseModel
from typing import Optional


class DebtAccountCreate(BaseModel):
    name: str
    type: str
    balance: float
    interest_rate: float
    minimum_payment: float
    credit_limit: Optional[float] = None
    notes: Optional[str] = None
    is_active: bool = True


class DebtAccountUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    balance: Optional[float] = None
    interest_rate: Optional[float] = None
    minimum_payment: Optional[float] = None
    credit_limit: Optional[float] = None
    notes: Optional[str] = None
    is_active: Optional[bool] = None


class DebtAccountOut(BaseModel):
    id: int
    name: str
    type: str
    balance: float
    interest_rate: float
    minimum_payment: float
    credit_limit: Optional[float]
    notes: Optional[str]
    is_active: bool

    model_config = {"from_attributes": True}
