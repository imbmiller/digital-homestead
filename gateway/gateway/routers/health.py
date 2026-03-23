from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from gateway.database import get_db
from gateway.models.agent import Agent
from gateway.models.task import Task
from gateway.models.pr import PR
from gateway.models.reputation import OrchestratorRun

router = APIRouter(tags=["health"])


class HealthResponse(BaseModel):
    status: str
    db: str
    cycle_count: int
    last_cycle: str | None
    open_tasks: int
    active_agents: int
    open_prs: int


@router.get("/health", response_model=HealthResponse)
async def health(db: AsyncSession = Depends(get_db)) -> HealthResponse:
    try:
        open_tasks = (await db.execute(
            select(func.count()).select_from(Task).where(Task.status.in_(["open", "claimed", "in_progress"]))
        )).scalar_one()

        active_agents = (await db.execute(
            select(func.count()).select_from(Agent).where(Agent.is_active == 1)
        )).scalar_one()

        open_prs = (await db.execute(
            select(func.count()).select_from(PR).where(PR.state == "open")
        )).scalar_one()

        run_result = await db.execute(
            select(OrchestratorRun).order_by(OrchestratorRun.started_at.desc()).limit(1)
        )
        last_run = run_result.scalar_one_or_none()
        cycle_count = (await db.execute(select(func.count()).select_from(OrchestratorRun))).scalar_one()

        db_status = "ok"
    except Exception:
        db_status = "error"
        open_tasks = open_prs = active_agents = cycle_count = 0
        last_run = None

    return HealthResponse(
        status="ok",
        db=db_status,
        cycle_count=cycle_count,
        last_cycle=last_run.started_at if last_run else None,
        open_tasks=open_tasks,
        active_agents=active_agents,
        open_prs=open_prs,
    )
