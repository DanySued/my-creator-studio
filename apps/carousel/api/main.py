from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging
import os
from dotenv import load_dotenv, find_dotenv

load_dotenv(find_dotenv(usecwd=False) or ".env")

from routers import health, carousel
from models.database import init_db

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        init_db()
        logger.info("Database initialized")
    except Exception as exc:
        logger.error("Database init failed: %s", exc)
    yield


app = FastAPI(title="Carousel API", version="1.0.0", lifespan=lifespan)

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
