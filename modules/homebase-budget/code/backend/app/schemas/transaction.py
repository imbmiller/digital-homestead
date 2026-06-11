from datetime import date, datetime
from pydantic import BaseModel


class TransactionSplitOut(BaseModel):
    id: int
    category_id: int | None
    amount: float
    notes: str | None

    model_config = {"from_attributes": True}


class TransactionOut(BaseModel):
    id: int
    account_id: int | None
    date: date
    description: str
    raw_description: str
    amount: float
    balance: float | None
    category_id: int | None
    is_transfer: bool
    is_ignored: bool
    is_reviewed: bool
    is_cleared: bool = False
    notes: str | None
    debt_account_id: int | None = None
    imported_at: datetime
    updated_at: datetime
    splits: list[TransactionSplitOut] = []

    model_config = {"from_attributes": True}


class TransactionUpdate(BaseModel):
    description: str | None = None
    category_id: int | None = None
    is_transfer: bool | None = None
    is_ignored: bool | None = None
    is_reviewed: bool | None = None
    is_cleared: bool | None = None
    notes: str | None = None
    debt_account_id: int | None = None


class TransactionSplitIn(BaseModel):
    category_id: int | None
    amount: float
    notes: str | None = None


class TransactionSplitUpdate(BaseModel):
    splits: list[TransactionSplitIn]


class ImportPreviewRow(BaseModel):
    row_index: int
    date: str
    description: str
    amount: float
    balance: float | None
    status: str  # new | duplicate | ambiguous
    import_hash: str
    suggested_category_id: int | None = None
    suggested_category_name: str | None = None


class ImportConfirm(BaseModel):
    account_id: int
    rows: list[ImportPreviewRow]


class ImportResult(BaseModel):
    imported: int
    skipped: int
    inbox: int
