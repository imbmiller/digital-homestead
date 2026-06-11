from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import engine, Base
from .models import *  # noqa: F401 — ensure all models are registered before create_all
from .routers import auth, accounts, categories, transactions, budgets, rules, debts, reports, assets, goals
from .services.auth import hash_password
from . import database as db_module
from sqlalchemy.orm import Session

app = FastAPI(title="HomeBase Budget", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3001", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(accounts.router)
app.include_router(categories.router)
app.include_router(transactions.router)
app.include_router(budgets.router)
app.include_router(rules.router)
app.include_router(debts.router)
app.include_router(reports.router)
app.include_router(assets.router)
app.include_router(goals.router)


@app.on_event("startup")
def startup():
    Base.metadata.create_all(bind=engine)
    _seed_defaults()


def _seed_defaults():
    from .models.user import User
    from .models.category import Category

    with Session(engine) as session:
        # Seed system categories if none exist
        if session.query(Category).count() == 0:
            system_cats = [
                Category(name="Inbox", is_system=True, color="#6b7280", sort_order=0),
                Category(name="Transfer", is_system=True, color="#6b7280", sort_order=998),
                Category(name="Ignored", is_system=True, color="#6b7280", sort_order=999),
            ]
            default_cats = [
                Category(name="Income", is_income=True, color="#10b981", sort_order=1),
                Category(name="Rent/Housing", color="#3b82f6", sort_order=2),
                Category(name="Groceries", color="#22c55e", sort_order=3),
                Category(name="Dining Out", color="#f59e0b", sort_order=4),
                Category(name="Gas & Auto", color="#ef4444", sort_order=5),
                Category(name="Utilities", color="#8b5cf6", sort_order=6),
                Category(name="Health", color="#ec4899", sort_order=7),
                Category(name="Entertainment", color="#06b6d4", sort_order=8),
                Category(name="Shopping", color="#f97316", sort_order=9),
                Category(name="Debt Payoff", color="#dc2626", sort_order=10),
                Category(name="Savings", color="#16a34a", sort_order=11),
                Category(name="Miscellaneous", color="#9ca3af", sort_order=12),
            ]
            for cat in system_cats + default_cats:
                session.add(cat)
            session.commit()


@app.get("/health")
def health():
    return {"status": "ok"}
