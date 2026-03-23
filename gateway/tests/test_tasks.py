import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker

from gateway.main import create_app
from gateway.database import Base
from gateway.models import agent, task, event, pr, reputation  # noqa: F401

TEST_DB_URL = "sqlite+aiosqlite:///:memory:"


@pytest.fixture
async def client_and_tokens():
    test_engine = create_async_engine(TEST_DB_URL)
    TestSession = async_sessionmaker(test_engine, expire_on_commit=False)

    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    app = create_app()

    from gateway import database
    original_engine, original_session = database.engine, database.AsyncSessionLocal
    database.engine = test_engine
    database.AsyncSessionLocal = TestSession

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Register a worker and an orchestrator
        w = await client.post("/agents/register", json={"name": "worker-1", "role": "worker"})
        o_data = {"name": "orch", "role": "worker"}  # orchestrator role blocked from public register
        # Directly seed orchestrator via service
        from gateway.services.auth_service import register_agent
        async with TestSession() as db:
            orch_agent, orch_token = await register_agent(db, "orchestrator-bot", "orchestrator")

        worker_token = w.json()["token"]
        yield client, worker_token, orch_token

    database.engine = original_engine
    database.AsyncSessionLocal = original_session
    await test_engine.dispose()


async def test_create_and_list_task(client_and_tokens):
    client, worker_token, orch_token = client_and_tokens
    # Orchestrator creates a task
    resp = await client.post(
        "/tasks",
        json={"title": "Build something", "description": "Do the thing", "priority": 2, "epic": "infrastructure"},
        headers={"Authorization": f"Bearer {orch_token}"},
    )
    assert resp.status_code == 201
    task_id = resp.json()["id"]

    # Worker lists tasks
    resp = await client.get("/tasks?status=open", headers={"Authorization": f"Bearer {worker_token}"})
    assert resp.status_code == 200
    assert any(t["id"] == task_id for t in resp.json())


async def test_claim_and_unclaim(client_and_tokens):
    client, worker_token, orch_token = client_and_tokens
    task_resp = await client.post(
        "/tasks",
        json={"title": "Claimable task", "description": "desc", "priority": 5},
        headers={"Authorization": f"Bearer {orch_token}"},
    )
    task_id = task_resp.json()["id"]

    # Worker claims it
    resp = await client.post(f"/tasks/{task_id}/claim", headers={"Authorization": f"Bearer {worker_token}"})
    assert resp.status_code == 200
    assert resp.json()["status"] == "claimed"

    # Cannot claim again
    resp = await client.post(f"/tasks/{task_id}/claim", headers={"Authorization": f"Bearer {worker_token}"})
    assert resp.status_code == 409

    # Worker unclaims
    resp = await client.post(f"/tasks/{task_id}/unclaim", headers={"Authorization": f"Bearer {worker_token}"})
    assert resp.status_code == 200
    assert resp.json()["status"] == "open"


async def test_worker_cannot_create_task(client_and_tokens):
    client, worker_token, _ = client_and_tokens
    resp = await client.post(
        "/tasks",
        json={"title": "Sneaky task", "description": "desc"},
        headers={"Authorization": f"Bearer {worker_token}"},
    )
    assert resp.status_code == 403


async def test_orchestrator_delete_task(client_and_tokens):
    client, _, orch_token = client_and_tokens
    task_resp = await client.post(
        "/tasks",
        json={"title": "To cancel", "description": "desc", "priority": 9},
        headers={"Authorization": f"Bearer {orch_token}"},
    )
    task_id = task_resp.json()["id"]

    resp = await client.delete(f"/tasks/{task_id}", headers={"Authorization": f"Bearer {orch_token}"})
    assert resp.status_code == 204

    resp = await client.get(f"/tasks/{task_id}", headers={"Authorization": f"Bearer {orch_token}"})
    assert resp.json()["status"] == "cancelled"
