from pydantic import BaseModel


class AccountBase(BaseModel):
    name: str
    type: str
    institution: str | None = None
    current_balance: float | None = None
    credit_limit: float | None = None
    apr: float | None = None
    minimum_payment: float | None = None
    is_active: bool = True
    color: str | None = None
    sort_order: int = 0


class AccountCreate(AccountBase):
    pass


class AccountUpdate(AccountBase):
    name: str | None = None
    type: str | None = None


class AccountOut(AccountBase):
    id: int

    model_config = {"from_attributes": True}
