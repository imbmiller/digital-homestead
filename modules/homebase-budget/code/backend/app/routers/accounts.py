from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models.account import Account
from ..models.user import User
from ..schemas.account import AccountCreate, AccountUpdate, AccountOut
from ..services.auth import get_current_user

router = APIRouter(prefix="/accounts", tags=["accounts"])


@router.get("/", response_model=list[AccountOut])
def list_accounts(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    return db.query(Account).order_by(Account.sort_order, Account.id).all()


@router.post("/", response_model=AccountOut)
def create_account(body: AccountCreate, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    acct = Account(**body.model_dump())
    db.add(acct)
    db.commit()
    db.refresh(acct)
    return acct


@router.get("/{account_id}", response_model=AccountOut)
def get_account(account_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    acct = db.query(Account).filter(Account.id == account_id).first()
    if not acct:
        raise HTTPException(404, "Account not found")
    return acct


@router.patch("/{account_id}", response_model=AccountOut)
def update_account(account_id: int, body: AccountUpdate, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    acct = db.query(Account).filter(Account.id == account_id).first()
    if not acct:
        raise HTTPException(404, "Account not found")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(acct, k, v)
    db.commit()
    db.refresh(acct)
    return acct


@router.delete("/{account_id}")
def delete_account(account_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    acct = db.query(Account).filter(Account.id == account_id).first()
    if not acct:
        raise HTTPException(404, "Account not found")
    db.delete(acct)
    db.commit()
    return {"ok": True}
