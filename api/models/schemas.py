"""Pydantic schemas for request/response validation."""
from pydantic import BaseModel
from datetime import datetime
from typing import List


class SlideData(BaseModel):
    """A single slide with title and content."""
    title: str
    content: str


class CarouselGenerateRequest(BaseModel):
    """Request to generate a carousel from document content."""
    content: str  # Extracted text from document
    slide_count: int = 5  # Number of slides to generate
    theme: str = "midnight"
    title: str = "Generated Carousel"


class CarouselExportRequest(BaseModel):
    """Request to export slides as PNG ZIP."""
    carousel_id: str
    theme: str = "midnight"
    slides: List[SlideData]


class CarouselResponse(BaseModel):
    """Carousel metadata response."""
    id: str
    title: str
    theme: str
    slide_count: int
    created_at: datetime


class CarouselHistoryResponse(BaseModel):
    """List of past carousels."""
    carousels: List[CarouselResponse]


class CarouselGenerateResponse(BaseModel):
    """Response from carousel generation."""
    carousel_id: str
    slides: List[SlideData]


# === Reels Schemas ===

class TextOverlayItem(BaseModel):
    """A single text layer to burn onto the video."""
    text: str
    x: float = 50.0       # % from left (0–100), text centered at this point
    y: float = 82.0       # % from top  (0–100), text centered at this point
    font: str = "sans"    # "sans" | "serif" | "mono"
    bold: bool = False
    italic: bool = False


class ReelGenerateRequest(BaseModel):
    """Request to generate a reel from keywords."""
    keywords: List[str]
    audio_file_id: str
    duration: int = 15
    title: str = "Generated Reel"
    song_start_time: int = 0
    overlays: List[TextOverlayItem] = []  # empty list = no text
    count: int = 1


class ReelJobResponse(BaseModel):
    """Status of a reel generation job."""
    job_id: str
    reel_id: str | None
    status: str  # queued, processing, done, failed
    progress: int  # 0-100
    error_message: str | None = None
    created_at: datetime
    completed_at: datetime | None = None
    reels_done: int = 0   # how many variations have completed (for bulk jobs)
    reels_total: int = 1  # total variations requested


class ReelResponse(BaseModel):
    """Completed reel metadata."""
    id: str
    title: str
    keywords: str
    duration: int
    output_path: str
    created_at: datetime


class ReelListResponse(BaseModel):
    """List of generated reels."""
    reels: List[ReelResponse]


class AudioUploadResponse(BaseModel):
    """Response from audio file upload."""
    id: str
    filename: str
    duration: int


class AudioListResponse(BaseModel):
    """List of available audio files."""
    audio_files: List[AudioUploadResponse]


# ── Phase 4 — Instagram / Publish ────────────────────────────────────────────

class LoginRequest(BaseModel):
    username: str
    password: str


class VerifyRequest(BaseModel):
    pending_id: str
    code: str


class PostRequest(BaseModel):
    account_id: str
    media_path: str   # server-side absolute path
    caption: str = ""
    post_type: str = "reel"  # reel | photo


class ScheduleRequest(BaseModel):
    account_id: str
    media_path: str
    caption: str = ""
    post_type: str = "reel"
    scheduled_at: datetime


class AccountResponse(BaseModel):
    id: str
    username: str
    full_name: str
    avatar_url: str | None
    status: str
    follower_count: int
    following_count: int
    last_active: str | None
    created_at: str


class ScheduledPostResponse(BaseModel):
    id: str
    account_username: str
    post_type: str
    caption: str
    scheduled_at: str
    status: str
    error_message: str | None
    posted_at: str | None


class ActivityLogEntry(BaseModel):
    id: str
    account_username: str | None
    action_type: str
    message: str
    created_at: str
