from datetime import datetime
from sqlalchemy import String, Boolean, Float, Integer, ForeignKey, DateTime, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from ..database import Base


class CategorizationRule(Base):
    __tablename__ = "categorization_rules"

    id: Mapped[int] = mapped_column(primary_key=True)
    priority: Mapped[int] = mapped_column(Integer, default=100, nullable=False)
    name: Mapped[str | None] = mapped_column(String)

    cond_description_contains: Mapped[str | None] = mapped_column(String)
    cond_description_regex: Mapped[str | None] = mapped_column(String)
    cond_merchant_contains: Mapped[str | None] = mapped_column(String)
    cond_amount_min: Mapped[float | None] = mapped_column(Float)
    cond_amount_max: Mapped[float | None] = mapped_column(Float)
    cond_transaction_type: Mapped[str | None] = mapped_column(String)  # debit | credit | any
    cond_account_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("accounts.id"))

    action_category_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("categories.id"))
    action_set_transfer: Mapped[bool] = mapped_column(Boolean, default=False)
    action_set_ignored: Mapped[bool] = mapped_column(Boolean, default=False)
    action_set_description: Mapped[str | None] = mapped_column(String)

    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    action_category = relationship("Category", foreign_keys=[action_category_id])
