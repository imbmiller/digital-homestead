from sqlalchemy import String, Float, Integer, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column
from ..database import Base


class Budget(Base):
    __tablename__ = "budgets"
    __table_args__ = (UniqueConstraint("category_id", "month"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    category_id: Mapped[int] = mapped_column(Integer, ForeignKey("categories.id"), nullable=False)
    month: Mapped[str] = mapped_column(String, nullable=False)  # "2026-05"
    allocated: Mapped[float] = mapped_column(Float, default=0)
    rollover_amount: Mapped[float] = mapped_column(Float, default=0)
    rollover_cap: Mapped[float | None] = mapped_column(Float)
