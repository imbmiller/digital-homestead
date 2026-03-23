import asyncio
import json
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from gateway.database import get_db
from gateway.middleware.auth import get_current_agent
from gateway.models.agent import Agent
from gateway.models.event import Event
from gateway.settings import settings
from gateway.sse.broker import broker

router = APIRouter(prefix="/events", tags=["events"])


@router.get("")
async def event_stream(
    since: str | None = Query(None, description="ISO8601 timestamp — replay events after this time"),
    agent: Agent = Depends(get_current_agent),
    db: AsyncSession = Depends(get_db),
) -> StreamingResponse:
    """SSE stream of all gateway events. Optionally replay history with ?since=."""

    async def generate():
        # 1. Replay historical events if requested
        if since:
            result = await db.execute(
                select(Event)
                .where(Event.created_at > since)
                .order_by(Event.created_at.asc())
                .limit(500)
            )
            for event in result.scalars().all():
                payload = {"id": event.id, "type": event.type, "payload": json.loads(event.payload), "ts": event.created_at}
                yield f"data: {json.dumps(payload)}\n\n"

        # 2. Subscribe to live events
        keepalive_interval = settings.sse_keepalive_interval
        last_heartbeat = asyncio.get_event_loop().time()

        async for event in broker.subscribe():
            yield f"data: {json.dumps(event)}\n\n"

            # Send keepalive if quiet
            now = asyncio.get_event_loop().time()
            if now - last_heartbeat > keepalive_interval:
                ts = datetime.now(timezone.utc).isoformat()
                yield f"data: {json.dumps({'type': 'heartbeat', 'ts': ts})}\n\n"
                last_heartbeat = now

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )


@router.post("/broadcast", status_code=204)
async def broadcast(
    body: dict,
    agent: Agent = Depends(get_current_agent),
    db: AsyncSession = Depends(get_db),
) -> None:
    """Emit an orchestrator.broadcast event (orchestrator-only in production; role check in orchestrator router)."""
    from gateway.services.event_service import emit
    message = body.get("message", "")
    await emit(db, "orchestrator.broadcast", {"message": message}, agent_id=agent.id)
