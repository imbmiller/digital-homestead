from sqlalchemy import String, Integer, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from gateway.database import Base


class Task(Base):
    __tablename__ = "tasks"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    title: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str] = mapped_column(String, nullable=False)
    epic: Mapped[str | None] = mapped_column(String)
    status: Mapped[str] = mapped_column(String, default="open", nullable=False)
    # open | claimed | in_progress | in_review | done | cancelled
    priority: Mapped[int] = mapped_column(Integer, default=5, nullable=False)
    created_at: Mapped[str] = mapped_column(String, nullable=False)
    updated_at: Mapped[str] = mapped_column(String, nullable=False)
    claimed_by: Mapped[str | None] = mapped_column(ForeignKey("agents.id"), nullable=True)
    claimed_at: Mapped[str | None] = mapped_column(String)
    completed_at: Mapped[str | None] = mapped_column(String)
    pr_number: Mapped[int | None] = mapped_column(Integer)
    parent_task_id: Mapped[str | None] = mapped_column(ForeignKey("tasks.id"), nullable=True)
    orchestrator_notes: Mapped[str | None] = mapped_column(String)
