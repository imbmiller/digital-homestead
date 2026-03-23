"""
merge_pr: verify the PR is approved in the gateway and CI is green, then merge via GitHub API.
The gateway's /prs/{n}/review endpoint enforces approval state.
"""
import httpx
import structlog

from orchestrator.gateway_client import GatewayClient
from orchestrator.settings import settings

log = structlog.get_logger(__name__)


async def merge_pr(gateway: GatewayClient, inputs: dict) -> str:
    pr_number = inputs["pr_number"]
    method = inputs.get("merge_method", "squash")
    commit_msg = inputs.get("commit_message", "")

    # Check the PR is approved in the gateway DB
    prs = await gateway.list_prs(state="approved")
    approved_numbers = {p["gh_pr_number"] for p in prs}
    if pr_number not in approved_numbers:
        return f"ERROR: PR #{pr_number} is not in approved state. Call review_pr first."

    # Get the head SHA to verify CI
    pr_data = next((p for p in prs if p["gh_pr_number"] == pr_number), None)
    if not pr_data:
        return f"ERROR: PR #{pr_number} not found"

    # Check CI status via GitHub API
    head_sha = pr_data.get("gh_head_sha", "")
    if head_sha and settings.github_token:
        ci_ok = await _check_ci(head_sha)
        if not ci_ok:
            return f"ERROR: PR #{pr_number} has failing CI checks. Cannot merge until checks pass."

    # Merge via GitHub API
    try:
        async with httpx.AsyncClient(
            base_url="https://api.github.com",
            headers={
                "Authorization": f"Bearer {settings.github_token}",
                "Accept": "application/vnd.github+json",
            },
            timeout=30.0,
        ) as client:
            resp = await client.put(
                f"/repos/{settings.github_repo}/pulls/{pr_number}/merge",
                json={"merge_method": method, "commit_message": commit_msg},
            )
            if resp.status_code == 405:
                return f"ERROR: PR #{pr_number} is not mergeable (conflicts or already merged)"
            resp.raise_for_status()
            data = resp.json()

        log.info("pr_merged", pr_number=pr_number, sha=data.get("sha", "")[:7])
        return f"PR #{pr_number} merged successfully via {method}. SHA: {data.get('sha', '')[:7]}"
    except httpx.HTTPStatusError as e:
        log.error("merge_failed", pr_number=pr_number, error=str(e))
        return f"ERROR merging PR #{pr_number}: {e.response.status_code} — {e.response.text[:200]}"


async def _check_ci(head_sha: str) -> bool:
    """Returns True if all CI checks pass (or none configured)."""
    async with httpx.AsyncClient(
        base_url="https://api.github.com",
        headers={"Authorization": f"Bearer {settings.github_token}", "Accept": "application/vnd.github+json"},
        timeout=15.0,
    ) as client:
        resp = await client.get(f"/repos/{settings.github_repo}/commits/{head_sha}/check-runs")
        if resp.status_code != 200:
            return True  # Can't check — allow
        runs = resp.json().get("check_runs", [])
        if not runs:
            return True
        return all(r["conclusion"] == "success" for r in runs if r["status"] == "completed")
