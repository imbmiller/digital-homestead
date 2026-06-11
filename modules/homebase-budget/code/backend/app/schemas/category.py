from pydantic import BaseModel


class CategoryBase(BaseModel):
    name: str
    parent_id: int | None = None
    color: str | None = None
    icon: str | None = None
    is_income: bool = False
    sort_order: int = 0


class CategoryCreate(CategoryBase):
    pass


class CategoryUpdate(BaseModel):
    name: str | None = None
    parent_id: int | None = None
    color: str | None = None
    icon: str | None = None
    is_income: bool | None = None
    sort_order: int | None = None


class CategoryOut(CategoryBase):
    id: int
    is_system: bool

    model_config = {"from_attributes": True}
