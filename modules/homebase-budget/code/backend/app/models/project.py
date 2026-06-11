from datetime import date
from sqlalchemy import String, Boolean, Float, Integer, ForeignKey, Date
from sqlalchemy.orm import Mapped, mapped_column, relationship
from ..database import Base


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    color: Mapped[str | None] = mapped_column(String)
    icon: Mapped[str | None] = mapped_column(String)
    budget: Mapped[float | None] = mapped_column(Float)
    start_date: Mapped[date | None] = mapped_column(Date)
    end_date: Mapped[date | None] = mapped_column(Date)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)


class TransactionProject(Base):
    __tablename__ = "transaction_projects"

    transaction_id: Mapped[int] = mapped_column(Integer, ForeignKey("transactions.id", ondelete="CASCADE"), primary_key=True)
    project_id: Mapped[int] = mapped_column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), primary_key=True)
    amount: Mapped[float | None] = mapped_column(Float)

    transaction = relationship("Transaction", back_populates="projects")
    project = relationship("Project")
