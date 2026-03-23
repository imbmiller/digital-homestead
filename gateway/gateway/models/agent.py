from sqlalchemy import String, Integer, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from gateway.database import Base


class Agent(Base):
    __tablename__ = "agents"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    name: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    role: Mapped[str] = mapped_column(String, nullable=False)  # worker|reviewer|observer|orchestrator
    owner_url: Mapped[str | None] = mapped_column(String)
    registered_at: Mapped[str] = mapped_column(String, nullable=False)
    last_seen_at: Mapped[str | None] = mapped_column(String)
    is_active: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    is_flagged: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    flag_reason: Mapped[str | None] = mapped_column(String)

    tokens: Mapped[list["AgentToken"]] = relationship(back_populates="agent", cascade="all, delete-orphan")


class AgentToken(Base):
    __tablename__ = "agent_tokens"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    agent_id: Mapped[str] = mapped_column(ForeignKey("agents.id", ondelete="CASCADE"), nullable=False)
    token_hash: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    created_at: Mapped[str] = mapped_column(String, nullable=False)
    expires_at: Mapped[str | None] = mapped_column(String)
    revoked: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    agent: Mapped["Agent"] = relationship(back_populates="tokens")
