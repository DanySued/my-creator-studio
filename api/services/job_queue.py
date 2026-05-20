"""Background job queue management using APScheduler."""
import asyncio
import json
import math
import os
import random
import shutil
import uuid
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime

from apscheduler.schedulers.background import BackgroundScheduler

from models.database import ReelJob, Reel
from models.schemas import ReelGenerateRequest
from services.pexels import search_videos, download_video
from services.video import (
    get_video_duration,
    trim_video,
    concatenate_videos,
    scale_to_instagram_reels,
    mix_audio,
    burn_text_overlays,
    transcribe_audio_to_srt,
    burn_subtitles,
    VideoProcessingError,
)


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

    Returns job ID for status polling.
    """
    from models.database import AudioFile

    job_id = str(uuid.uuid4())
    reel_id = str(uuid.uuid4())

    try:
        audio = AudioFile.get_by_id(request.audio_file_id)
    except Exception:
        raise ValueError("Audio file not found")

    if not os.path.exists(audio.file_path):
        # Stale DB record — the volume file was deleted (e.g. Railway redeploy).
        audio.delete_instance()
        raise ValueError("Audio file no longer exists on disk — please re-upload it")

    try:
        reel = Reel.create(
            id=reel_id,
            title=request.title,
            keywords=",".join(request.keywords),
            duration=request.duration,
            audio_path=audio.file_path,
            output_path="",
        )
        job = ReelJob.create(
            id=job_id,
            reel=reel,
            status="queued",
            progress=0,
        )
    except Exception as e:
        raise ValueError(f"Failed to create job: {str(e)}")

    init_scheduler()
    scheduler.add_job(
        _phase1_prepare_clips,
        args=(job_id, reel_id, request),
        id=job_id,
        name=f"reel_gen_{job_id}",
    )

    JOBS[job_id] = {"status": "queued", "progress": 0, "error": None, "created_at": datetime.now().isoformat()}
    return job_id


def _phase1_prepare_clips(
    job_id: str,
    reel_id: str,
    request: ReelGenerateRequest,
) -> None:
    """
    Background job phase 1: search Pexels, download, and trim clips.
    Pauses at 50% with status 'awaiting_clip_approval' for user review.
    """
    try:
        job = ReelJob.get_by_id(job_id)
        job.status = "processing"
        job.started_at = datetime.now()
        job.progress = 10
        job.save()

        MEDIA_DIR = os.getenv("MEDIA_DIR", "/media")
        reel_dir = os.path.join(MEDIA_DIR, "generated", "reels", reel_id)
        os.makedirs(reel_dir, exist_ok=True)

        # Search and download videos (20%)
        job.progress = 20
        job.save()

        estimated_clips = max(1, round(request.duration / 4))
        download_count = estimated_clips + 2

        video_paths = []
        try:
            fetch_pool = min(max(download_count * 3, 15), 80)
            video_list = asyncio_run(search_videos(request.keywords, per_page=fetch_pool))
            random.shuffle(video_list)
            candidates = video_list[:download_count]
            video_paths = [os.path.join(reel_dir, f"video_{i}.mp4") for i in range(len(candidates))]

            async def _download_all():
                await asyncio.gather(*[
                    download_video(meta["url"], path)
                    for meta, path in zip(candidates, video_paths)
                ])

            asyncio_run(_download_all())
        except Exception as e:
            raise ValueError(f"Pexels integration failed: {str(e)}")

        if not video_paths:
            raise ValueError("Could not download any videos from Pexels")

        # Trim clips in parallel (40%)
        job.progress = 40
        job.save()

        clips_dir = os.path.join(reel_dir, "clips")
        os.makedirs(clips_dir, exist_ok=True)

        target_clip_count = min(max(1, round(request.duration / 4)), len(video_paths))
        clip_duration = request.duration / target_clip_count

        def _trim_one(args: tuple) -> str | None:
            idx, video_path = args
            try:
                video_dur = get_video_duration(video_path)
                start = random.uniform(0, max(0.0, video_dur - clip_duration))
                clip_path = os.path.join(clips_dir, f"clip_{idx}.mp4")
                trim_video(video_path, clip_path, start, clip_duration)
                return clip_path
            except Exception:
                return None

        with ThreadPoolExecutor(max_workers=target_clip_count) as pool:
            results = list(pool.map(_trim_one, enumerate(video_paths[:target_clip_count])))
        clips = [p for p in results if p is not None]

        # Free raw downloads
        for p in video_paths:
            try:
                os.remove(p)
            except OSError:
                pass

        if not clips:
            raise ValueError("Could not create any video clips")

        # Retrim if some clips failed
        if len(clips) < target_clip_count:
            clip_duration = request.duration / len(clips)

            def _retrim_one(clip_path: str) -> str:
                try:
                    video_dur = get_video_duration(clip_path)
                    start = random.uniform(0, max(0.0, video_dur - clip_duration))
                    retrimmed_path = clip_path.rsplit(".mp4", 1)[0] + "_rt.mp4"
                    trim_video(clip_path, retrimmed_path, start, clip_duration)
                    os.remove(clip_path)
                    return retrimmed_path
                except Exception:
                    return clip_path

            with ThreadPoolExecutor(max_workers=len(clips)) as pool:
                clips = list(pool.map(_retrim_one, clips))

        # Pause for clip approval (50%)
        job.clip_paths = json.dumps(clips)
        job.pending_request_data = json.dumps(request.model_dump())
        job.status = "awaiting_clip_approval"
        job.progress = 50
        job.save()

        JOBS[job_id] = {
            "status": "awaiting_clip_approval",
            "progress": 50,
            "clip_count": len(clips),
            "error": None,
        }

    except Exception as e:
        job = ReelJob.get_by_id(job_id)
        job.status = "failed"
        job.error_message = str(e)
        job.completed_at = datetime.now()
        job.save()
        JOBS[job_id] = {"status": "failed", "progress": job.progress, "error": str(e)}
        MEDIA_DIR = os.getenv("MEDIA_DIR", "/media")
        reel_dir = os.path.join(MEDIA_DIR, "generated", "reels", reel_id)
        shutil.rmtree(reel_dir, ignore_errors=True)


def approve_clips(job_id: str) -> None:
    """Approve the clips for a job and schedule phase 2 rendering."""
    job = ReelJob.get_by_id(job_id)
    if job.status != "awaiting_clip_approval":
        raise ValueError(f"Job is not awaiting clip approval (status: {job.status})")

    job.status = "processing"
    job.progress = 55
    job.save()

    JOBS[job_id] = {"status": "processing", "progress": 55, "error": None}

    init_scheduler()
    scheduler.add_job(
        _phase2_render_reel,
        args=(job_id, str(job.reel_id)),
        id=f"{job_id}_phase2",
        name=f"reel_render_{job_id}",
    )


async def replace_clip(job_id: str, clip_index: int) -> None:
    """Replace clip at clip_index with a freshly searched-and-trimmed clip."""
    job = ReelJob.get_by_id(job_id)
    if job.status != "awaiting_clip_approval":
        raise ValueError(f"Job is not awaiting clip approval (status: {job.status})")
    if not job.clip_paths:
        raise ValueError("No clip paths stored for this job")

    clips = json.loads(job.clip_paths)
    if clip_index < 0 or clip_index >= len(clips):
        raise ValueError(f"Clip index {clip_index} out of range (job has {len(clips)} clips)")

    request_data = json.loads(job.pending_request_data)
    request = ReelGenerateRequest(**request_data)
    clip_duration = request.duration / len(clips)

    # Search Pexels for replacement candidates
    video_list = await search_videos(request.keywords, per_page=20)
    random.shuffle(video_list)

    MEDIA_DIR = os.getenv("MEDIA_DIR", "/media")
    reel_id = str(job.reel_id)
    reel_dir = os.path.join(MEDIA_DIR, "generated", "reels", reel_id)

    loop = asyncio.get_running_loop()
    target_clip_path = clips[clip_index]

    for meta in video_list:
        temp_path = os.path.join(reel_dir, f"replace_{clip_index}_{uuid.uuid4().hex[:6]}.mp4")
        try:
            await download_video(meta["url"], temp_path)
            video_dur = await loop.run_in_executor(None, get_video_duration, temp_path)
            start = random.uniform(0, max(0.0, video_dur - clip_duration))
            await loop.run_in_executor(None, trim_video, temp_path, target_clip_path, start, clip_duration)
            try:
                os.remove(temp_path)
            except OSError:
                pass
            return
        except Exception:
            try:
                os.remove(temp_path)
            except OSError:
                pass

    raise ValueError("Could not find a suitable replacement clip — try again")


def _phase2_render_reel(job_id: str, reel_id: str) -> None:
    """
    Background job phase 2: concat, scale, mix audio, burn text.
    Runs after the user approves the clips from phase 1.
    """
    try:
        job = ReelJob.get_by_id(job_id)
        clips = json.loads(job.clip_paths)
        request_data = json.loads(job.pending_request_data)
        request = ReelGenerateRequest(**request_data)

        MEDIA_DIR = os.getenv("MEDIA_DIR", "/media")
        reel_dir = os.path.join(MEDIA_DIR, "generated", "reels", reel_id)

        # Concat clips (60%)
        job.progress = 60
        job.save()
        JOBS[job_id] = {"status": "processing", "progress": 60, "error": None}

        concat_path = os.path.join(reel_dir, "concat.mp4")
        concatenate_videos(clips, concat_path)
        # Free clips dir after concat
        clips_dir = os.path.dirname(clips[0]) if clips else None
        if clips_dir:
            shutil.rmtree(clips_dir, ignore_errors=True)

        # Scale to Instagram Reels format (75%)
        job.progress = 75
        job.save()
        JOBS[job_id]["progress"] = 75

        scaled_path = os.path.join(reel_dir, "scaled.mp4")
        scale_to_instagram_reels(concat_path, scaled_path)
        os.remove(concat_path)

        # Mix audio (90%)
        job.progress = 90
        job.save()
        JOBS[job_id]["progress"] = 90

        reel = Reel.get_by_id(reel_id)
        audio_mixed_path = os.path.join(reel_dir, "audio_mixed.mp4")
        mix_audio(
            scaled_path,
            reel.audio_path,
            audio_mixed_path,
            audio_start_time=request.song_start_time,
        )
        os.remove(scaled_path)

        # Burn text overlays (95%)
        job.progress = 95
        job.save()
        JOBS[job_id]["progress"] = 95

        overlays_path = os.path.join(reel_dir, "final.mp4")
        active_overlays = [ov for ov in request.overlays if ov.text.strip()]
        if active_overlays:
            burn_text_overlays(audio_mixed_path, overlays_path, active_overlays)
            os.remove(audio_mixed_path)
        else:
            os.rename(audio_mixed_path, overlays_path)

        # Auto-subtitles: transcribe → burn → keep .srt (96–99%)
        srt_path = None
        if request.subtitles_enabled:
            job.progress = 96
            job.save()
            JOBS[job_id]["progress"] = 96

            # Whisper transcribes the video's audio track directly
            srt_path = transcribe_audio_to_srt(overlays_path, reel_dir)

            job.progress = 98
            job.save()
            JOBS[job_id]["progress"] = 98

            # Burn the subtitles into a new file, then replace
            subtitled_path = os.path.join(reel_dir, "final_subtitled.mp4")
            burn_subtitles(overlays_path, srt_path, subtitled_path)
            os.remove(overlays_path)
            os.rename(subtitled_path, overlays_path)

        final_path = overlays_path

        # Done (100%)
        job.progress = 100
        job.status = "done"
        job.completed_at = datetime.now()
        reel.output_path = final_path
        if srt_path:
            reel.srt_path = srt_path
        reel.save()
        job.save()

        JOBS[job_id] = {"status": "done", "progress": 100, "error": None, "srt_path": srt_path}

    except Exception as e:
        job = ReelJob.get_by_id(job_id)
        job.status = "failed"
        job.error_message = str(e)
        job.completed_at = datetime.now()
        job.save()
        JOBS[job_id] = {"status": "failed", "progress": job.progress, "error": str(e)}
        MEDIA_DIR = os.getenv("MEDIA_DIR", "/media")
        reel_dir = os.path.join(MEDIA_DIR, "generated", "reels", reel_id)
        shutil.rmtree(reel_dir, ignore_errors=True)


def _compute_phase(status: str, progress: int) -> tuple[int, int]:
    """Map (status, global progress 0-100) → (phase 1|2, phase_progress 0-100)."""
    def _interp(val: int, stops: list[tuple[int, int]]) -> int:
        for i in range(len(stops) - 1):
            x0, y0 = stops[i]
            x1, y1 = stops[i + 1]
            if x0 <= val <= x1:
                t = (val - x0) / (x1 - x0) if x1 != x0 else 0.0
                return round(y0 + t * (y1 - y0))
        return stops[-1][1]

    if status == "awaiting_clip_approval":
        return 1, 100
    if status == "done":
        return 2, 100
    if progress >= 55:
        return 2, _interp(progress, [(55, 0), (60, 15), (75, 45), (90, 75), (95, 90), (100, 100)])
    return 1, _interp(progress, [(0, 0), (10, 10), (20, 40), (40, 80), (50, 100)])


def get_job_status(job_id: str) -> dict:
    """Get the status of a reel generation job."""
    try:
        job = ReelJob.get_by_id(job_id)
        clip_count = None
        if job.clip_paths:
            try:
                clip_count = len(json.loads(job.clip_paths))
            except Exception:
                pass
        phase, phase_progress = _compute_phase(job.status, job.progress)
        srt_path = None
        if job.status == "done" and job.reel:
            try:
                srt_path = job.reel.srt_path or None
            except Exception:
                pass
        return {
            "job_id": job_id,
            "reel_id": job.reel.id if job.reel else None,
            "status": job.status,
            "progress": job.progress,
            "phase": phase,
            "phase_progress": phase_progress,
            "error_message": job.error_message,
            "clip_count": clip_count,
            "created_at": job.created_at.isoformat(),
            "completed_at": job.completed_at.isoformat() if job.completed_at else None,
            "reels_done": 1 if job.status == "done" else 0,
            "reels_total": 1,
            "srt_path": srt_path,
        }
    except Exception:
        if job_id in JOBS:
            mem = JOBS[job_id]
            mem_status = mem.get("status", "queued")
            mem_progress = mem.get("progress", 0)
            phase, phase_progress = _compute_phase(mem_status, mem_progress)
            return {
                "job_id": job_id,
                "reel_id": None,
                "status": mem_status,
                "progress": mem_progress,
                "phase": phase,
                "phase_progress": phase_progress,
                "error_message": mem.get("error"),
                "clip_count": mem.get("clip_count"),
                "created_at": mem.get("created_at", datetime.now().isoformat()),
                "completed_at": None,
                "reels_done": 1 if mem_status == "done" else 0,
                "reels_total": 1,
                "srt_path": mem.get("srt_path"),
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
        misfire_grace_time=300,
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
        return

    if post.status != "pending":
        return

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
    import sys

    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()
