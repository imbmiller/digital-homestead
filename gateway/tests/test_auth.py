import pytest
from httpx import AsyncClient, ASGITransport
from unittest.mock import patch, AsyncMock

from gateway.main import create_app
from gateway.database import Base, init_db, engine, AsyncSessionLocal
from gateway.models import agent, task, event, pr, reputation  # noqa: F401

from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker

TEST_DB_URL = "sqlite+aiosqlite:///:memory:"


@pytest.fixture
async def test_app():
    test_engine = create_async_engine(TEST_DB_URL)
    TestSession = async_sessionmaker(test_engine, expire_on_commit=False)

    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    app = create_app()

    from gateway import database
    original_engine = database.engine
    original_session = database.AsyncSessionLocal

    database.engine = test_engine
    database.AsyncSessionLocal = TestSession

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        yield client

    database.engine = original_engine
    database.AsyncSessionLocal = original_session
    await test_engine.dispose()


async def test_register_worker(test_app):
    resp = await test_app.post("/agents/register", json={
        "name": "test-worker",
        "role": "worker",
        "owner_url": "https://example.com",
    })
    assert resp.status_code == 201
    data = resp.json()
    assert data["name"] == "test-worker"
    assert data["role"] == "worker"
    assert len(data["token"]) == 64  # 32 bytes hex
    assert "agent_id" in data


async def test_register_duplicate_name(test_app):
    await test_app.post("/agents/register", json={"name": "dup-agent", "role": "worker"})
    resp = await test_app.post("/agents/register", json={"name": "dup-agent", "role": "worker"})
    assert resp.status_code == 409


async def test_register_invalid_role(test_app):
    resp = await test_app.post("/agents/register", json={"name": "bad-agent", "role": "orchestrator"})
    assert resp.status_code == 422


async def test_register_invalid_name(test_app):
    resp = await test_app.post("/agents/register", json={"name": "has spaces!", "role": "worker"})
    assert resp.status_code == 422


async def test_health_endpoint(test_app):
    resp = await test_app.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert data["db"] == "ok"
