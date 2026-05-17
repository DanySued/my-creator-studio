"""
Automation router: comment auto-reply rules, follower tracking, welcome DMs.
All endpoints are prefixed with /automation (registered in main.py).
"""
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional

from services.automation import (
    list_reply_rules,
    add_reply_rule,
    delete_reply_rule,
    toggle_reply_rule,
    process_post_comments,
    take_follower_snapshot,
    get_latest_snapshot,
    list_dm_rules,
    add_dm_rule,
    delete_dm_rule,
    toggle_dm_rule,
    send_welcome_dms,
    auto_like_hashtag,
    auto_follow_hashtag,
    auto_unfollow_non_followers,
    auto_comment_hashtag,
    get_daily_counts,
    send_dm_to_commenters,
    get_activity_log,
)

router = APIRouter()


# ── Request bodies ────────────────────────────────────────────────────────────

class AddReplyRuleRequest(BaseModel):
    account_id: str
    trigger_keyword: str = "*"   # "*" = match any comment
    reply_template: str          # Use "|" to separate variants


class ToggleRuleRequest(BaseModel):
    is_active: bool


class ProcessCommentsRequest(BaseModel):
    account_id: str
    media_id: str
    use_ai: bool = True
    post_caption: str = ""


class AddDMRuleRequest(BaseModel):
    account_id: str
    message_template: str   # Use {username} as a placeholder


# ── Auto-reply rules ──────────────────────────────────────────────────────────

@router.get("/autoreply/rules/{account_id}")
async def get_reply_rules(account_id: str):
    """Return all auto-reply rules for an account."""
    try:
        return list_reply_rules(account_id)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/autoreply/rules")
async def create_reply_rule(req: AddReplyRuleRequest):
    """Add a new auto-reply rule (template-based, keyword-triggered)."""
    try:
        return add_reply_rule(req.account_id, req.trigger_keyword, req.reply_template)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/autoreply/rules/{rule_id}")
async def remove_reply_rule(rule_id: str):
    """Delete an auto-reply rule."""
    try:
        delete_reply_rule(rule_id)
        return {"status": "deleted"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.patch("/autoreply/rules/{rule_id}/toggle")
async def toggle_reply_rule_endpoint(rule_id: str, req: ToggleRuleRequest):
    """Enable or disable an auto-reply rule."""
    try:
        toggle_reply_rule(rule_id, req.is_active)
        return {"status": "updated"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ── Comment processing ────────────────────────────────────────────────────────

@router.post("/autoreply/run")
async def run_auto_reply(req: ProcessCommentsRequest):
    """
    Fetch new comments on a post and reply automatically.
    Template rules fire first; Gemini AI handles the rest if use_ai is true.
    """
    try:
        return process_post_comments(
            req.account_id,
            req.media_id,
            use_ai=req.use_ai,
            post_caption=req.post_caption,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Auto-reply failed: {str(e)}")


# ── Follower snapshots ────────────────────────────────────────────────────────

@router.post("/followers/snapshot/{account_id}")
async def snapshot_followers(account_id: str):
    """
    Take a fresh follower snapshot and return the diff vs. the previous one.
    Shows which users followed and unfollowed since last time.
    """
    try:
        return take_follower_snapshot(account_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Snapshot failed: {str(e)}")


@router.get("/followers/snapshot/{account_id}")
async def get_follower_snapshot(account_id: str):
    """Return the latest follower snapshot and its diff vs. the previous one."""
    try:
        snap = get_latest_snapshot(account_id)
        if not snap:
            return {"snapshot": None, "message": "No snapshots yet. Take one first."}
        return snap
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ── Auto-DM rules ─────────────────────────────────────────────────────────────

@router.get("/dm/rules/{account_id}")
async def get_dm_rules(account_id: str):
    """Return all DM templates for an account."""
    try:
        return list_dm_rules(account_id)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/dm/rules")
async def create_dm_rule(req: AddDMRuleRequest):
    """Add a new welcome DM template. Use {username} as a placeholder."""
    try:
        return add_dm_rule(req.account_id, req.message_template)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/dm/rules/{rule_id}")
async def remove_dm_rule(rule_id: str):
    """Delete a DM template."""
    try:
        delete_dm_rule(rule_id)
        return {"status": "deleted"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.patch("/dm/rules/{rule_id}/toggle")
async def toggle_dm_rule_endpoint(rule_id: str, req: ToggleRuleRequest):
    """Enable or disable a DM template."""
    try:
        toggle_dm_rule(rule_id, req.is_active)
        return {"status": "updated"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ── Welcome DM sending ────────────────────────────────────────────────────────

@router.post("/dm/send-to-new-followers/{account_id}")
async def send_to_new_followers(account_id: str):
    """
    Compare the two latest follower snapshots, find new followers,
    and send them the active welcome DM template.
    """
    try:
        return send_welcome_dms(account_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Welcome DM sending failed: {str(e)}")


# ── Growth actions ────────────────────────────────────────────────────────────

class GrowthLikeRequest(BaseModel):
    account_id: str
    hashtag: str
    amount: int = 20
    daily_limit: int = 150


class GrowthFollowRequest(BaseModel):
    account_id: str
    hashtag: str
    amount: int = 10
    daily_limit: int = 60


class GrowthUnfollowRequest(BaseModel):
    account_id: str
    amount: int = 20
    daily_limit: int = 60


class GrowthCommentRequest(BaseModel):
    account_id: str
    hashtag: str
    comments: list[str]
    amount: int = 5
    daily_limit: int = 30


class DMCommentersRequest(BaseModel):
    account_id: str
    media_id: str
    message: str
    amount: int = 20


@router.post("/growth/like")
async def growth_auto_like(req: GrowthLikeRequest):
    """Auto-like recent posts from a hashtag (daily-limited)."""
    try:
        return auto_like_hashtag(req.account_id, req.hashtag, req.amount, req.daily_limit)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/growth/follow")
async def growth_auto_follow(req: GrowthFollowRequest):
    """Auto-follow users from a hashtag (daily-limited)."""
    try:
        return auto_follow_hashtag(req.account_id, req.hashtag, req.amount, req.daily_limit)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/growth/unfollow")
async def growth_auto_unfollow(req: GrowthUnfollowRequest):
    """Unfollow users who don't follow back (daily-limited)."""
    try:
        return auto_unfollow_non_followers(req.account_id, req.amount, req.daily_limit)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/growth/comment")
async def growth_auto_comment(req: GrowthCommentRequest):
    """Auto-comment on recent posts from a hashtag (daily-limited)."""
    try:
        return auto_comment_hashtag(req.account_id, req.hashtag, req.comments, req.amount, req.daily_limit)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/growth/counts/{account_id}")
async def get_growth_counts(account_id: str):
    """Return today's action counts vs. limits for all growth actions."""
    try:
        return get_daily_counts(account_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ── DM to commenters ──────────────────────────────────────────────────────────

@router.post("/dm/commenters")
async def dm_commenters(req: DMCommentersRequest):
    """Send a DM to everyone who commented on a post."""
    try:
        return send_dm_to_commenters(req.account_id, req.media_id, req.message, req.amount)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Activity log ──────────────────────────────────────────────────────────────

@router.get("/activity-log/{account_id}")
async def activity_log(account_id: str, limit: int = Query(100, ge=1, le=500)):
    """Return recent automation activity for an account."""
    try:
        return get_activity_log(account_id, limit=limit)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
