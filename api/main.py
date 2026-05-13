from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
from dotenv import load_dotenv

load_dotenv()

from routers import health, carousel, reels, instagram, automation
from models.database import init_db
from services.job_queue import init_scheduler

app = FastAPI(title="My Creator Studio API", version="1.0.0")

# Initialize database and job scheduler on startup
init_db()
init_scheduler()

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

# Serve generated media files
MEDIA_DIR = os.getenv("MEDIA_DIR", "/media")
if os.path.isdir(MEDIA_DIR):
    app.mount("/media", StaticFiles(directory=MEDIA_DIR), name="media")

@app.get("/")
def root():
    return {"status": "ok", "service": "my-creator-studio-api"}
