from sqlalchemy import String, Index, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from gateway.database import Base


class Event(Base):
    __tablename__ = "events"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    type: Mapped[str] = mapped_column(String, nullable=False)
    payload: Mapped[str] = mapped_column(String, nullable=False)  # JSON
    agent_id: Mapped[str | None] = mapped_column(ForeignKey("agents.id"), nullable=True)
    created_at: Mapped[str] = mapped_column(String, nullable=False)

    __table_args__ = (
        Index("ix_events_created_at", "created_at"),
        Index("ix_events_type", "type"),
    )
