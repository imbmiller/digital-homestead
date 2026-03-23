"""
Async HTTP client wrapper for all gateway API calls.
The orchestrator is just a privileged API client — it never touches SQLite directly.
"""
from typing import Any

import httpx
import structlog

from orchestrator.settings import settings

log = structlog.get_logger(__name__)


class GatewayClient:
    def __init__(self, base_url: str | None = None, token: str | None = None) -> None:
        self._base_url = (base_url or settings.gateway_url).rstrip("/")
        self._token = token or settings.orchestrator_bearer_token
        self._client = httpx.AsyncClient(
            base_url=self._base_url,
            headers={"Authorization": f"Bearer {self._token}"},
            timeout=30.0,
        )

    async def close(self) -> None:
        await self._client.aclose()

    async def get_context(self) -> dict:
        resp = await self._client.get("/orchestrator/context")
        resp.raise_for_status()
        return resp.json()

    async def list_tasks(self, status: str | None = None) -> list[dict]:
        params = {"limit": 100}
        if status:
            params["status"] = status
        resp = await self._client.get("/tasks", params=params)
        resp.raise_for_status()
        return resp.json()

    async def create_task(self, title: str, description: str, priority: int, epic: str | None = None, parent_task_id: str | None = None) -> dict:
        body: dict[str, Any] = {"title": title, "description": description, "priority": priority}
        if epic:
            body["epic"] = epic
        if parent_task_id:
            body["parent_task_id"] = parent_task_id
        resp = await self._client.post("/tasks", json=body)
        resp.raise_for_status()
        return resp.json()

    async def update_task(self, task_id: str, **kwargs) -> dict:
        resp = await self._client.patch(f"/tasks/{task_id}", json=kwargs)
        resp.raise_for_status()
        return resp.json()

    async def list_prs(self, state: str | None = None) -> list[dict]:
        params: dict[str, Any] = {"limit": 50}
        if state:
            params["state"] = state
        resp = await self._client.get("/prs", params=params)
        resp.raise_for_status()
        return resp.json()

    async def review_pr(
        self,
        pr_number: int,
        manifesto_score: int,
        simplicity_score: int,
        security_score: int,
        quality_score: int,
        scope_score: int,
        summary: str,
        approved: bool,
    ) -> dict:
        resp = await self._client.post(f"/prs/{pr_number}/review", json={
            "manifesto_score": manifesto_score,
            "simplicity_score": simplicity_score,
            "security_score": security_score,
            "quality_score": quality_score,
            "scope_score": scope_score,
            "summary": summary,
            "approved": approved,
        })
        resp.raise_for_status()
        return resp.json()

    async def list_agents(self) -> list[dict]:
        resp = await self._client.get("/agents/register")  # Note: separate list endpoint added below
        # Use health endpoint for counts; we'll add /agents list endpoint separately
        # For context builder, we query the health snapshot
        resp = await self._client.get("/health")
        resp.raise_for_status()
        return resp.json()

    async def broadcast(self, message: str) -> None:
        resp = await self._client.post("/events/broadcast", json={"message": message})
        resp.raise_for_status()

    async def flag_agent(self, agent_id: str, reason: str) -> None:
        resp = await self._client.patch(f"/orchestrator/agents/{agent_id}/flag", json={"reason": reason})
        resp.raise_for_status()

    async def pause(self, reason: str) -> None:
        resp = await self._client.post("/orchestrator/pause", json={"reason": reason})
        resp.raise_for_status()

    async def record_run(self, run: dict) -> None:
        resp = await self._client.post("/orchestrator/runs", json=run)
        resp.raise_for_status()

    async def get_health(self) -> dict:
        resp = await self._client.get("/health")
        resp.raise_for_status()
        return resp.json()
