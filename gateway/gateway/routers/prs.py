import hashlib
import hmac
import json

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from gateway.database import get_db
from gateway.middleware.auth import get_current_agent, require_orchestrator
from gateway.models.agent import Agent
from gateway.models.pr import PR
from gateway.services import pr_service
from gateway.settings import settings

router = APIRouter(prefix="/prs", tags=["prs"])


class PROut(BaseModel):
    id: str
    gh_pr_number: int
    title: str
    body: str | None
    author_agent_id: str | None
    task_id: str | None
    state: str
    opened_at: str
    reviewed_at: str | None
    merged_at: str | None
    review_score: int | None
    review_notes: str | None
    gh_head_sha: str
    gh_base_branch: str
    merge_commit: str | None

    model_config = {"from_attributes": True}


class ReviewBody(BaseModel):
    manifesto_score: int
    simplicity_score: int
    security_score: int
    quality_score: int
    scope_score: int
    summary: str
    approved: bool


@router.get("", response_model=list[PROut])
async def list_prs(
    state: str | None = Query(None),
    limit: int = Query(50, le=200),
    offset: int = Query(0, ge=0),
    agent: Agent = Depends(get_current_agent),
    db: AsyncSession = Depends(get_db),
) -> list[PROut]:
    prs = await pr_service.list_prs(db, state=state, limit=limit, offset=offset)
    return [PROut.model_validate(p) for p in prs]


@router.get("/{pr_id}", response_model=PROut)
async def get_pr(
    pr_id: str,
    agent: Agent = Depends(get_current_agent),
    db: AsyncSession = Depends(get_db),
) -> PROut:
    from sqlalchemy import select
    from gateway.models.pr import PR as PRModel
    result = await db.execute(select(PRModel).where(PRModel.id == pr_id))
    pr = result.scalar_one_or_none()
    if not pr:
        raise HTTPException(status_code=404, detail="PR not found")
    return PROut.model_validate(pr)


@router.post("/{pr_number}/review", response_model=PROut)
async def review_pr(
    pr_number: int,
    body: ReviewBody,
    agent: Agent = Depends(require_orchestrator),
    db: AsyncSession = Depends(get_db),
) -> PROut:
    try:
        pr = await pr_service.review_pr(
            db, pr_number,
            body.manifesto_score, body.simplicity_score, body.security_score,
            body.quality_score, body.scope_score, body.summary, body.approved,
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    return PROut.model_validate(pr)


def _verify_webhook_signature(payload: bytes, signature: str, secret: str) -> bool:
    """Verify GitHub webhook HMAC-SHA256 signature."""
    expected = "sha256=" + hmac.new(secret.encode(), payload, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature)


@router.post("/webhook", status_code=204)
async def github_webhook(
    request: Request,
    x_hub_signature_256: str = Header(...),
    x_github_event: str = Header(...),
    db: AsyncSession = Depends(get_db),
) -> None:
    """Receive and process GitHub webhook events."""
    body = await request.body()

    if not _verify_webhook_signature(body, x_hub_signature_256, settings.github_webhook_secret):
        raise HTTPException(status_code=401, detail="Invalid webhook signature")

    payload = json.loads(body)

    if x_github_event == "push":
        commits = payload.get("commits", [])
        ref = payload.get("ref", "")
        if ref == "refs/heads/main":
            for commit in commits:
                from gateway.services.event_service import emit
                await emit(db, "commit.pushed", {
                    "sha": commit["id"][:7],
                    "message": commit["message"].split("\n")[0],
                    "author": commit["author"]["name"],
                    "url": commit.get("url", ""),
                })

    elif x_github_event == "pull_request":
        action = payload.get("action")
        pr_data = payload.get("pull_request", {})
        pr_number = pr_data.get("number")
        title = pr_data.get("title", "")
        body_text = pr_data.get("body", "")
        head_sha = pr_data.get("head", {}).get("sha", "")
        base_branch = pr_data.get("base", {}).get("ref", "main")
        merged = pr_data.get("merged", False)

        if action == "opened" or action == "reopened":
            # Try to match to an agent by looking up login in agent registry
            # (Future: agents can associate their GitHub login at registration)
            await pr_service.handle_pr_opened(
                db, pr_number, title, body_text, head_sha, base_branch,
                author_agent_id=None, task_id=None,
            )
        elif action == "closed":
            if merged:
                merge_commit = pr_data.get("merge_commit_sha", "")
                await pr_service.handle_pr_merged(db, pr_number, merge_commit)
            else:
                await pr_service.handle_pr_closed(db, pr_number)
        elif action == "synchronize":
            await pr_service.handle_pr_synchronize(db, pr_number, head_sha)
