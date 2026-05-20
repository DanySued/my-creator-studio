from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import logging
import os
from dotenv import load_dotenv, find_dotenv

load_dotenv(find_dotenv(usecwd=False) or ".env")

from routers import health, carousel, reels, instagram, automation
from models.database import init_db, db
from services.job_queue import init_scheduler

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        init_db()
        logger.info("Database initialized")
    except Exception as exc:
        # Log and continue — the app must start so the healthcheck responds.
        logger.error("Database init failed — DB-dependent routes will fail until resolved: %s", exc)
    try:
        init_scheduler()
        logger.info("Scheduler started")
    except Exception as exc:
        logger.error("Scheduler init failed: %s", exc)
    yield


app = FastAPI(title="My Creator Studio API", version="1.0.0", lifespan=lifespan)


@app.middleware("http")
async def db_connection_middleware(request: Request, call_next):
    db.connect(reuse_if_open=True)
    try:
        response = await call_next(request)
    finally:
        if not db.is_closed():
            db.close()
    return response


_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, prefix="/health", tags=["health"])
app.include_router(carousel.router, prefix="/carousel", tags=["carousel"])
app.include_router(reels.router, prefix="/reels", tags=["reels"])
app.include_router(instagram.router, prefix="/instagram", tags=["instagram"])
app.include_router(automation.router, prefix="/automation", tags=["automation"])

MEDIA_DIR = os.getenv("MEDIA_DIR", "/media")
if os.path.isdir(MEDIA_DIR):
    app.mount("/media", StaticFiles(directory=MEDIA_DIR), name="media")
else:
    logger.warning("MEDIA_DIR %s not found — /media endpoint will not be available", MEDIA_DIR)


@app.get("/")
def root():
    return {"status": "ok", "service": "my-creator-studio-api"}
