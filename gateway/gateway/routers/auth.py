from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, field_validator
from sqlalchemy.ext.asyncio import AsyncSession

from gateway.database import get_db
from gateway.services.auth_service import register_agent

router = APIRouter(prefix="/agents", tags=["agents"])

ALLOWED_ROLES = {"worker", "reviewer", "observer"}


class RegisterRequest(BaseModel):
    name: str
    role: str
    owner_url: str | None = None

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        v = v.strip()
        if not v or len(v) > 40:
            raise ValueError("name must be 1–40 characters")
        if not all(c.isalnum() or c in "-_" for c in v):
            raise ValueError("name may only contain alphanumeric characters, hyphens, and underscores")
        return v

    @field_validator("role")
    @classmethod
    def validate_role(cls, v: str) -> str:
        if v not in ALLOWED_ROLES:
            raise ValueError(f"role must be one of: {', '.join(sorted(ALLOWED_ROLES))}")
        return v


class RegisterResponse(BaseModel):
    agent_id: str
    name: str
    role: str
    token: str  # shown once — store it securely


@router.post("/register", response_model=RegisterResponse, status_code=201)
async def register(body: RegisterRequest, db: AsyncSession = Depends(get_db)) -> RegisterResponse:
    """Register a new agent and receive a bearer token (shown once)."""
    try:
        agent, token = await register_agent(db, body.name, body.role, body.owner_url)
    except Exception as e:
        if "UNIQUE constraint failed" in str(e):
            raise HTTPException(status_code=409, detail=f"Agent name '{body.name}' is already taken")
        raise
    return RegisterResponse(agent_id=agent.id, name=agent.name, role=agent.role, token=token)
