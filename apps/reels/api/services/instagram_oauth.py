"""
Instagram Platform API — OAuth 2.0 service.

Uses the "Instagram API with Instagram Login" flow (launched July 2024),
the official replacement for the deprecated Basic Display API (EOL Dec 2024).

References:
  https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/
  https://gist.github.com/PrenSJ2/0213e60e834e66b7e09f7f93999163fc

Requirements:
  - Instagram Professional account (Business or Creator)
  - Meta Developer app with Instagram Platform product enabled
  - Env vars: INSTAGRAM_APP_ID, INSTAGRAM_APP_SECRET, INSTAGRAM_REDIRECT_URI, FRONTEND_URL
"""

import json
import os
import uuid
import logging
from datetime import datetime, timedelta
from urllib.parse import urlencode
from typing import Optional

import httpx

from models.database import InstagramAccount, ActivityLog

logger = logging.getLogger("instagram_oauth")

GRAPH_BASE = "https://graph.instagram.com"
OAUTH_BASE = "https://api.instagram.com/oauth"

# Permissions needed for publishing + reading profile
SCOPES = "instagram_business_basic,instagram_business_content_publish"


# ── Helpers ────────────────────────────────────────────────────────────────────

def _log(username: Optional[str], action: str, msg: str):
    try:
        ActivityLog.create(
            id=str(uuid.uuid4()),
            account_username=username,
            action_type=action,
            message=msg,
        )
    except Exception:
        pass


def _account_to_dict(account: InstagramAccount) -> dict:
    return {
        "id": account.id,
        "username": account.username,
        "full_name": account.full_name or "",
        "avatar_url": account.avatar_url,
        "status": account.status,
        "auth_method": account.auth_method,
        "follower_count": account.follower_count,
        "following_count": account.following_count,
        "last_active": account.last_active.isoformat() if account.last_active else None,
        "created_at": account.created_at.isoformat(),
    }


# ── OAuth service ──────────────────────────────────────────────────────────────

class InstagramOAuthService:
    @property
    def app_id(self) -> Optional[str]:
        return os.getenv("INSTAGRAM_APP_ID")

    @property
    def app_secret(self) -> Optional[str]:
        return os.getenv("INSTAGRAM_APP_SECRET")

    @property
    def redirect_uri(self) -> str:
        return os.getenv(
            "INSTAGRAM_REDIRECT_URI",
            "http://localhost:8000/instagram/oauth/callback",
        )

    @property
    def frontend_url(self) -> str:
        return os.getenv("FRONTEND_URL", "http://localhost:3000")

    def is_configured(self) -> bool:
        return bool(self.app_id and self.app_secret)

    def get_auth_url(self, state: str = "") -> str:
        """
        Return the URL the user should be redirected to in order to
        authorise the app on Instagram.
        """
        if not self.is_configured():
            raise ValueError(
                "Instagram OAuth is not configured. "
                "Set INSTAGRAM_APP_ID and INSTAGRAM_APP_SECRET in your .env file."
            )
        params = {
            "client_id": self.app_id,
            "redirect_uri": self.redirect_uri,
            "scope": SCOPES,
            "response_type": "code",
        }
        if state:
            params["state"] = state
        return f"{OAUTH_BASE}/authorize?{urlencode(params)}"

    async def exchange_code_for_token(self, code: str) -> dict:
        """
        Exchange the short-lived authorization code for an access token,
        then immediately upgrade it to a long-lived token (~60 days).
        """
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(
                f"{OAUTH_BASE}/access_token",
                data={
                    "client_id": self.app_id,
                    "client_secret": self.app_secret,
                    "grant_type": "authorization_code",
                    "redirect_uri": self.redirect_uri,
                    "code": code,
                },
            )
            resp.raise_for_status()
            data = resp.json()

        if "access_token" not in data:
            raise ValueError(f"Token exchange failed: {data}")

        # Upgrade to long-lived token immediately
        long_lived = await self._get_long_lived_token(data["access_token"])
        data.update(long_lived)
        return data

    async def _get_long_lived_token(self, short_token: str) -> dict:
        """Swap a short-lived token for a 60-day long-lived token."""
        try:
            async with httpx.AsyncClient(timeout=15) as client:
                resp = await client.get(
                    f"{GRAPH_BASE}/access_token",
                    params={
                        "grant_type": "ig_exchange_token",
                        "client_secret": self.app_secret,
                        "access_token": short_token,
                    },
                )
                resp.raise_for_status()
                data = resp.json()

            if "expires_in" in data:
                data["expires_at"] = (
                    datetime.utcnow() + timedelta(seconds=data["expires_in"])
                ).isoformat()
            return data
        except Exception as e:
            logger.warning(f"Long-lived token exchange failed: {e}. Keeping short token.")
            return {"access_token": short_token}

    async def refresh_token(self, access_token: str) -> Optional[dict]:
        """Refresh a long-lived token before it expires (call at ~50 days)."""
        try:
            async with httpx.AsyncClient(timeout=15) as client:
                resp = await client.get(
                    f"{GRAPH_BASE}/refresh_access_token",
                    params={
                        "grant_type": "ig_refresh_token",
                        "access_token": access_token,
                    },
                )
                resp.raise_for_status()
                data = resp.json()

            if "expires_in" in data:
                data["expires_at"] = (
                    datetime.utcnow() + timedelta(seconds=data["expires_in"])
                ).isoformat()
            return data
        except Exception as e:
            logger.error(f"Token refresh failed: {e}")
            return None

    async def get_account_info(self, access_token: str) -> dict:
        """
        Fetch basic profile info from graph.instagram.com/me.
        Returns a dict with id, username, name, profile_picture_url, followers_count.
        """
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(
                f"{GRAPH_BASE}/me",
                params={
                    "fields": "id,username,name,profile_picture_url,followers_count,following_count,media_count,account_type",
                    "access_token": access_token,
                },
            )
            resp.raise_for_status()
            return resp.json()

    async def save_oauth_account(self, code: str) -> dict:
        """
        Full OAuth callback handler:
        1. Exchange code → access token
        2. Fetch account info
        3. Upsert InstagramAccount in the DB
        Returns the account dict.
        """
        token_data = await self.exchange_code_for_token(code)
        access_token = token_data["access_token"]

        ig_info = await self.get_account_info(access_token)

        username = ig_info.get("username", "")
        if not username:
            raise ValueError("Could not read Instagram username from token.")

        expires_at = None
        if token_data.get("expires_at"):
            try:
                expires_at = datetime.fromisoformat(token_data["expires_at"])
            except ValueError:
                pass

        account, _ = InstagramAccount.get_or_create(
            username=username,
            defaults={"id": str(uuid.uuid4())},
        )
        account.instagram_user_id = ig_info.get("id")
        account.access_token = access_token
        account.token_expires_at = expires_at
        account.auth_method = "oauth"
        account.status = "connected"
        account.avatar_url = ig_info.get("profile_picture_url")
        account.full_name = ig_info.get("name", username)
        account.follower_count = ig_info.get("followers_count", 0)
        account.following_count = ig_info.get("following_count", 0)
        account.last_active = datetime.now()
        account.save()

        _log(username, "oauth_connect", f"@{username} connected via Instagram OAuth")
        return {"status": "connected", **_account_to_dict(account)}


# ── Module-level singleton ─────────────────────────────────────────────────────

instagram_oauth = InstagramOAuthService()
