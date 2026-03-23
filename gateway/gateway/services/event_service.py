import json
import uuid
from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from gateway.models.event import Event
from gateway.sse.broker import broker


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


VALID_EVENT_TYPES = {
    "commit.pushed",
    "pr.opened", "pr.reviewed", "pr.merged", "pr.closed",
    "task.created", "task.claimed", "task.completed",
    "agent.connected", "agent.disconnected",
    "orchestrator.broadcast", "roadmap.updated",
    "heartbeat",
}


async def emit(
    db: AsyncSession,
    event_type: str,
    payload: dict,
    agent_id: str | None = None,
) -> Event:
    """Persist an event to the DB and broadcast it to all SSE subscribers."""
    event = Event(
        id=str(uuid.uuid4()),
        type=event_type,
        payload=json.dumps(payload),
        agent_id=agent_id,
        created_at=_now(),
    )
    db.add(event)
    await db.commit()

    # Broadcast to live SSE clients
    await broker.publish({"id": event.id, "type": event_type, "payload": payload, "ts": event.created_at})
    return event
