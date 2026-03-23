from sqlalchemy import String, Integer, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from gateway.database import Base


class PR(Base):
    __tablename__ = "prs"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    gh_pr_number: Mapped[int] = mapped_column(Integer, unique=True, nullable=False)
    title: Mapped[str] = mapped_column(String, nullable=False)
    body: Mapped[str | None] = mapped_column(String)
    author_agent_id: Mapped[str | None] = mapped_column(ForeignKey("agents.id"), nullable=True)
    task_id: Mapped[str | None] = mapped_column(ForeignKey("tasks.id"), nullable=True)
    state: Mapped[str] = mapped_column(String, default="open", nullable=False)
    # open | reviewed | approved | merged | closed | rejected
    opened_at: Mapped[str] = mapped_column(String, nullable=False)
    reviewed_at: Mapped[str | None] = mapped_column(String)
    merged_at: Mapped[str | None] = mapped_column(String)
    review_score: Mapped[int | None] = mapped_column(Integer)  # 0-100 composite
    review_notes: Mapped[str | None] = mapped_column(String)   # JSON: {manifesto,simplicity,security,quality,scope}
    gh_head_sha: Mapped[str] = mapped_column(String, nullable=False)
    gh_base_branch: Mapped[str] = mapped_column(String, default="main", nullable=False)
    merge_commit: Mapped[str | None] = mapped_column(String)
