from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import text

from gateway.settings import settings

engine = create_async_engine(settings.database_url, echo=False)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def init_db() -> None:
    """Create all tables and enable WAL mode."""
    async with engine.begin() as conn:
        # Import models so Base knows about them
        from gateway.models import agent, task, event, pr, reputation  # noqa: F401
        await conn.run_sync(Base.metadata.create_all)
        # WAL mode for better concurrent reads with SQLite
        await conn.execute(text("PRAGMA journal_mode=WAL"))


async def get_db() -> AsyncSession:  # type: ignore[return]
    async with AsyncSessionLocal() as session:
        yield session
