"""Instagram service using instagrapi for login, session management, and posting."""
import json
import os
import uuid
from datetime import datetime
from pathlib import Path
from typing import Optional

from instagrapi import Client
from instagrapi.exceptions import (
    BadCredentials,
    ChallengeRequired,
    LoginRequired,
    TwoFactorRequired,
)

from models.database import ActivityLog, InstagramAccount

# ── In-memory store for pending logins (2FA / challenge) ─────────────────────
# Keys are temporary IDs returned to the frontend; values hold the live client.
PENDING_LOGINS: dict = {}

DATA_DIR = os.getenv("DATA_DIR", "/data")


# ── Helpers ───────────────────────────────────────────────────────────────────

def _log(account_username: Optional[str], action_type: str, message: str, extra: Optional[dict] = None):
    """Append a row to the activity log (fire-and-forget)."""
    try:
        ActivityLog.create(
            id=str(uuid.uuid4()),
            account_username=account_username,
            action_type=action_type,
            message=message,
            extra_data=json.dumps(extra) if extra else None,
        )
    except Exception:
        pass  # Never crash on a log write


def _account_to_dict(account: InstagramAccount) -> dict:
    return {
        "id": account.id,
        "username": account.username,
        "full_name": account.full_name or "",
        "avatar_url": account.avatar_url,
        "status": account.status,
        "follower_count": account.follower_count,
        "following_count": account.following_count,
        "last_active": account.last_active.isoformat() if account.last_active else None,
        "created_at": account.created_at.isoformat(),
    }


def _save_session(cl: Client, username: str) -> dict:
    """Persist the session and pull account info. Returns the account dict."""
    user_info = cl.account_info()
    settings = cl.get_settings()

    account, _ = InstagramAccount.get_or_create(
        username=username,
        defaults={"id": str(uuid.uuid4())},
    )
    account.status = "connected"
    account.session_data = json.dumps(settings)
    account.avatar_url = str(user_info.profile_pic_url) if user_info.profile_pic_url else None
    account.full_name = user_info.full_name or ""
    account.follower_count = user_info.follower_count or 0
    account.following_count = user_info.following_count or 0
    account.last_active = datetime.now()
    account.save()

    _log(username, "login", f"@{username} connected successfully")
    return {"status": "connected", **_account_to_dict(account)}


def _restore_client(account: InstagramAccount) -> Client:
    """Return an authenticated Client from a saved session."""
    if not account.session_data:
        raise ValueError(f"No session for @{account.username}. Please reconnect.")

    cl = Client()
    cl.set_settings(json.loads(account.session_data))

    try:
        # Quick validation — raises LoginRequired if the token is dead
        cl.get_timeline_feed()
    except LoginRequired:
        account.status = "disconnected"
        account.save()
        raise ValueError(f"Session for @{account.username} has expired. Please reconnect.")
    except Exception:
        pass  # Network blip — let the actual operation fail with its own error

    return cl


# ── Login flow ────────────────────────────────────────────────────────────────

def login_account(username: str, password: str) -> dict:
    """
    Attempt an Instagram login.

    Returns one of:
      {"status": "connected", ...account fields...}
      {"status": "2fa_required",       "pending_id": str}
      {"status": "challenge_required", "pending_id": str, "challenge_type": "email"|"sms"}
    Raises ValueError on bad credentials or unexpected errors.
    """
    cl = Client()
    try:
        cl.login(username, password)
        return _save_session(cl, username)

    except TwoFactorRequired as e:
        pending_id = str(uuid.uuid4())
        PENDING_LOGINS[pending_id] = {
            "client": cl,
            "username": username,
            "type": "2fa",
            "two_factor_identifier": getattr(e, "two_factor_identifier", None),
            "expires_at": datetime.now().timestamp() + 600,  # 10-min TTL
        }
        return {"status": "2fa_required", "pending_id": pending_id}

    except ChallengeRequired:
        pending_id = str(uuid.uuid4())
        challenge_type = "email"
        try:
            challenge_info = cl.last_json.get("challenge", {})
            challenge_url = challenge_info.get("url", "")
            # Ask Instagram to send the code
            if challenge_url:
                cl.challenge_resolve(challenge_url)
            challenge_context = cl.last_json.get("step_data", {})
            if "phone_number" in challenge_context:
                challenge_type = "sms"
        except Exception:
            pass

        PENDING_LOGINS[pending_id] = {
            "client": cl,
            "username": username,
            "type": "challenge",
            "challenge_type": challenge_type,
            "expires_at": datetime.now().timestamp() + 600,
        }
        return {
            "status": "challenge_required",
            "pending_id": pending_id,
            "challenge_type": challenge_type,
        }

    except BadCredentials:
        raise ValueError("Incorrect username or password.")
    except Exception as e:
        raise ValueError(f"Login failed: {str(e)}")


def complete_2fa(pending_id: str, code: str) -> dict:
    """Finish login by submitting a TOTP / SMS 2FA code."""
    pending = PENDING_LOGINS.get(pending_id)
    if not pending or datetime.now().timestamp() > pending.get("expires_at", 0):
        raise ValueError("Login session expired. Please start over.")

    cl: Client = pending["client"]
    username: str = pending["username"]
    identifier = pending.get("two_factor_identifier")

    try:
        kwargs = {"two_factor_identifier": identifier} if identifier else {}
        cl.two_factor_login(code.strip(), **kwargs)
        PENDING_LOGINS.pop(pending_id, None)
        return _save_session(cl, username)
    except Exception as e:
        raise ValueError(f"Invalid code: {str(e)}")


def complete_challenge(pending_id: str, code: str) -> dict:
    """Finish login by submitting an email/SMS challenge code."""
    pending = PENDING_LOGINS.get(pending_id)
    if not pending or datetime.now().timestamp() > pending.get("expires_at", 0):
        raise ValueError("Login session expired. Please start over.")

    cl: Client = pending["client"]
    username: str = pending["username"]

    try:
        cl.challenge_send_security_code(code.strip())
        PENDING_LOGINS.pop(pending_id, None)
        return _save_session(cl, username)
    except Exception as e:
        raise ValueError(f"Challenge verification failed: {str(e)}")


# ── Account management ────────────────────────────────────────────────────────

def get_all_accounts() -> list:
    accounts = InstagramAccount.select().order_by(InstagramAccount.created_at.desc())
    return [_account_to_dict(a) for a in accounts]


def remove_account(account_id: str):
    try:
        account = InstagramAccount.get_by_id(account_id)
        username = account.username
        account.delete_instance(recursive=True)
        _log(username, "remove", f"@{username} account removed")
    except InstagramAccount.DoesNotExist:
        raise ValueError("Account not found")


# ── Posting ───────────────────────────────────────────────────────────────────

def post_media(account_id: str, media_path: str, caption: str, post_type: str = "reel") -> dict:
    """
    Post a video or image to Instagram immediately.

    post_type: "reel" → clip_upload  |  "photo" → photo_upload
    """
    try:
        account = InstagramAccount.get_by_id(account_id)
    except InstagramAccount.DoesNotExist:
        raise ValueError("Account not found")

    if account.status != "connected":
        raise ValueError(f"@{account.username} is not connected. Please reconnect.")

    if not os.path.exists(media_path):
        raise ValueError(f"Media file not found at: {media_path}")

    cl = _restore_client(account)
    path = Path(media_path)

    try:
        if post_type == "reel":
            media = cl.clip_upload(path, caption=caption)
        elif post_type == "photo":
            media = cl.photo_upload(path, caption=caption)
        else:
            raise ValueError(f"Unsupported post type: {post_type}")

        account.last_active = datetime.now()
        account.save()

        post_url = f"https://www.instagram.com/p/{media.code}/"
        _log(account.username, "post", f"Posted {post_type} to @{account.username}", {"url": post_url})

        return {"status": "posted", "post_id": str(media.pk), "post_url": post_url}

    except Exception as e:
        _log(account.username, "error", f"Post failed: {str(e)}")
        raise ValueError(f"Posting failed: {str(e)}")
