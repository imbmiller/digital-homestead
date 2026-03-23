from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from gateway.database import get_db
from gateway.middleware.auth import get_current_agent, require_orchestrator, require_worker
from gateway.middleware.rate_limit import check_rate_limit
from gateway.models.agent import Agent
from gateway.services import task_service

router = APIRouter(prefix="/tasks", tags=["tasks"])


class TaskOut(BaseModel):
    id: str
    title: str
    description: str
    epic: str | None
    status: str
    priority: int
    created_at: str
    updated_at: str
    claimed_by: str | None
    claimed_at: str | None
    completed_at: str | None
    pr_number: int | None
    parent_task_id: str | None
    orchestrator_notes: str | None

    model_config = {"from_attributes": True}


class CreateTaskBody(BaseModel):
    title: str
    description: str
    priority: int = 5
    epic: str | None = None
    parent_task_id: str | None = None


class UpdateTaskBody(BaseModel):
    title: str | None = None
    description: str | None = None
    priority: int | None = None
    epic: str | None = None
    status: str | None = None
    orchestrator_notes: str | None = None


class ProgressBody(BaseModel):
    status: str | None = None
    notes: str | None = None


@router.get("", response_model=list[TaskOut])
async def list_tasks(
    status: str | None = Query(None),
    epic: str | None = Query(None),
    limit: int = Query(50, le=200),
    offset: int = Query(0, ge=0),
    agent: Agent = Depends(get_current_agent),
    db: AsyncSession = Depends(get_db),
) -> list[TaskOut]:
    check_rate_limit(agent.id)
    tasks = await task_service.list_tasks(db, status=status, epic=epic, limit=limit, offset=offset)
    return [TaskOut.model_validate(t) for t in tasks]


@router.get("/{task_id}", response_model=TaskOut)
async def get_task(
    task_id: str,
    agent: Agent = Depends(get_current_agent),
    db: AsyncSession = Depends(get_db),
) -> TaskOut:
    check_rate_limit(agent.id)
    task = await task_service.get_task(db, task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    return TaskOut.model_validate(task)


@router.post("", response_model=TaskOut, status_code=201)
async def create_task(
    body: CreateTaskBody,
    agent: Agent = Depends(require_orchestrator),
    db: AsyncSession = Depends(get_db),
) -> TaskOut:
    try:
        task = await task_service.create_task(
            db, body.title, body.description, body.priority, body.epic, body.parent_task_id
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return TaskOut.model_validate(task)


@router.post("/{task_id}/claim", response_model=TaskOut)
async def claim_task(
    task_id: str,
    agent: Agent = Depends(require_worker),
    db: AsyncSession = Depends(get_db),
) -> TaskOut:
    check_rate_limit(agent.id)
    try:
        task = await task_service.claim_task(db, task_id, agent)
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))
    return TaskOut.model_validate(task)


@router.post("/{task_id}/unclaim", response_model=TaskOut)
async def unclaim_task(
    task_id: str,
    agent: Agent = Depends(require_worker),
    db: AsyncSession = Depends(get_db),
) -> TaskOut:
    check_rate_limit(agent.id)
    try:
        task = await task_service.unclaim_task(db, task_id, agent)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return TaskOut.model_validate(task)


@router.patch("/{task_id}/progress", response_model=TaskOut)
async def update_progress(
    task_id: str,
    body: ProgressBody,
    agent: Agent = Depends(require_worker),
    db: AsyncSession = Depends(get_db),
) -> TaskOut:
    check_rate_limit(agent.id)
    try:
        task = await task_service.update_task_progress(db, task_id, agent, body.status, body.notes)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return TaskOut.model_validate(task)


@router.patch("/{task_id}", response_model=TaskOut)
async def update_task(
    task_id: str,
    body: UpdateTaskBody,
    agent: Agent = Depends(require_orchestrator),
    db: AsyncSession = Depends(get_db),
) -> TaskOut:
    try:
        task = await task_service.update_task_orchestrator(db, task_id, **body.model_dump(exclude_none=True))
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    return TaskOut.model_validate(task)


@router.delete("/{task_id}", status_code=204)
async def delete_task(
    task_id: str,
    agent: Agent = Depends(require_orchestrator),
    db: AsyncSession = Depends(get_db),
) -> None:
    try:
        await task_service.cancel_task(db, task_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
