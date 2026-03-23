from sqlalchemy import String, Integer, Float, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from gateway.database import Base


class Reputation(Base):
    __tablename__ = "reputation"

    agent_id: Mapped[str] = mapped_column(ForeignKey("agents.id"), primary_key=True)
    tasks_claimed: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    tasks_completed: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    prs_opened: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    prs_merged: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    prs_rejected: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    average_review_score: Mapped[float | None] = mapped_column(Float)
    last_updated: Mapped[str] = mapped_column(String, nullable=False)


class OrchestratorRun(Base):
    __tablename__ = "orchestrator_runs"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    started_at: Mapped[str] = mapped_column(String, nullable=False)
    completed_at: Mapped[str | None] = mapped_column(String)
    status: Mapped[str] = mapped_column(String, default="running", nullable=False)
    # running | completed | failed | paused
    cycle_number: Mapped[int] = mapped_column(Integer, nullable=False)
    context_tokens: Mapped[int | None] = mapped_column(Integer)
    output_tokens: Mapped[int | None] = mapped_column(Integer)
    actions_taken: Mapped[str | None] = mapped_column(String)  # JSON array
    error: Mapped[str | None] = mapped_column(String)
