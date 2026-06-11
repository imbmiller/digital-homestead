from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from ..database import get_db
from ..models.asset import Asset
from ..models.user import User
from ..services.auth import get_current_user

router = APIRouter(prefix="/assets", tags=["assets"])


class AssetIn(BaseModel):
    name: str
    value: float = 0
    asset_type: str = "other"


class AssetOut(AssetIn):
    id: int

    model_config = {"from_attributes": True}


@router.get("/", response_model=list[AssetOut])
def list_assets(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    return db.query(Asset).order_by(Asset.id.asc()).all()


@router.post("/", response_model=AssetOut)
def create_asset(body: AssetIn, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    asset = Asset(**body.model_dump())
    db.add(asset)
    db.commit()
    db.refresh(asset)
    return asset


@router.patch("/{asset_id}", response_model=AssetOut)
def update_asset(asset_id: int, body: AssetIn, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(404, "Asset not found")
    for k, v in body.model_dump().items():
        setattr(asset, k, v)
    db.commit()
    db.refresh(asset)
    return asset


@router.delete("/{asset_id}")
def delete_asset(asset_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(404, "Asset not found")
    db.delete(asset)
    db.commit()
    return {"ok": True}
