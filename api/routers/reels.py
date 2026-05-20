"""Reels generation API endpoints."""
import os
import shutil
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
from models.database import Reel, AudioFile, ReelJob
from services.job_queue import create_reel_generation_job, get_job_status, approve_clips, replace_clip
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

    # Validate audio format — prefix check only; browsers report inconsistent
    # subtypes (e.g. audio/x-m4a vs audio/mp4, audio/mp3 vs audio/mpeg)
    if not (file.content_type or "").startswith("audio/"):
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
        valid = []
        for a in audio_files:
            if os.path.exists(a.file_path):
                valid.append(AudioUploadResponse(id=a.id, filename=a.filename, duration=a.duration))
            else:
                a.delete_instance()  # prune stale record whose volume file is gone
        return AudioListResponse(audio_files=valid)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list audio: {str(e)}")


@router.get("/audio/{audio_id}")
async def stream_audio(audio_id: str):
    """Stream an uploaded audio file for browser playback."""
    try:
        audio = AudioFile.get_by_id(audio_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Audio not found")

    if not os.path.exists(audio.file_path):
        raise HTTPException(status_code=404, detail="Audio file not found on disk")

    return FileResponse(path=audio.file_path, filename=audio.filename)


@router.delete("/audio/{audio_id}", status_code=204)
async def delete_audio(audio_id: str):
    """Delete an uploaded audio file from storage and the database."""
    try:
        audio = AudioFile.get_by_id(audio_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Audio not found")

    if os.path.exists(audio.file_path):
        try:
            os.remove(audio.file_path)
        except OSError as e:
            raise HTTPException(status_code=500, detail=f"Failed to delete file: {e}")

    audio.delete_instance()


@router.get("/clips/{job_id}")
async def get_clips(job_id: str):
    """
    Return metadata for clips awaiting approval.
    Each clip has an index and a streaming URL.
    """
    try:
        job = ReelJob.get_by_id(job_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Job not found")

    if not job.clip_paths:
        raise HTTPException(status_code=404, detail="No clips available for this job")

    try:
        paths = json.loads(job.clip_paths)
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to parse clip paths")

    clips = [{"index": i, "url": f"/reels/clips/{job_id}/{i}"} for i in range(len(paths))]
    return {"job_id": job_id, "clips": clips}


@router.get("/clips/{job_id}/{index}")
async def stream_clip(job_id: str, index: int):
    """Stream a single trimmed clip video for preview."""
    try:
        job = ReelJob.get_by_id(job_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Job not found")

    if not job.clip_paths:
        raise HTTPException(status_code=404, detail="No clips available for this job")

    try:
        paths = json.loads(job.clip_paths)
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to parse clip paths")

    if index < 0 or index >= len(paths):
        raise HTTPException(status_code=404, detail=f"Clip index {index} out of range")

    clip_path = paths[index]
    if not os.path.exists(clip_path):
        raise HTTPException(status_code=404, detail="Clip file not found on disk")

    return FileResponse(path=clip_path, media_type="video/mp4")


@router.post("/clips/{job_id}/approve")
async def approve_clips_endpoint(job_id: str):
    """Approve the clips and kick off phase 2 rendering."""
    try:
        approve_clips(job_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to approve clips: {str(e)}")

    return {"status": "ok", "message": "Clips approved — rendering started"}


@router.post("/clips/{job_id}/replace/{index}")
async def replace_clip_endpoint(job_id: str, index: int):
    """Replace clip at the given index with a fresh Pexels result."""
    try:
        await replace_clip(job_id, index)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to replace clip: {str(e)}")

    return {"status": "ok", "message": f"Clip {index} replaced"}


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


@router.post("/cleanup-temp")
async def cleanup_temp_files():
    """
    Delete orphaned temp files left by failed or in-progress reel jobs.
    - Reel dirs with final.mp4: keeps only final.mp4, deletes intermediate files.
    - Reel dirs without final.mp4: deletes the entire directory.
    Returns freed_mb and dirs_cleaned.
    """
    reels_base = os.path.join(MEDIA_DIR, "generated", "reels")
    if not os.path.isdir(reels_base):
        return {"freed_mb": 0, "dirs_cleaned": 0}

    freed_bytes = 0
    dirs_cleaned = 0

    for reel_id in os.listdir(reels_base):
        reel_dir = os.path.join(reels_base, reel_id)
        if not os.path.isdir(reel_dir):
            continue

        final_path = os.path.join(reel_dir, "final.mp4")
        if os.path.exists(final_path):
            # Keep only final.mp4; delete everything else
            for entry in os.listdir(reel_dir):
                if entry == "final.mp4":
                    continue
                entry_path = os.path.join(reel_dir, entry)
                try:
                    if os.path.isdir(entry_path):
                        for f in _walk_files(entry_path):
                            freed_bytes += os.path.getsize(f)
                        shutil.rmtree(entry_path, ignore_errors=True)
                    else:
                        freed_bytes += os.path.getsize(entry_path)
                        os.remove(entry_path)
                    dirs_cleaned += 1
                except OSError:
                    pass
        else:
            # Orphaned — no final output; wipe entire dir
            for f in _walk_files(reel_dir):
                freed_bytes += os.path.getsize(f)
            shutil.rmtree(reel_dir, ignore_errors=True)
            dirs_cleaned += 1

    return {"freed_mb": round(freed_bytes / 1_048_576, 1), "dirs_cleaned": dirs_cleaned}


def _walk_files(path: str):
    for root, _, files in os.walk(path):
        for f in files:
            yield os.path.join(root, f)


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


@router.get("/download/{reel_id}/srt")
async def download_reel_srt(reel_id: str):
    """
    Download the .srt subtitle file for a reel (only available when subtitles were enabled).
    """
    try:
        reel = Reel.get_by_id(reel_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Reel not found")

    if not reel.srt_path or not os.path.exists(reel.srt_path):
        raise HTTPException(status_code=404, detail="Subtitle file not found for this reel")

    return FileResponse(
        path=reel.srt_path,
        media_type="text/plain",
        filename=f"{reel.title.replace(' ', '_')}.srt",
    )
