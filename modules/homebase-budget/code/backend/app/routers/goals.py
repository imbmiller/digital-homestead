from datetime import date as date_type
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from ..database import get_db
from ..models.project import Project
from ..models.transaction import Transaction
from ..models.user import User
from ..services.auth import get_current_user

router = APIRouter(prefix="/goals", tags=["goals"])


class GoalIn(BaseModel):
    name: str
    budget: float | None = None  # target amount
    color: str | None = None
    start_date: str | None = None
    end_date: str | None = None
    category_id: int | None = None  # linked category for auto-tracking


class GoalOut(BaseModel):
    id: int
    name: str
    budget: float | None
    color: str | None
    start_date: date_type | None
    end_date: date_type | None
    category_id: int | None = None  # stored in icon field as workaround
    is_active: bool

    model_config = {"from_attributes": True}


def _category_id_from(project: Project) -> int | None:
    try:
        return int(project.icon) if project.icon and project.icon.isdigit() else None
    except Exception:
        return None


def _to_out(p: Project) -> dict:
    return {
        "id": p.id,
        "name": p.name,
        "budget": p.budget,
        "color": p.color,
        "start_date": p.start_date,
        "end_date": p.end_date,
        "category_id": _category_id_from(p),
        "is_active": p.is_active,
    }


@router.get("/")
def list_goals(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    projects = db.query(Project).order_by(Project.sort_order.asc(), Project.id.asc()).all()
    return [_to_out(p) for p in projects]


@router.post("/")
def create_goal(body: GoalIn, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    project = Project(
        name=body.name,
        budget=body.budget,
        color=body.color,
        start_date=date_type.fromisoformat(body.start_date) if body.start_date else None,
        end_date=date_type.fromisoformat(body.end_date) if body.end_date else None,
        icon=str(body.category_id) if body.category_id else None,
        is_active=True,
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    return _to_out(project)


@router.patch("/{goal_id}")
def update_goal(goal_id: int, body: GoalIn, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    project = db.query(Project).filter(Project.id == goal_id).first()
    if not project:
        raise HTTPException(404, "Goal not found")
    project.name = body.name
    project.budget = body.budget
    project.color = body.color
    project.start_date = date_type.fromisoformat(body.start_date) if body.start_date else None
    project.end_date = date_type.fromisoformat(body.end_date) if body.end_date else None
    project.icon = str(body.category_id) if body.category_id else None
    db.commit()
    db.refresh(project)
    return _to_out(project)


@router.delete("/{goal_id}")
def delete_goal(goal_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    project = db.query(Project).filter(Project.id == goal_id).first()
    if not project:
        raise HTTPException(404, "Goal not found")
    db.delete(project)
    db.commit()
    return {"ok": True}


@router.get("/{goal_id}/progress")
def goal_progress(goal_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    project = db.query(Project).filter(Project.id == goal_id).first()
    if not project:
        raise HTTPException(404, "Goal not found")

    category_id = _category_id_from(project)
    contributed = 0.0
    if category_id:
        q = db.query(Transaction).filter(
            Transaction.category_id == category_id,
            Transaction.is_ignored == False,
        )
        if project.start_date:
            q = q.filter(Transaction.date >= project.start_date)
        contributed = sum(abs(t.amount) for t in q.all() if t.amount < 0)

    target = project.budget or 0
    remaining = max(0, target - contributed)
    pct = (contributed / target * 100) if target > 0 else 0

    # Rough completion estimate
    projected_date = None
    if project.start_date and contributed > 0 and remaining > 0:
        today = date_type.today()
        days_elapsed = (today - project.start_date).days or 1
        daily_rate = contributed / days_elapsed
        if daily_rate > 0:
            days_to_complete = remaining / daily_rate
            from datetime import timedelta
            projected_date = str(today + timedelta(days=int(days_to_complete)))

    return {
        "contributed": round(contributed, 2),
        "target": round(target, 2),
        "remaining": round(remaining, 2),
        "percent": round(pct, 1),
        "projected_completion_date": projected_date,
        "on_track": project.end_date is None or (projected_date is None) or projected_date <= str(project.end_date),
    }
