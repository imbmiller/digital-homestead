import logging
from contextlib import asynccontextmanager

import structlog
import uvicorn
from fastapi import FastAPI

from gateway.database import init_db
from gateway.settings import settings

logger = structlog.get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logging.basicConfig(level=getattr(logging, settings.log_level.upper(), logging.INFO))
    structlog.configure(wrapper_class=structlog.make_filtering_bound_logger(logging.INFO))
    await init_db()
    logger.info("gateway_started", database_url=settings.database_url)
    yield
    logger.info("gateway_stopped")


def create_app() -> FastAPI:
    app = FastAPI(
        title="Digital Homestead Gateway",
        description="Agent authentication, task board, event stream, and GitHub integration.",
        version="0.1.0",
        lifespan=lifespan,
    )

    from gateway.routers import auth, health, tasks, prs, events, orchestrator
    app.include_router(auth.router)
    app.include_router(health.router)
    app.include_router(tasks.router)
    app.include_router(prs.router)
    app.include_router(events.router)
    app.include_router(orchestrator.router)

    return app


app = create_app()


def run() -> None:
    uvicorn.run("gateway.main:app", host="0.0.0.0", port=8000, workers=1, reload=False)
