"""Pydantic schemas for the Reels app."""
from pydantic import BaseModel
from datetime import datetime
from typing import List, Optional


class TextOverlayItem(BaseModel):
    text: str
    x: float = 50.0
    y: float = 82.0
    font: str = "sans"
    bold: bool = False
    italic: bool = False


class ReelGenerateRequest(BaseModel):
    keywords: List[str]
    audio_file_id: str
    duration: int = 15
    title: str = "Generated Reel"
    song_start_time: int = 0
    overlays: List[TextOverlayItem] = []
    count: int = 1
    subtitles_enabled: bool = False


class ReelJobResponse(BaseModel):
    job_id: str
    reel_id: str | None
    status: str
    progress: int
    phase: int = 1
    phase_progress: int = 0
    error_message: str | None = None
    clip_count: int | None = None
    created_at: datetime
    completed_at: datetime | None = None
    reels_done: int = 0
    reels_total: int = 1
    srt_path: str | None = None


class ReelResponse(BaseModel):
    id: str
    title: str
    keywords: str
    duration: int
    output_path: str
    created_at: datetime


class ReelListResponse(BaseModel):
    reels: List[ReelResponse]


class AudioUploadResponse(BaseModel):
    id: str
    filename: str
    duration: int


class AudioListResponse(BaseModel):
    audio_files: List[AudioUploadResponse]
