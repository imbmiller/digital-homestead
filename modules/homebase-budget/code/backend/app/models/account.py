from sqlalchemy import String, Boolean, Float, Integer
from sqlalchemy.orm import Mapped, mapped_column
from ..database import Base


class Account(Base):
    __tablename__ = "accounts"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    type: Mapped[str] = mapped_column(String, nullable=False)  # checking | savings | credit_card
    institution: Mapped[str | None] = mapped_column(String)
    current_balance: Mapped[float | None] = mapped_column(Float)
    credit_limit: Mapped[float | None] = mapped_column(Float)
    apr: Mapped[float | None] = mapped_column(Float)
    minimum_payment: Mapped[float | None] = mapped_column(Float)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    color: Mapped[str | None] = mapped_column(String)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
