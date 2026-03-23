"""
In-process asyncio fan-out SSE broker.
Events are broadcast to all currently-connected SSE clients.
"""
import asyncio
from typing import AsyncGenerator


class SSEBroker:
    def __init__(self) -> None:
        self._queues: set[asyncio.Queue] = set()

    async def publish(self, event: dict) -> None:
        """Push an event dict to all connected clients."""
        dead: set[asyncio.Queue] = set()
        for q in self._queues:
            try:
                q.put_nowait(event)
            except asyncio.QueueFull:
                dead.add(q)
        self._queues -= dead

    async def subscribe(self) -> AsyncGenerator[dict, None]:
        """Async generator that yields events as they arrive."""
        q: asyncio.Queue = asyncio.Queue(maxsize=256)
        self._queues.add(q)
        try:
            while True:
                event = await q.get()
                yield event
        finally:
            self._queues.discard(q)


# Module-level singleton used by the whole gateway process
broker = SSEBroker()
