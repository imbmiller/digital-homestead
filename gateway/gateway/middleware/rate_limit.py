"""
Per-agent sliding-window rate limiter (in-memory).
Tracks the last N request timestamps per agent_id.
"""
import time
from collections import deque
from threading import Lock

from fastapi import HTTPException

from gateway.settings import settings

_windows: dict[str, deque] = {}
_lock = Lock()


def check_rate_limit(agent_id: str) -> None:
    """Raise 429 if agent has exceeded rate_limit_per_minute requests in the last 60 seconds."""
    limit = settings.rate_limit_per_minute
    now = time.monotonic()
    cutoff = now - 60.0

    with _lock:
        if agent_id not in _windows:
            _windows[agent_id] = deque()
        window = _windows[agent_id]

        # Drop timestamps older than the window
        while window and window[0] < cutoff:
            window.popleft()

        if len(window) >= limit:
            raise HTTPException(
                status_code=429,
                detail=f"Rate limit exceeded: {limit} requests/minute",
                headers={"Retry-After": "60"},
            )

        window.append(now)
