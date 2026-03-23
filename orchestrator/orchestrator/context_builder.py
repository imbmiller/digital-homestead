"""
Assembles the 6-section per-cycle user message for the orchestrator.
Section 1 (Manifesto) is marked for prompt caching — it never changes.
"""
import base64
from datetime import datetime, timezone

import httpx
import structlog

from orchestrator.gateway_client import GatewayClient
from orchestrator.settings import settings

log = structlog.get_logger(__name__)


async def _fetch_github_file(path: str) -> str:
    """Read a file from the GitHub repo via REST API."""
    if not settings.github_token or not settings.github_repo:
        return f"[GitHub not configured — cannot read {path}]"
    async with httpx.AsyncClient(
        base_url="https://api.github.com",
        headers={
            "Authorization": f"Bearer {settings.github_token}",
            "Accept": "application/vnd.github+json",
        },
        timeout=15.0,
    ) as client:
        resp = await client.get(f"/repos/{settings.github_repo}/contents/{path}", params={"ref": "main"})
        if resp.status_code == 404:
            return f"[File not found: {path}]"
        resp.raise_for_status()
        data = resp.json()
        return base64.b64decode(data["content"]).decode("utf-8")


async def _fetch_recent_commits() -> str:
    if not settings.github_token or not settings.github_repo:
        return "[GitHub not configured]"
    async with httpx.AsyncClient(
        base_url="https://api.github.com",
        headers={"Authorization": f"Bearer {settings.github_token}", "Accept": "application/vnd.github+json"},
        timeout=15.0,
    ) as client:
        resp = await client.get(
            f"/repos/{settings.github_repo}/commits",
            params={"per_page": 50},
        )
        if resp.status_code != 200:
            return "[Could not fetch commits]"
        commits = resp.json()
        lines = []
        for c in commits:
            sha = c["sha"][:7]
            author = c["commit"]["author"]["name"]
            msg = c["commit"]["message"].split("\n")[0][:80]
            ts = c["commit"]["author"]["date"]
            lines.append(f"{sha}  {ts}  {author}: {msg}")
        return "\n".join(lines) if lines else "[No commits]"


def _estimate_cost(input_tokens: int, output_tokens: int) -> float:
    return (
        input_tokens / 1_000_000 * settings.haiku_input_price_per_1m
        + output_tokens / 1_000_000 * settings.haiku_output_price_per_1m
    )


async def build_context(gateway: GatewayClient, cycle_number: int) -> list[dict]:
    """
    Returns a list of Anthropic message content blocks making up the user turn.
    Section 1 uses cache_control for prompt caching.
    """
    log.info("building_context", cycle=cycle_number)

    # Fetch all sections in parallel
    import asyncio
    manifesto_task = asyncio.create_task(_fetch_github_file("MANIFESTO.md"))
    roadmap_task = asyncio.create_task(_fetch_github_file("ROADMAP.md"))
    commits_task = asyncio.create_task(_fetch_recent_commits())
    open_tasks_task = asyncio.create_task(gateway.list_tasks(status="open"))
    open_prs_task = asyncio.create_task(gateway.list_prs(state="open"))
    health_task = asyncio.create_task(gateway.get_health())

    manifesto, roadmap, commits, open_tasks, open_prs, health = await asyncio.gather(
        manifesto_task, roadmap_task, commits_task,
        open_tasks_task, open_prs_task, health_task,
        return_exceptions=True,
    )

    # Build section text
    tasks_text = _format_tasks(open_tasks if not isinstance(open_tasks, Exception) else [])
    prs_text = _format_prs(open_prs if not isinstance(open_prs, Exception) else [])
    health_data = health if not isinstance(health, dict) else health
    budget_text = _format_budget(cycle_number, health_data if isinstance(health_data, dict) else {})

    if isinstance(manifesto, Exception):
        manifesto = "[Could not load MANIFESTO.md]"
    if isinstance(roadmap, Exception):
        roadmap = "[Could not load ROADMAP.md]"
    if isinstance(commits, Exception):
        commits = "[Could not fetch commits]"

    # Return as content blocks (Section 1 gets prompt caching)
    return [
        {
            "type": "text",
            "text": f"=== SECTION 1: MANIFESTO ===\n\n{manifesto}\n",
            "cache_control": {"type": "ephemeral"},
        },
        {
            "type": "text",
            "text": (
                f"=== SECTION 2: CURRENT ROADMAP ===\n\n{roadmap}\n\n"
                f"Open tasks: {len(open_tasks if not isinstance(open_tasks, Exception) else [])}\n\n"
                f"Task board:\n{tasks_text}\n"
            ),
        },
        {
            "type": "text",
            "text": f"=== SECTION 3: OPEN PRS AWAITING REVIEW ===\n\n{prs_text}\n",
        },
        {
            "type": "text",
            "text": f"=== SECTION 4: RECENT GIT LOG (last 50 commits) ===\n\n{commits}\n",
        },
        {
            "type": "text",
            "text": f"=== SECTION 5: AGENT REGISTRY ===\n\n{_format_agents(health_data if isinstance(health_data, dict) else {})}\n",
        },
        {
            "type": "text",
            "text": f"=== SECTION 6: BUDGET STATUS ===\n\n{budget_text}\n",
        },
    ]


def _format_tasks(tasks: list[dict]) -> str:
    if not tasks:
        return "  (no open tasks)"
    lines = []
    for t in tasks[:20]:
        lines.append(
            f"  [{t.get('priority', 5)}] {t['id'][:8]}  {t['title']}  "
            f"[{t.get('epic', 'none')}]  status={t.get('status', 'open')}"
        )
    return "\n".join(lines)


def _format_prs(prs: list[dict]) -> str:
    if not prs:
        return "  (no open PRs)"
    lines = []
    for p in prs[:20]:
        lines.append(
            f"  PR #{p['gh_pr_number']}  \"{p['title']}\"  "
            f"state={p['state']}  score={p.get('review_score', 'not reviewed')}"
        )
    return "\n".join(lines)


def _format_agents(health: dict) -> str:
    return (
        f"  Active agents: {health.get('active_agents', 'unknown')}\n"
        f"  (Full agent registry with reputation scores: see /agents endpoint)\n"
    )


def _format_budget(cycle_number: int, health: dict) -> str:
    return (
        f"  Cycle number: {cycle_number}\n"
        f"  Last cycle: {health.get('last_cycle', 'never')}\n"
        f"  Daily budget limit: ${settings.budget_daily_limit_usd:.2f}\n"
        f"  Haiku pricing: ${settings.haiku_input_price_per_1m}/1M input, "
        f"${settings.haiku_output_price_per_1m}/1M output\n"
        f"  NOTE: If you detect spend is approaching the daily limit, call the pause tool.\n"
    )
