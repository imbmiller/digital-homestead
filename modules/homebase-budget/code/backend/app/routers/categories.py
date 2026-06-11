from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models.category import Category
from ..models.user import User
from ..schemas.category import CategoryCreate, CategoryUpdate, CategoryOut
from ..services.auth import get_current_user

router = APIRouter(prefix="/categories", tags=["categories"])


@router.get("/", response_model=list[CategoryOut])
def list_categories(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    return db.query(Category).order_by(Category.sort_order, Category.id).all()


@router.post("/", response_model=CategoryOut)
def create_category(body: CategoryCreate, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    cat = Category(**body.model_dump())
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return cat


@router.get("/{category_id}", response_model=CategoryOut)
def get_category(category_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    cat = db.query(Category).filter(Category.id == category_id).first()
    if not cat:
        raise HTTPException(404, "Category not found")
    return cat


@router.patch("/{category_id}", response_model=CategoryOut)
def update_category(category_id: int, body: CategoryUpdate, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    cat = db.query(Category).filter(Category.id == category_id).first()
    if not cat:
        raise HTTPException(404, "Category not found")
    if cat.is_system:
        raise HTTPException(403, "Cannot modify system category")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(cat, k, v)
    db.commit()
    db.refresh(cat)
    return cat


@router.delete("/{category_id}")
def delete_category(category_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    cat = db.query(Category).filter(Category.id == category_id).first()
    if not cat:
        raise HTTPException(404, "Category not found")
    if cat.is_system:
        raise HTTPException(403, "Cannot delete system category")
    db.delete(cat)
    db.commit()
    return {"ok": True}


@router.patch("/reorder", response_model=list[CategoryOut])
def reorder_categories(
    order: list[dict],
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    for item in order:
        cat = db.query(Category).filter(Category.id == item["id"]).first()
        if cat:
            cat.sort_order = item["sort_order"]
    db.commit()
    return db.query(Category).order_by(Category.sort_order, Category.id).all()
