import uuid
from datetime import datetime, timezone

from sqlalchemy import select

from gateway.models.agent import Agent, AgentToken
from gateway.models.task import Task
from gateway.models.event import Event
from gateway.models.pr import PR
from gateway.models.reputation import Reputation, OrchestratorRun


def now() -> str:
    return datetime.now(timezone.utc).isoformat()


async def test_create_agent(db_session):
    agent = Agent(
        id=str(uuid.uuid4()),
        name="test-agent",
        role="worker",
        owner_url="https://example.com",
        registered_at=now(),
    )
    db_session.add(agent)
    await db_session.commit()

    result = await db_session.execute(select(Agent).where(Agent.name == "test-agent"))
    fetched = result.scalar_one()
    assert fetched.role == "worker"
    assert fetched.is_active == 1
    assert fetched.is_flagged == 0


async def test_create_agent_token(db_session):
    agent = Agent(id=str(uuid.uuid4()), name="token-agent", role="worker", registered_at=now())
    db_session.add(agent)
    await db_session.flush()

    token = AgentToken(
        id=str(uuid.uuid4()),
        agent_id=agent.id,
        token_hash="abc123",
        created_at=now(),
    )
    db_session.add(token)
    await db_session.commit()

    result = await db_session.execute(select(AgentToken).where(AgentToken.agent_id == agent.id))
    fetched = result.scalar_one()
    assert fetched.revoked == 0


async def test_create_task(db_session):
    task = Task(
        id=str(uuid.uuid4()),
        title="Build the thing",
        description="A detailed spec.",
        epic="infrastructure",
        priority=3,
        created_at=now(),
        updated_at=now(),
    )
    db_session.add(task)
    await db_session.commit()

    result = await db_session.execute(select(Task).where(Task.title == "Build the thing"))
    fetched = result.scalar_one()
    assert fetched.status == "open"
    assert fetched.priority == 3


async def test_create_event(db_session):
    event = Event(
        id=str(uuid.uuid4()),
        type="task.created",
        payload='{"task_id": "abc"}',
        created_at=now(),
    )
    db_session.add(event)
    await db_session.commit()

    result = await db_session.execute(select(Event).where(Event.type == "task.created"))
    fetched = result.scalar_one()
    assert fetched.payload == '{"task_id": "abc"}'


async def test_create_pr(db_session):
    p = PR(
        id=str(uuid.uuid4()),
        gh_pr_number=42,
        title="feat: something",
        gh_head_sha="abc123def",
        opened_at=now(),
    )
    db_session.add(p)
    await db_session.commit()

    result = await db_session.execute(select(PR).where(PR.gh_pr_number == 42))
    fetched = result.scalar_one()
    assert fetched.state == "open"
    assert fetched.gh_base_branch == "main"


async def test_create_reputation(db_session):
    agent = Agent(id=str(uuid.uuid4()), name="rep-agent", role="worker", registered_at=now())
    db_session.add(agent)
    await db_session.flush()

    rep = Reputation(agent_id=agent.id, last_updated=now())
    db_session.add(rep)
    await db_session.commit()

    result = await db_session.execute(select(Reputation).where(Reputation.agent_id == agent.id))
    fetched = result.scalar_one()
    assert fetched.tasks_completed == 0
    assert fetched.prs_merged == 0


async def test_create_orchestrator_run(db_session):
    run = OrchestratorRun(
        id=str(uuid.uuid4()),
        started_at=now(),
        cycle_number=1,
    )
    db_session.add(run)
    await db_session.commit()

    result = await db_session.execute(select(OrchestratorRun).where(OrchestratorRun.cycle_number == 1))
    fetched = result.scalar_one()
    assert fetched.status == "running"


async def test_all_tables_created(db_engine):
    """Smoke test: verify all expected tables exist."""
    from sqlalchemy import inspect, text
    async with db_engine.connect() as conn:
        tables = await conn.run_sync(lambda sync_conn: inspect(sync_conn).get_table_names())
    expected = {"agents", "agent_tokens", "tasks", "events", "prs", "reputation", "orchestrator_runs"}
    assert expected.issubset(set(tables)), f"Missing tables: {expected - set(tables)}"
