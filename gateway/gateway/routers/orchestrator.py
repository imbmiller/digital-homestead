"""
Orchestrator-only endpoints for internal coordination.
These are not part of the public agent API.
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from gateway.database import get_db
from gateway.middleware.auth import require_orchestrator
from gateway.models.agent import Agent
from gateway.models.task import Task
from gateway.models.pr import PR
from gateway.models.reputation import OrchestratorRun, Reputation

router = APIRouter(prefix="/orchestrator", tags=["orchestrator"])

# Module-level pause flag (reset on gateway restart)
_paused: bool = False
_pause_reason: str = ""


class ContextSnapshot(BaseModel):
    paused: bool
    pause_reason: str
    open_tasks: int
    open_prs: int
    active_agents: int
    last_cycle_number: int


class RunBody(BaseModel):
    id: str
    started_at: str
    completed_at: str | None = None
    status: str
    cycle_number: int
    context_tokens: int | None = None
    output_tokens: int | None = None
    actions_taken: str | None = None
    error: str | None = None


class PauseBody(BaseModel):
    reason: str


class AgentFlagBody(BaseModel):
    reason: str


@router.get("/context", response_model=ContextSnapshot)
async def get_context(
    agent: Agent = Depends(require_orchestrator),
    db: AsyncSession = Depends(get_db),
) -> ContextSnapshot:
    open_tasks = (await db.execute(
        select(func.count()).select_from(Task).where(Task.status.in_(["open", "claimed", "in_progress"]))
    )).scalar_one()
    open_prs = (await db.execute(
        select(func.count()).select_from(PR).where(PR.state.in_(["open", "reviewed"]))
    )).scalar_one()
    active_agents = (await db.execute(
        select(func.count()).select_from(Agent).where(Agent.is_active == 1)
    )).scalar_one()
    last_run = (await db.execute(
        select(OrchestratorRun).order_by(OrchestratorRun.cycle_number.desc()).limit(1)
    )).scalar_one_or_none()

    return ContextSnapshot(
        paused=_paused,
        pause_reason=_pause_reason,
        open_tasks=open_tasks,
        open_prs=open_prs,
        active_agents=active_agents,
        last_cycle_number=last_run.cycle_number if last_run else 0,
    )


@router.post("/runs", status_code=201)
async def create_run(
    body: RunBody,
    agent: Agent = Depends(require_orchestrator),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Orchestrator records its cycle run here."""
    run = OrchestratorRun(
        id=body.id,
        started_at=body.started_at,
        completed_at=body.completed_at,
        status=body.status,
        cycle_number=body.cycle_number,
        context_tokens=body.context_tokens,
        output_tokens=body.output_tokens,
        actions_taken=body.actions_taken,
        error=body.error,
    )
    db.add(run)
    await db.commit()
    return {"id": run.id}


@router.post("/pause", status_code=204)
async def pause(
    body: PauseBody,
    agent: Agent = Depends(require_orchestrator),
    db: AsyncSession = Depends(get_db),
) -> None:
    global _paused, _pause_reason
    _paused = True
    _pause_reason = body.reason
    from gateway.services.event_service import emit
    await emit(db, "orchestrator.broadcast", {"message": f"PAUSED: {body.reason}"}, agent_id=agent.id)


@router.post("/resume", status_code=204)
async def resume(agent: Agent = Depends(require_orchestrator)) -> None:
    global _paused, _pause_reason
    _paused = False
    _pause_reason = ""


@router.patch("/agents/{agent_id}/flag", status_code=204)
async def flag_agent(
    agent_id: str,
    body: AgentFlagBody,
    agent: Agent = Depends(require_orchestrator),
    db: AsyncSession = Depends(get_db),
) -> None:
    result = await db.execute(select(Agent).where(Agent.id == agent_id))
    target = result.scalar_one_or_none()
    if not target:
        raise HTTPException(status_code=404, detail="Agent not found")
    target.is_flagged = 1
    target.flag_reason = body.reason
    await db.commit()
