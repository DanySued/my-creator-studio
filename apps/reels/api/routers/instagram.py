"""Instagram account management, posting, and scheduling endpoints."""
import logging
import os
import secrets
import uuid

from fastapi import APIRouter, HTTPException, File, UploadFile, Query
from fastapi.responses import RedirectResponse
from datetime import datetime

logger = logging.getLogger("instagram_router")

from models.schemas import (
    LoginRequest,
    VerifyRequest,
    PostRequest,
    ScheduleRequest,
    AccountResponse,
    ScheduledPostResponse,
    ActivityLogEntry,
)
from models.database import (
    InstagramAccount,
    ScheduledPost,
    ActivityLog,
    Reel,
)
from services.instagram import (
    login_account,
    complete_2fa,
    complete_challenge,
    get_all_accounts,
    remove_account,
    post_media,
)
from services.job_queue import schedule_instagram_post

router = APIRouter()

MEDIA_DIR = os.getenv("MEDIA_DIR", "/media")


# ── Accounts ──────────────────────────────────────────────────────────────────

@router.get("/accounts", response_model=list[AccountResponse])
async def list_accounts():
    """Return all connected Instagram accounts."""
    return get_all_accounts()


@router.post("/accounts")
async def start_login(req: LoginRequest):
    """
    Initiate an Instagram login.

    Returns one of:
    - {"status": "connected", ...account} on immediate success
    - {"status": "2fa_required", "pending_id": str}
    - {"status": "challenge_required", "pending_id": str, "challenge_type": "email"|"sms"}
    """
    try:
        result = login_account(req.username, req.password)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Login failed: {str(e)}")


@router.post("/accounts/verify-2fa")
async def verify_2fa(req: VerifyRequest):
    """Submit a TOTP or SMS 2FA code to complete login."""
    try:
        return complete_2fa(req.pending_id, req.code)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/accounts/verify-challenge")
async def verify_challenge(req: VerifyRequest):
    """Submit an email/SMS challenge code to complete login."""
    try:
        return complete_challenge(req.pending_id, req.code)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/accounts/{account_id}")
async def delete_account(account_id: str):
    """Remove a connected Instagram account."""
    try:
        remove_account(account_id)
        return {"status": "removed"}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/accounts/{account_id}/export-session")
async def export_session(account_id: str):
    """Return the raw Instagrapi session JSON for a given account (use locally to transfer to prod)."""
    try:
        account = InstagramAccount.get_by_id(account_id)
    except InstagramAccount.DoesNotExist:
        raise HTTPException(status_code=404, detail="Account not found")
    if not account.session_data:
        raise HTTPException(status_code=400, detail="No session data — account has not logged in yet")
    return {"username": account.username, "session_data": account.session_data}


@router.post("/accounts/import-session")
async def import_session(payload: dict):
    """
    Import an Instagrapi session exported from a local instance.
    Accepts {username, session_data} and saves it to the DB after validating the session.
    """
    from services.instagram import import_session as _import_session
    username = payload.get("username", "").strip()
    session_data = payload.get("session_data", "").strip()
    if not username or not session_data:
        raise HTTPException(status_code=400, detail="username and session_data are required")
    try:
        return _import_session(username, session_data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Import failed: {str(e)}")


# ── Upload media ──────────────────────────────────────────────────────────────

@router.post("/upload-media")
async def upload_media(file: UploadFile = File(...)):
    """Upload a video or image; returns the server-side path for PostRequest."""
    upload_dir = os.path.join(MEDIA_DIR, "uploads", "instagram")
    os.makedirs(upload_dir, exist_ok=True)

    ext = os.path.splitext(file.filename or "upload")[1] or ".mp4"
    file_id = str(uuid.uuid4())
    dest = os.path.join(upload_dir, f"{file_id}{ext}")

    content = await file.read()
    with open(dest, "wb") as f:
        f.write(content)

    return {"id": file_id, "path": dest, "filename": file.filename}


# ── Media library ─────────────────────────────────────────────────────────────

@router.get("/media")
async def list_publishable_media():
    """List generated reels available for publishing."""
    try:
        reels = Reel.select().where(Reel.output_path != "").order_by(Reel.created_at.desc())
        return [
            {
                "id": r.id,
                "title": r.title,
                "path": r.output_path,
                "duration": r.duration,
                "keywords": r.keywords,
                "created_at": r.created_at.isoformat(),
                "type": "reel",
            }
            for r in reels
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Post now ──────────────────────────────────────────────────────────────────

@router.post("/post")
async def post_now(req: PostRequest):
    """Post media to Instagram immediately."""
    try:
        return post_media(req.account_id, req.media_path, req.caption, req.post_type)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Post failed: {str(e)}")


# ── Scheduling ────────────────────────────────────────────────────────────────

@router.post("/schedule", response_model=ScheduledPostResponse)
async def schedule_post(req: ScheduleRequest):
    """Queue a post to be published at a specific future datetime."""
    if req.scheduled_at <= datetime.now():
        raise HTTPException(status_code=400, detail="scheduled_at must be in the future")
    try:
        post = schedule_instagram_post(
            account_id=req.account_id,
            media_path=req.media_path,
            caption=req.caption,
            post_type=req.post_type,
            scheduled_at=req.scheduled_at,
        )
        return post
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Scheduling failed: {str(e)}")


@router.get("/queue", response_model=list[ScheduledPostResponse])
async def get_queue():
    """Return all scheduled posts (pending, posted, failed, cancelled)."""
    try:
        posts = (
            ScheduledPost.select(ScheduledPost, InstagramAccount)
            .join(InstagramAccount)
            .order_by(ScheduledPost.scheduled_at.asc())
        )
        return [_post_to_dict(p) for p in posts]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/queue/{post_id}")
async def cancel_scheduled_post(post_id: str):
    """Cancel a pending scheduled post."""
    try:
        post = ScheduledPost.get_by_id(post_id)
    except ScheduledPost.DoesNotExist:
        raise HTTPException(status_code=404, detail="Scheduled post not found")

    if post.status != "pending":
        raise HTTPException(status_code=400, detail=f"Cannot cancel a post with status '{post.status}'")

    post.status = "cancelled"
    post.save()

    from services.job_queue import scheduler, init_scheduler
    init_scheduler()
    try:
        scheduler.remove_job(f"ig_post_{post_id}")
    except Exception:
        pass

    return {"status": "cancelled"}


# ── Activity log ──────────────────────────────────────────────────────────────

@router.get("/log", response_model=list[ActivityLogEntry])
async def get_activity_log(limit: int = Query(50, ge=1, le=200)):
    """Return recent Instagram activity log entries."""
    try:
        entries = (
            ActivityLog.select()
            .order_by(ActivityLog.created_at.desc())
            .limit(limit)
        )
        return [
            {
                "id": e.id,
                "account_username": e.account_username,
                "action_type": e.action_type,
                "message": e.message,
                "created_at": e.created_at.isoformat(),
            }
            for e in entries
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── OAuth (Instagram Platform API) ────────────────────────────────────────────

from services.instagram_oauth import instagram_oauth  # noqa: E402


@router.post("/oauth/connect")
async def oauth_connect():
    """
    Return the Instagram OAuth authorization URL.
    The client should redirect the browser to the returned auth_url.
    Requires INSTAGRAM_APP_ID + INSTAGRAM_APP_SECRET to be set.
    """
    if not instagram_oauth.is_configured():
        raise HTTPException(
            status_code=503,
            detail=(
                "Instagram OAuth is not configured. "
                "Add INSTAGRAM_APP_ID and INSTAGRAM_APP_SECRET to your .env file."
            ),
        )
    state = secrets.token_urlsafe(16)
    auth_url = instagram_oauth.get_auth_url(state=state)
    return {"auth_url": auth_url}


@router.get("/oauth/callback")
async def oauth_callback(
    code: str = Query(None),
    error: str = Query(None),
    error_description: str = Query(None),
):
    """
    Meta redirects here after the user authorises (or denies) the app.
    Exchanges the authorization code for a long-lived token, saves the account,
    then redirects back to the frontend callback page.
    """
    redirect_base = f"{instagram_oauth.frontend_url}/instagram/callback"

    if error:
        msg = (error_description or error).replace(" ", "+")
        return RedirectResponse(url=f"{redirect_base}?error={msg}", status_code=302)

    if not code:
        return RedirectResponse(url=f"{redirect_base}?error=no_code_received", status_code=302)

    try:
        account = await instagram_oauth.save_oauth_account(code)
        username = account.get("username", "")
        return RedirectResponse(
            url=f"{redirect_base}?success=true&username={username}",
            status_code=302,
        )
    except Exception as exc:
        logger.error(f"OAuth callback error: {exc}")
        msg = str(exc)[:120].replace(" ", "+")
        return RedirectResponse(url=f"{redirect_base}?error={msg}", status_code=302)


# ── Helpers ───────────────────────────────────────────────────────────────────

def _post_to_dict(post: ScheduledPost) -> dict:
    return {
        "id": post.id,
        "account_username": post.account.username,
        "post_type": post.post_type,
        "caption": post.caption,
        "scheduled_at": post.scheduled_at.isoformat(),
        "status": post.status,
        "error_message": post.error_message,
        "posted_at": post.posted_at.isoformat() if post.posted_at else None,
    }
