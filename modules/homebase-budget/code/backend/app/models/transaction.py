from datetime import datetime, date
from sqlalchemy import String, Boolean, Float, Integer, ForeignKey, Date, DateTime, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from ..database import Base


class Transaction(Base):
    __tablename__ = "transactions"

    id: Mapped[int] = mapped_column(primary_key=True)
    account_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("accounts.id"))
    date: Mapped[date] = mapped_column(Date, nullable=False)
    description: Mapped[str] = mapped_column(String, nullable=False)
    raw_description: Mapped[str] = mapped_column(String, nullable=False)
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    balance: Mapped[float | None] = mapped_column(Float)
    category_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("categories.id"))
    is_transfer: Mapped[bool] = mapped_column(Boolean, default=False)
    is_ignored: Mapped[bool] = mapped_column(Boolean, default=False)
    is_reviewed: Mapped[bool] = mapped_column(Boolean, default=False)
    notes: Mapped[str | None] = mapped_column(Text)
    debt_account_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("debt_accounts.id"), nullable=True)
    is_cleared: Mapped[bool] = mapped_column(Boolean, default=False)
    import_hash: Mapped[str | None] = mapped_column(String, unique=True)
    imported_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    account = relationship("Account")
    category = relationship("Category")
    debt_account = relationship("DebtAccount")
    splits: Mapped[list["TransactionSplit"]] = relationship(
        "TransactionSplit", back_populates="transaction", cascade="all, delete-orphan"
    )
    projects: Mapped[list["TransactionProject"]] = relationship(
        "TransactionProject", back_populates="transaction", cascade="all, delete-orphan"
    )


class TransactionSplit(Base):
    __tablename__ = "transaction_splits"

    id: Mapped[int] = mapped_column(primary_key=True)
    transaction_id: Mapped[int] = mapped_column(Integer, ForeignKey("transactions.id", ondelete="CASCADE"))
    category_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("categories.id"))
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text)

    transaction: Mapped["Transaction"] = relationship("Transaction", back_populates="splits")
    category = relationship("Category")
