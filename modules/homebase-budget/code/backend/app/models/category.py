from sqlalchemy import String, Boolean, Integer, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from ..database import Base


class Category(Base):
    __tablename__ = "categories"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    parent_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("categories.id"))
    color: Mapped[str | None] = mapped_column(String)
    icon: Mapped[str | None] = mapped_column(String)
    is_income: Mapped[bool] = mapped_column(Boolean, default=False)
    is_system: Mapped[bool] = mapped_column(Boolean, default=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)

    children: Mapped[list["Category"]] = relationship("Category", back_populates="parent")
    parent: Mapped["Category | None"] = relationship("Category", back_populates="children", remote_side="Category.id")
