from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
import logging
import os
from dotenv import load_dotenv, find_dotenv

load_dotenv(find_dotenv(usecwd=False) or ".env")

from routers import health, carousel
from models.database import init_db, db

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        init_db()
        logger.info("Database initialized")
    except Exception as exc:
        logger.error("Database init failed — DB-dependent routes will fail until resolved: %s", exc)
    yield


app = FastAPI(title="Carousel API", version="1.0.0", lifespan=lifespan)


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


@app.get("/")
def root():
    return {"status": "ok", "service": "carousel-api"}
