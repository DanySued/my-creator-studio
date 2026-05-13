"""Reels generation API endpoints."""
import os
import uuid
from fastapi import APIRouter, HTTPException, File, UploadFile
from fastapi.responses import FileResponse

from models.schemas import (
    ReelGenerateRequest,
    ReelJobResponse,
    ReelListResponse,
    ReelResponse,
    AudioListResponse,
    AudioUploadResponse,
)
from models.database import Reel, AudioFile
from services.job_queue import create_reel_generation_job, get_job_status
import subprocess
import json

router = APIRouter()

MEDIA_DIR = os.getenv("MEDIA_DIR", "/media")
AUDIO_DIR = os.path.join(MEDIA_DIR, "music")
os.makedirs(AUDIO_DIR, exist_ok=True)


@router.post("/generate", response_model=ReelJobResponse)
async def generate_reel(request: ReelGenerateRequest):
    """
    Generate a reel from keywords and audio.

    Queues a background job that:
    1. Searches Pexels for videos matching keywords
    2. Trims videos into clips
    3. Concatenates clips to target duration
    4. Scales to 1080x1920 (Instagram Reels format)
    5. Mixes audio with video

    Returns job ID for polling progress.
    """
    if not request.keywords or len(request.keywords) == 0:
        raise HTTPException(status_code=400, detail="At least one keyword required")

    if request.duration < 3 or request.duration > 60:
        raise HTTPException(status_code=400, detail="Duration must be between 3 and 60 seconds")

    if not request.audio_file_id:
        raise HTTPException(status_code=400, detail="Audio file ID required")

    try:
        job_id = create_reel_generation_job(request)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create job: {str(e)}")

    # Return initial job status
    return get_job_status(job_id)


@router.get("/job/{job_id}", response_model=ReelJobResponse)
async def get_job(job_id: str):
    """
    Poll the status of a reel generation job.

    Returns current progress (0-100) and status (queued, processing, done, failed).
    """
    status = get_job_status(job_id)
    if status.get("status") == "not_found":
        raise HTTPException(status_code=404, detail="Job not found")
    return status


@router.post("/upload-audio", response_model=AudioUploadResponse)
async def upload_audio(file: UploadFile = File(...)):
    """
    Upload an audio file to use in reel generation.

    Accepts: MP3, WAV, M4A, OGG

    Returns audio file ID for use in /generate endpoint.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    # Validate audio format
    allowed_types = {"audio/mpeg", "audio/wav", "audio/mp4", "audio/ogg"}
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Unsupported audio format")

    audio_id = str(uuid.uuid4())
    filename = f"{audio_id}_{file.filename}"
    filepath = os.path.join(AUDIO_DIR, filename)

    try:
        # Save uploaded file
        content = await file.read()
        with open(filepath, "wb") as f:
            f.write(content)

        try:
            result = subprocess.run(
                ["ffprobe", "-v", "quiet", "-print_format", "json", "-show_format", filepath],
                capture_output=True, text=True, check=True,
            )
            duration = float(json.loads(result.stdout)["format"]["duration"])
        except Exception as e:
            raise ValueError(f"Could not determine audio duration: {str(e)}")

        # Save to database
        audio = AudioFile.create(
            id=audio_id,
            filename=file.filename,
            file_path=filepath,
            duration=int(duration),
        )

        return AudioUploadResponse(
            id=audio.id,
            filename=audio.filename,
            duration=audio.duration,
        )

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


@router.get("/audio", response_model=AudioListResponse)
async def list_audio_files():
    """
    Get list of all uploaded audio files available for reel generation.
    """
    try:
        audio_files = AudioFile.select().order_by(AudioFile.uploaded_at.desc())
        return AudioListResponse(
            audio_files=[
                AudioUploadResponse(
                    id=a.id,
                    filename=a.filename,
                    duration=a.duration,
                )
                for a in audio_files
            ]
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list audio: {str(e)}")


@router.get("/list", response_model=ReelListResponse)
async def list_reels():
    """
    Get list of all generated reels (newest first).
    """
    try:
        reels = Reel.select().order_by(Reel.created_at.desc())
        return ReelListResponse(
            reels=[
                ReelResponse(
                    id=r.id,
                    title=r.title,
                    keywords=r.keywords,
                    duration=r.duration,
                    output_path=r.output_path,
                    created_at=r.created_at,
                )
                for r in reels if r.output_path  # Only include completed reels
            ]
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list reels: {str(e)}")


@router.get("/download/{reel_id}")
async def download_reel(reel_id: str):
    """
    Download a generated reel MP4 file.
    """
    try:
        reel = Reel.get_by_id(reel_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Reel not found")

    if not reel.output_path:
        raise HTTPException(status_code=404, detail="Reel file not found")

    return FileResponse(
        path=reel.output_path,
        media_type="video/mp4",
        filename=f"{reel.title.replace(' ', '_')}.mp4",
    )
