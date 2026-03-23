"""
Thin async wrapper around the GitHub REST API.
All GitHub access goes through this class — no agent or orchestrator talks to GitHub directly.
"""
import base64

import httpx

from gateway.settings import settings


class GitHubService:
    def __init__(self, token: str | None = None, repo: str | None = None) -> None:
        self._token = token or settings.github_token
        self._repo = repo or settings.github_repo
        self._client = httpx.AsyncClient(
            base_url="https://api.github.com",
            headers={
                "Authorization": f"Bearer {self._token}",
                "Accept": "application/vnd.github+json",
                "X-GitHub-Api-Version": "2022-11-28",
            },
            timeout=30.0,
        )

    async def close(self) -> None:
        await self._client.aclose()

    async def get_pr(self, pr_number: int) -> dict:
        resp = await self._client.get(f"/repos/{self._repo}/pulls/{pr_number}")
        resp.raise_for_status()
        return resp.json()

    async def get_pr_diff(self, pr_number: int) -> str:
        """Return the raw unified diff for a PR (truncated to 50KB)."""
        resp = await self._client.get(
            f"/repos/{self._repo}/pulls/{pr_number}",
            headers={"Accept": "application/vnd.github.diff"},
        )
        resp.raise_for_status()
        text = resp.text
        return text[:51200] if len(text) > 51200 else text

    async def post_review_comment(
        self,
        pr_number: int,
        body: str,
        event: str = "COMMENT",
    ) -> dict:
        """
        Post a review to a PR.
        event: APPROVE | REQUEST_CHANGES | COMMENT
        """
        resp = await self._client.post(
            f"/repos/{self._repo}/pulls/{pr_number}/reviews",
            json={"body": body, "event": event},
        )
        resp.raise_for_status()
        return resp.json()

    async def merge_pr(
        self,
        pr_number: int,
        method: str = "squash",
        commit_msg: str = "",
    ) -> dict:
        resp = await self._client.put(
            f"/repos/{self._repo}/pulls/{pr_number}/merge",
            json={"merge_method": method, "commit_message": commit_msg},
        )
        resp.raise_for_status()
        return resp.json()

    async def get_recent_commits(self, count: int = 50) -> list[dict]:
        resp = await self._client.get(
            f"/repos/{self._repo}/commits",
            params={"per_page": min(count, 100)},
        )
        resp.raise_for_status()
        commits = resp.json()
        return [
            {
                "sha": c["sha"][:7],
                "full_sha": c["sha"],
                "author": c["commit"]["author"]["name"],
                "message": c["commit"]["message"].split("\n")[0],
                "timestamp": c["commit"]["author"]["date"],
            }
            for c in commits
        ]

    async def get_file_content(self, path: str, ref: str = "main") -> str:
        """Read a file from the repo at a given ref. Returns decoded text content."""
        resp = await self._client.get(
            f"/repos/{self._repo}/contents/{path}",
            params={"ref": ref},
        )
        resp.raise_for_status()
        data = resp.json()
        content = base64.b64decode(data["content"]).decode("utf-8")
        return content

    async def check_pr_ci_status(self, head_sha: str) -> bool:
        """Returns True if all CI checks on the SHA have passed (or there are no checks)."""
        resp = await self._client.get(
            f"/repos/{self._repo}/commits/{head_sha}/check-runs",
        )
        resp.raise_for_status()
        runs = resp.json().get("check_runs", [])
        if not runs:
            return True  # No CI configured — allow merge
        return all(r["conclusion"] == "success" for r in runs if r["status"] == "completed")

    async def get_pr_mergeable(self, pr_number: int) -> bool:
        """Returns True if GitHub reports the PR as mergeable (no conflicts)."""
        data = await self.get_pr(pr_number)
        return data.get("mergeable", False) is True


# Module-level singleton
github = GitHubService()
