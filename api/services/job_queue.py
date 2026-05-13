"""Background job queue management using APScheduler."""
import uuid
from datetime import datetime
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.base import BaseTrigger

from models.database import ReelJob, Reel
from models.schemas import ReelGenerateRequest
from services.pexels import search_videos, download_video
from services.video import (
    get_video_duration,
    trim_video,
    concatenate_videos,
    scale_to_instagram_reels,
    mix_audio,
    burn_text_overlay,
    VideoProcessingError,
)
import os
import math
import random


# Global scheduler instance
scheduler: BackgroundScheduler | None = None
JOBS: dict = {}  # In-memory job tracking


def init_scheduler():
    """Initialize the background scheduler."""
    global scheduler
    if scheduler is None:
        scheduler = BackgroundScheduler()
        scheduler.start()


def create_reel_generation_job(request: ReelGenerateRequest) -> str:
    """
    Create a new reel generation job and queue it for processing.

    Args:
        request: Reel generation request parameters

    Returns:
        Job ID for status polling
    """
    from models.database import AudioFile

    job_id = str(uuid.uuid4())
    reel_id = str(uuid.uuid4())

    # Validate audio file exists
    try:
        audio = AudioFile.get_by_id(request.audio_file_id)
    except Exception:
        raise ValueError("Audio file not found")

    # Create job record
    try:
        reel = Reel.create(
            id=reel_id,
            title=request.title,
            keywords=",".join(request.keywords),
            duration=request.duration,
            audio_path=audio.file_path,
            output_path="",  # Will be set when complete
        )
        job = ReelJob.create(
            id=job_id,
            reel=reel,
            status="queued",
            progress=0,
        )
    except Exception as e:
        raise ValueError(f"Failed to create job: {str(e)}")

    # Queue the job
    init_scheduler()
    scheduler.add_job(
        _process_reel_generation,
        args=(job_id, reel_id, request),
        id=job_id,
        name=f"reel_gen_{job_id}",
    )

    JOBS[job_id] = {"status": "queued", "progress": 0, "error": None, "created_at": datetime.now().isoformat()}
    return job_id


def _process_reel_generation(
    job_id: str,
    reel_id: str,
    request: ReelGenerateRequest,
) -> None:
    """
    Background job: Generate a reel from keywords and audio.

    Args:
        job_id: Job ID for tracking
        reel_id: Reel ID
        request: Generation request parameters
    """
    try:
        # Update job status
        job = ReelJob.get_by_id(job_id)
        job.status = "processing"
        job.started_at = datetime.now()
        job.progress = 10
        job.save()

        MEDIA_DIR = os.getenv("MEDIA_DIR", "/media")
        reel_dir = os.path.join(MEDIA_DIR, "generated", "reels", reel_id)
        os.makedirs(reel_dir, exist_ok=True)

        # Step 1: Search and download videos from Pexels (20%)
        job.progress = 20
        job.save()

        videos = []
        try:
            import asyncio
            video_list = asyncio_run(search_videos(request.keywords, per_page=5))
            candidates = video_list[:10]
            video_paths = [os.path.join(reel_dir, f"video_{i}.mp4") for i in range(len(candidates))]

            async def _download_all():
                await asyncio.gather(*[
                    download_video(meta["url"], path)
                    for meta, path in zip(candidates, video_paths)
                ])

            asyncio_run(_download_all())
            videos = video_paths
        except Exception as e:
            raise ValueError(f"Pexels integration failed: {str(e)}")

        if not videos:
            raise ValueError("Could not download any videos from Pexels")

        # Step 2: Trim videos to clips — 1 clip every 4 seconds (viralvibe formula)
        # e.g. 30s reel → ~7-8 clips; each clip is ~4s. More dynamic than a fixed cap.
        job.progress = 40
        job.save()

        clips_dir = os.path.join(reel_dir, "clips")
        os.makedirs(clips_dir, exist_ok=True)
        clips = []

        target_clip_count = min(max(1, round(request.duration / 4)), len(videos))
        clip_duration = request.duration / target_clip_count

        for i, video in enumerate(videos[:target_clip_count]):
            try:
                video_duration = get_video_duration(video)
                max_start = max(0.0, video_duration - clip_duration)
                start_time = random.uniform(0, max_start)
                clip_path = os.path.join(clips_dir, f"clip_{i}.mp4")
                trim_video(video, clip_path, start_time, clip_duration)
                clips.append(clip_path)
            except Exception:
                continue

        if not clips:
            raise ValueError("Could not create any video clips")

        # If some clips failed, redistribute duration across the survivors
        if len(clips) < target_clip_count:
            clip_duration = request.duration / len(clips)
            retrimmed = []
            for i, clip in enumerate(clips):
                try:
                    video_duration = get_video_duration(clip)
                    max_start = max(0.0, video_duration - clip_duration)
                    start_time = random.uniform(0, max_start)
                    retrimmed_path = clip.replace(f"clip_{i}.mp4", f"clip_{i}_rt.mp4")
                    trim_video(clip, retrimmed_path, start_time, clip_duration)
                    retrimmed.append(retrimmed_path)
                except Exception:
                    retrimmed.append(clip)
            clips = retrimmed

        # Step 3: Concatenate clips (60%)
        job.progress = 60
        job.save()

        concat_path = os.path.join(reel_dir, "concat.mp4")
        concatenate_videos(clips, concat_path)

        # Step 4: Scale to Instagram Reels format (75%)
        job.progress = 75
        job.save()

        scaled_path = os.path.join(reel_dir, "scaled.mp4")
        scale_to_instagram_reels(concat_path, scaled_path)

        # Step 5: Mix audio with optional start offset (90%)
        job.progress = 90
        job.save()

        reel = Reel.get_by_id(reel_id)
        audio_mixed_path = os.path.join(reel_dir, "audio_mixed.mp4")
        mix_audio(
            scaled_path,
            reel.audio_path,
            audio_mixed_path,
            audio_start_time=request.song_start_time,
        )

        # Step 6: Burn text overlay unless no_text is set (95%)
        job.progress = 95
        job.save()

        final_path = os.path.join(reel_dir, "final.mp4")
        if request.no_text:
            # Rename audio_mixed directly to final — no overlay step
            os.rename(audio_mixed_path, final_path)
        else:
            text = (request.overlay_text.strip() or request.title or "").strip()
            if text:
                burn_text_overlay(
                    audio_mixed_path,
                    final_path,
                    text,
                    x_pct=request.overlay_x,
                    y_pct=request.overlay_y,
                )
            else:
                os.rename(audio_mixed_path, final_path)

        # Step 7: Finalize (100%)
        job.progress = 100
        job.status = "done"
        job.completed_at = datetime.now()
        reel.output_path = final_path
        reel.save()
        job.save()

        JOBS[job_id] = {"status": "done", "progress": 100, "error": None}

    except Exception as e:
        job = ReelJob.get_by_id(job_id)
        job.status = "failed"
        job.error_message = str(e)
        job.completed_at = datetime.now()
        job.save()
        JOBS[job_id] = {"status": "failed", "progress": job.progress, "error": str(e)}


def get_job_status(job_id: str) -> dict:
    """
    Get the status of a reel generation job.

    Args:
        job_id: Job ID

    Returns:
        Job status dict
    """
    try:
        job = ReelJob.get_by_id(job_id)
        return {
            "job_id": job_id,
            "reel_id": job.reel.id if job.reel else None,
            "status": job.status,
            "progress": job.progress,
            "error_message": job.error_message,
            "created_at": job.created_at.isoformat(),
            "completed_at": job.completed_at.isoformat() if job.completed_at else None,
            "reels_done": 1 if job.status == "done" else 0,
            "reels_total": 1,
        }
    except Exception:
        # Fallback to in-memory tracking
        if job_id in JOBS:
            mem = JOBS[job_id]
            return {
                "job_id": job_id,
                "reel_id": None,
                "status": mem.get("status", "queued"),
                "progress": mem.get("progress", 0),
                "error_message": mem.get("error"),
                "created_at": mem.get("created_at", datetime.now().isoformat()),
                "completed_at": None,
                "reels_done": 1 if mem.get("status") == "done" else 0,
                "reels_total": 1,
            }
        return {"status": "not_found", "error": "Job not found"}


# ── Instagram scheduled posting ───────────────────────────────────────────────

def schedule_instagram_post(
    account_id: str,
    media_path: str,
    caption: str,
    post_type: str,
    scheduled_at,
) -> dict:
    """
    Create a ScheduledPost record and register an APScheduler date-trigger job.
    Returns a dict matching ScheduledPostResponse.
    """
    from models.database import InstagramAccount, ScheduledPost

    try:
        account = InstagramAccount.get_by_id(account_id)
    except Exception:
        raise ValueError("Account not found")

    post_id = str(uuid.uuid4())
    post = ScheduledPost.create(
        id=post_id,
        account=account,
        media_path=media_path,
        caption=caption,
        post_type=post_type,
        scheduled_at=scheduled_at,
        status="pending",
    )

    init_scheduler()
    scheduler.add_job(
        _execute_scheduled_post,
        trigger="date",
        run_date=scheduled_at,
        args=(post_id,),
        id=f"ig_post_{post_id}",
        name=f"ig_post_{post_id}",
        misfire_grace_time=300,  # allow up to 5 min late if server was restarting
    )

    return {
        "id": post.id,
        "account_username": account.username,
        "post_type": post.post_type,
        "caption": post.caption,
        "scheduled_at": post.scheduled_at.isoformat(),
        "status": post.status,
        "error_message": None,
        "posted_at": None,
    }


def _execute_scheduled_post(post_id: str) -> None:
    """APScheduler callback: fire the post when its scheduled_at arrives."""
    from models.database import ScheduledPost
    from services.instagram import post_media

    try:
        post = ScheduledPost.get_by_id(post_id)
    except Exception:
        return  # Row gone — nothing to do

    if post.status != "pending":
        return  # Already cancelled or handled

    post.status = "posting"
    post.save()

    try:
        post_media(
            account_id=str(post.account_id),
            media_path=post.media_path,
            caption=post.caption,
            post_type=post.post_type,
        )
        post.status = "posted"
        post.posted_at = datetime.now()
    except Exception as e:
        post.status = "failed"
        post.error_message = str(e)

    post.save()


def asyncio_run(coro):
    """Helper to run async functions from sync context."""
    import asyncio
    import sys

    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()
