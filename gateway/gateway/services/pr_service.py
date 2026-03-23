import json
import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from gateway.models.pr import PR
from gateway.models.task import Task
from gateway.models.reputation import Reputation
from gateway.services.event_service import emit


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


async def get_pr_by_number(db: AsyncSession, gh_pr_number: int) -> PR | None:
    result = await db.execute(select(PR).where(PR.gh_pr_number == gh_pr_number))
    return result.scalar_one_or_none()


async def list_prs(
    db: AsyncSession,
    state: str | None = None,
    limit: int = 50,
    offset: int = 0,
) -> list[PR]:
    q = select(PR)
    if state:
        q = q.where(PR.state == state)
    q = q.order_by(PR.opened_at.desc()).limit(limit).offset(offset)
    result = await db.execute(q)
    return list(result.scalars().all())


async def handle_pr_opened(
    db: AsyncSession,
    gh_pr_number: int,
    title: str,
    body: str | None,
    head_sha: str,
    base_branch: str,
    author_agent_id: str | None,
    task_id: str | None,
) -> PR:
    existing = await get_pr_by_number(db, gh_pr_number)
    if existing:
        return existing

    pr = PR(
        id=str(uuid.uuid4()),
        gh_pr_number=gh_pr_number,
        title=title,
        body=body,
        author_agent_id=author_agent_id,
        task_id=task_id,
        gh_head_sha=head_sha,
        gh_base_branch=base_branch,
        opened_at=_now(),
    )
    db.add(pr)
    await db.flush()

    # Update reputation
    if author_agent_id:
        await _inc_reputation(db, author_agent_id, prs_opened=1)

    await emit(db, "pr.opened", {
        "pr_number": gh_pr_number,
        "title": title,
        "agent_id": author_agent_id,
        "task_id": task_id,
    }, agent_id=author_agent_id)
    return pr


async def handle_pr_merged(db: AsyncSession, gh_pr_number: int, merge_commit: str) -> PR | None:
    pr = await get_pr_by_number(db, gh_pr_number)
    if not pr:
        return None
    pr.state = "merged"
    pr.merged_at = _now()
    pr.merge_commit = merge_commit

    # Mark task done
    if pr.task_id:
        task_result = await db.execute(select(Task).where(Task.id == pr.task_id))
        task = task_result.scalar_one_or_none()
        if task:
            task.status = "done"
            task.completed_at = _now()
            task.updated_at = _now()

    # Update reputation
    if pr.author_agent_id:
        score = pr.review_score or 0
        await _inc_reputation(db, pr.author_agent_id, prs_merged=1, review_score=score)

    await emit(db, "pr.merged", {
        "pr_number": gh_pr_number,
        "title": pr.title,
        "merge_commit": merge_commit,
        "review_score": pr.review_score,
    }, agent_id=pr.author_agent_id)
    await emit(db, "task.completed", {"task_id": pr.task_id, "pr_number": gh_pr_number})
    await db.commit()
    return pr


async def handle_pr_closed(db: AsyncSession, gh_pr_number: int) -> PR | None:
    pr = await get_pr_by_number(db, gh_pr_number)
    if not pr or pr.state == "merged":
        return pr
    pr.state = "closed"

    if pr.author_agent_id:
        await _inc_reputation(db, pr.author_agent_id, prs_rejected=1)

    await emit(db, "pr.closed", {"pr_number": gh_pr_number, "title": pr.title})
    await db.commit()
    return pr


async def handle_pr_synchronize(db: AsyncSession, gh_pr_number: int, head_sha: str) -> PR | None:
    pr = await get_pr_by_number(db, gh_pr_number)
    if not pr:
        return None
    pr.gh_head_sha = head_sha
    # Reset state to open if it had been reviewed but not merged (new commits invalidate review)
    if pr.state == "reviewed":
        pr.state = "open"
    await db.commit()
    return pr


async def review_pr(
    db: AsyncSession,
    gh_pr_number: int,
    manifesto_score: int,
    simplicity_score: int,
    security_score: int,
    quality_score: int,
    scope_score: int,
    summary: str,
    approved: bool,
) -> PR:
    pr = await get_pr_by_number(db, gh_pr_number)
    if not pr:
        raise ValueError(f"PR #{gh_pr_number} not found")

    composite = manifesto_score + simplicity_score + security_score + quality_score + scope_score
    notes = json.dumps({
        "manifesto": manifesto_score,
        "simplicity": simplicity_score,
        "security": security_score,
        "quality": quality_score,
        "scope": scope_score,
        "summary": summary,
    })

    pr.review_score = composite
    pr.review_notes = notes
    pr.reviewed_at = _now()
    pr.state = "approved" if approved else "reviewed"

    await emit(db, "pr.reviewed", {
        "pr_number": gh_pr_number,
        "score": composite,
        "approved": approved,
        "summary": summary[:200],
    })
    await db.commit()
    return pr


async def _inc_reputation(
    db: AsyncSession,
    agent_id: str,
    prs_opened: int = 0,
    prs_merged: int = 0,
    prs_rejected: int = 0,
    tasks_claimed: int = 0,
    tasks_completed: int = 0,
    review_score: int = 0,
) -> None:
    result = await db.execute(select(Reputation).where(Reputation.agent_id == agent_id))
    rep = result.scalar_one_or_none()
    if not rep:
        rep = Reputation(agent_id=agent_id, last_updated=_now())
        db.add(rep)
        await db.flush()

    rep.prs_opened += prs_opened
    rep.prs_merged += prs_merged
    rep.prs_rejected += prs_rejected
    rep.tasks_claimed += tasks_claimed
    rep.tasks_completed += tasks_completed

    # Update rolling average review score
    if review_score and rep.prs_merged > 0:
        prev_avg = rep.average_review_score or 0
        rep.average_review_score = (prev_avg * (rep.prs_merged - 1) + review_score) / rep.prs_merged

    rep.last_updated = _now()
