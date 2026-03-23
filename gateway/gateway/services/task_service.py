import uuid
from datetime import datetime, timezone

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from gateway.models.task import Task
from gateway.models.agent import Agent
from gateway.services.event_service import emit


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


OPEN_STATUSES = {"open", "claimed", "in_progress", "in_review"}


async def list_tasks(
    db: AsyncSession,
    status: str | None = None,
    epic: str | None = None,
    limit: int = 50,
    offset: int = 0,
) -> list[Task]:
    q = select(Task)
    if status:
        q = q.where(Task.status == status)
    if epic:
        q = q.where(Task.epic == epic)
    q = q.order_by(Task.priority.asc(), Task.created_at.asc()).limit(limit).offset(offset)
    result = await db.execute(q)
    return list(result.scalars().all())


async def get_task(db: AsyncSession, task_id: str) -> Task | None:
    result = await db.execute(select(Task).where(Task.id == task_id))
    return result.scalar_one_or_none()


async def create_task(
    db: AsyncSession,
    title: str,
    description: str,
    priority: int = 5,
    epic: str | None = None,
    parent_task_id: str | None = None,
    orchestrator_notes: str | None = None,
) -> Task:
    # Enforce max 20 open tasks
    open_count = (await db.execute(
        select(func.count()).select_from(Task).where(Task.status.in_(OPEN_STATUSES))
    )).scalar_one()
    if open_count >= 20:
        raise ValueError("Task board is full (20 open tasks). Orchestrator must complete or cancel tasks first.")

    task = Task(
        id=str(uuid.uuid4()),
        title=title,
        description=description,
        epic=epic,
        priority=priority,
        parent_task_id=parent_task_id,
        orchestrator_notes=orchestrator_notes,
        created_at=_now(),
        updated_at=_now(),
    )
    db.add(task)
    await db.flush()
    await emit(db, "task.created", {
        "task_id": task.id,
        "title": task.title,
        "epic": task.epic,
        "priority": task.priority,
    })
    return task


async def claim_task(db: AsyncSession, task_id: str, agent: Agent) -> Task:
    task = await get_task(db, task_id)
    if task is None:
        raise ValueError("Task not found")
    if task.status != "open":
        raise ValueError(f"Task is not claimable (status: {task.status})")

    task.status = "claimed"
    task.claimed_by = agent.id
    task.claimed_at = _now()
    task.updated_at = _now()
    await db.flush()
    await emit(db, "task.claimed", {"task_id": task.id, "agent_name": agent.name}, agent_id=agent.id)
    return task


async def unclaim_task(db: AsyncSession, task_id: str, agent: Agent) -> Task:
    task = await get_task(db, task_id)
    if task is None:
        raise ValueError("Task not found")
    if task.claimed_by != agent.id:
        raise ValueError("You do not own this task")
    if task.status not in ("claimed", "in_progress"):
        raise ValueError(f"Cannot unclaim task with status: {task.status}")

    task.status = "open"
    task.claimed_by = None
    task.claimed_at = None
    task.updated_at = _now()
    await db.commit()
    return task


async def update_task_progress(
    db: AsyncSession,
    task_id: str,
    agent: Agent,
    status: str | None = None,
    notes: str | None = None,
) -> Task:
    task = await get_task(db, task_id)
    if task is None:
        raise ValueError("Task not found")
    if task.claimed_by != agent.id:
        raise ValueError("You do not own this task")

    allowed_transitions = {"claimed": ["in_progress"], "in_progress": ["in_review"]}
    if status and task.status in allowed_transitions:
        if status not in allowed_transitions[task.status]:
            raise ValueError(f"Cannot transition from {task.status} to {status}")
        task.status = status

    if notes:
        task.orchestrator_notes = notes
    task.updated_at = _now()
    await db.commit()
    return task


async def update_task_orchestrator(db: AsyncSession, task_id: str, **kwargs) -> Task:
    """Orchestrator-only: full task update."""
    task = await get_task(db, task_id)
    if task is None:
        raise ValueError("Task not found")
    for key, value in kwargs.items():
        if hasattr(task, key) and value is not None:
            setattr(task, key, value)
    task.updated_at = _now()
    await db.commit()
    return task


async def cancel_task(db: AsyncSession, task_id: str) -> Task:
    task = await get_task(db, task_id)
    if task is None:
        raise ValueError("Task not found")
    task.status = "cancelled"
    task.updated_at = _now()
    await db.commit()
    return task
