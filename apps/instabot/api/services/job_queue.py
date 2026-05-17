"""Background job queue management using APScheduler — Instagram scheduling only."""
import uuid
from datetime import datetime

from apscheduler.schedulers.background import BackgroundScheduler


# Global scheduler instance
scheduler: BackgroundScheduler | None = None


def init_scheduler():
    """Initialize the background scheduler."""
    global scheduler
    if scheduler is None:
        scheduler = BackgroundScheduler()
        scheduler.start()


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
