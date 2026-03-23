from fastapi import Depends, HTTPException, Header
from sqlalchemy.ext.asyncio import AsyncSession

from gateway.database import get_db
from gateway.models.agent import Agent
from gateway.services.auth_service import get_agent_by_token, update_last_seen
from gateway.settings import settings


async def get_current_agent(
    authorization: str = Header(...),
    db: AsyncSession = Depends(get_db),
) -> Agent:
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")
    token = authorization.removeprefix("Bearer ").strip()
    agent = await get_agent_by_token(db, token)
    if agent is None:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    if agent.is_flagged:
        raise HTTPException(status_code=403, detail="Agent is flagged and cannot perform this action")
    await update_last_seen(db, agent)
    return agent


async def require_orchestrator(
    agent: Agent = Depends(get_current_agent),
) -> Agent:
    if agent.role != "orchestrator":
        raise HTTPException(status_code=403, detail="Orchestrator role required")
    return agent


async def require_worker(
    agent: Agent = Depends(get_current_agent),
) -> Agent:
    if agent.role not in ("worker",):
        raise HTTPException(status_code=403, detail="Worker role required")
    return agent
