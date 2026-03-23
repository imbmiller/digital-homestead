import hashlib
import secrets
import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from gateway.models.agent import Agent, AgentToken


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def generate_token() -> str:
    """Generate a 32-byte hex bearer token."""
    return secrets.token_hex(32)


def hash_token(token: str) -> str:
    """SHA-256 hash a bearer token for storage."""
    return hashlib.sha256(token.encode()).hexdigest()


async def register_agent(
    db: AsyncSession,
    name: str,
    role: str,
    owner_url: str | None = None,
) -> tuple[Agent, str]:
    """
    Create a new agent and issue its first bearer token.
    Returns (agent, plaintext_token) — plaintext is shown once only.
    """
    agent = Agent(
        id=str(uuid.uuid4()),
        name=name,
        role=role,
        owner_url=owner_url,
        registered_at=_now(),
    )
    db.add(agent)
    await db.flush()

    # Issue token
    token = generate_token()
    token_record = AgentToken(
        id=str(uuid.uuid4()),
        agent_id=agent.id,
        token_hash=hash_token(token),
        created_at=_now(),
    )
    db.add(token_record)

    # Create initial reputation record
    from gateway.models.reputation import Reputation
    rep = Reputation(agent_id=agent.id, last_updated=_now())
    db.add(rep)

    await db.commit()
    await db.refresh(agent)
    return agent, token


async def get_agent_by_token(db: AsyncSession, token: str) -> Agent | None:
    """Look up an agent by bearer token. Returns None if invalid/expired/revoked."""
    token_hash = hash_token(token)
    result = await db.execute(
        select(AgentToken).where(
            AgentToken.token_hash == token_hash,
            AgentToken.revoked == 0,
        )
    )
    token_record = result.scalar_one_or_none()
    if token_record is None:
        return None

    # Check expiry
    if token_record.expires_at:
        if token_record.expires_at < _now():
            return None

    # Load agent
    agent_result = await db.execute(
        select(Agent).where(Agent.id == token_record.agent_id, Agent.is_active == 1)
    )
    return agent_result.scalar_one_or_none()


async def update_last_seen(db: AsyncSession, agent: Agent) -> None:
    agent.last_seen_at = _now()
    await db.commit()
