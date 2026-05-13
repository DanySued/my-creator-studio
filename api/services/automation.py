"""
Instagram automation service: comment auto-reply (template + Gemini AI),
follower snapshot/diff, and welcome DMs to new followers.

Template rules fire first — if none match, Gemini generates a context-aware reply.
"""
import json
import os
import random
import time
import uuid
import logging
from typing import Optional

from datetime import date as _date
from models.database import (
    AutoReplyRule,
    AutoDMRule,
    FollowerSnapshot,
    InstagramAccount,
    ActivityLog,
    DailyActionCount,
)
from services.instagram import _restore_client, _log

logger = logging.getLogger("automation")

# ── Helpers ───────────────────────────────────────────────────────────────────

def _pick_variant(template: str) -> str:
    """Support '|'-separated reply variants for variety."""
    parts = [v.strip() for v in template.split("|") if v.strip()]
    return random.choice(parts) if parts else template


def _gemini_reply(comment_text: str, post_caption: str = "") -> str:
    """Generate a warm, concise reply using Gemini."""
    try:
        import google.generativeai as genai
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            return "Thanks for your comment! 🙏"
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel("gemini-2.0-flash")
        prompt = (
            "You are a friendly Instagram creator. "
            "Reply to this comment in 1-2 short, warm sentences. "
            "Be genuine and conversational. No hashtags.\n\n"
            f"Post caption: {post_caption[:200]}\n"
            f"Comment: {comment_text}"
        )
        resp = model.generate_content(prompt)
        return resp.text.strip()
    except Exception as e:
        logger.warning(f"Gemini reply failed: {e}")
        return "Thanks for your comment! 🙏"


# ── Auto-reply rules ──────────────────────────────────────────────────────────

def list_reply_rules(account_id: str) -> list[dict]:
    account = InstagramAccount.get_by_id(account_id)
    rules = AutoReplyRule.select().where(AutoReplyRule.account == account)
    return [
        {
            "id": r.id,
            "trigger_keyword": r.trigger_keyword,
            "reply_template": r.reply_template,
            "is_active": r.is_active,
            "created_at": r.created_at.isoformat(),
        }
        for r in rules
    ]


def add_reply_rule(account_id: str, trigger_keyword: str, reply_template: str) -> dict:
    account = InstagramAccount.get_by_id(account_id)
    rule = AutoReplyRule.create(
        id=str(uuid.uuid4()),
        account=account,
        trigger_keyword=trigger_keyword.lower().strip(),
        reply_template=reply_template,
    )
    return {"id": rule.id, "trigger_keyword": rule.trigger_keyword, "reply_template": rule.reply_template}


def delete_reply_rule(rule_id: str):
    AutoReplyRule.delete().where(AutoReplyRule.id == rule_id).execute()


def toggle_reply_rule(rule_id: str, is_active: bool):
    AutoReplyRule.update(is_active=is_active).where(AutoReplyRule.id == rule_id).execute()


# ── Comment processing ────────────────────────────────────────────────────────

def process_post_comments(
    account_id: str,
    media_id: str,
    use_ai: bool = True,
    post_caption: str = "",
) -> dict:
    """
    Fetch comments on a post, match against rules (templates first),
    fall back to Gemini AI, and reply to all unhandled comments.

    Returns a summary dict.
    """
    try:
        account = InstagramAccount.get_by_id(account_id)
    except InstagramAccount.DoesNotExist:
        raise ValueError("Account not found")

    cl = _restore_client(account)

    # Fetch active rules for this account
    rules = list(
        AutoReplyRule.select().where(
            AutoReplyRule.account == account,
            AutoReplyRule.is_active == True,
        )
    )

    # Fetch previously replied comment IDs from activity log
    already_replied = set(
        row.extra_data
        for row in ActivityLog.select(ActivityLog.extra_data).where(
            ActivityLog.account_username == account.username,
            ActivityLog.action_type == "reply_comment",
            ActivityLog.extra_data != None,
        )
    )

    try:
        raw_comments = cl.media_comments(media_id, amount=50)
    except Exception as e:
        raise ValueError(f"Could not fetch comments: {e}")

    replied = 0
    skipped = 0
    errors = 0

    for c in raw_comments:
        cid = str(c.pk)
        if cid in already_replied:
            skipped += 1
            continue
        if c.user.username == account.username:
            already_replied.add(cid)
            continue

        reply_text = None
        matched_rule = False

        # Template rules first
        comment_lower = c.text.lower()
        for rule in rules:
            kw = rule.trigger_keyword
            if kw == "*" or kw in comment_lower:
                reply_text = _pick_variant(rule.reply_template)
                matched_rule = True
                break

        # Gemini fallback if no template matched and AI is enabled
        if not reply_text and use_ai:
            reply_text = _gemini_reply(c.text, post_caption)

        if reply_text:
            try:
                cl.media_comment(media_id, reply_text, replied_to_comment_id=int(cid))
                already_replied.add(cid)
                replied += 1
                _log(
                    account.username,
                    "reply_comment",
                    f"Replied to @{c.user.username}: {reply_text[:60]}",
                    extra={"comment_id": cid},
                )
                # Store comment id in extra_data for dedup on next run
                ActivityLog.create(
                    id=str(uuid.uuid4()),
                    account_username=account.username,
                    action_type="reply_comment",
                    message=f"replied to comment {cid}",
                    extra_data=cid,
                )
                time.sleep(random.uniform(3, 7))
            except Exception as e:
                errors += 1
                logger.error(f"Failed to reply to comment {cid}: {e}")

    return {
        "replied": replied,
        "skipped_already_replied": skipped,
        "errors": errors,
        "ai_enabled": use_ai,
    }


# ── Follower snapshots ────────────────────────────────────────────────────────

def take_follower_snapshot(account_id: str) -> dict:
    """
    Fetch the current follower list, store a snapshot, and return a diff
    vs. the previous snapshot (gained / lost).
    """
    try:
        account = InstagramAccount.get_by_id(account_id)
    except InstagramAccount.DoesNotExist:
        raise ValueError("Account not found")

    cl = _restore_client(account)

    try:
        followers_map = cl.user_followers(cl.user_id, amount=5000)
    except Exception as e:
        raise ValueError(f"Could not fetch followers: {e}")

    current_ids = set(str(uid) for uid in followers_map.keys())
    current_usernames = {str(uid): u.username for uid, u in followers_map.items()}

    # Save new snapshot
    snap = FollowerSnapshot.create(
        id=str(uuid.uuid4()),
        account=account,
        follower_ids=json.dumps(list(current_ids)),
        follower_count=len(current_ids),
    )

    # Compare to previous snapshot
    previous = (
        FollowerSnapshot.select()
        .where(FollowerSnapshot.account == account, FollowerSnapshot.id != snap.id)
        .order_by(FollowerSnapshot.taken_at.desc())
        .first()
    )

    gained = []
    lost = []

    if previous:
        prev_ids = set(json.loads(previous.follower_ids))
        gained_ids = current_ids - prev_ids
        lost_ids = prev_ids - current_ids
        gained = [{"id": uid, "username": current_usernames.get(uid, uid)} for uid in gained_ids]
        lost = [{"id": uid, "username": uid} for uid in lost_ids]  # username no longer fetchable

    _log(account.username, "follower_snapshot",
         f"Snapshot taken: {len(current_ids)} followers, +{len(gained)} -{len(lost)}")

    return {
        "snapshot_id": snap.id,
        "follower_count": len(current_ids),
        "gained": gained,
        "lost": lost,
        "previous_count": len(json.loads(previous.follower_ids)) if previous else None,
        "taken_at": snap.taken_at.isoformat(),
    }


def get_latest_snapshot(account_id: str) -> Optional[dict]:
    """Return the most recent follower snapshot for an account, or None."""
    try:
        account = InstagramAccount.get_by_id(account_id)
    except InstagramAccount.DoesNotExist:
        raise ValueError("Account not found")

    snap = (
        FollowerSnapshot.select()
        .where(FollowerSnapshot.account == account)
        .order_by(FollowerSnapshot.taken_at.desc())
        .first()
    )
    if not snap:
        return None

    prev = (
        FollowerSnapshot.select()
        .where(FollowerSnapshot.account == account, FollowerSnapshot.id != snap.id)
        .order_by(FollowerSnapshot.taken_at.desc())
        .first()
    )

    gained = []
    lost = []
    if prev:
        curr_ids = set(json.loads(snap.follower_ids))
        prev_ids = set(json.loads(prev.follower_ids))
        gained = [{"id": uid} for uid in curr_ids - prev_ids]
        lost = [{"id": uid} for uid in prev_ids - curr_ids]

    return {
        "snapshot_id": snap.id,
        "follower_count": snap.follower_count,
        "gained": gained,
        "lost": lost,
        "previous_count": prev.follower_count if prev else None,
        "taken_at": snap.taken_at.isoformat(),
    }


# ── Auto-DM rules ─────────────────────────────────────────────────────────────

def list_dm_rules(account_id: str) -> list[dict]:
    account = InstagramAccount.get_by_id(account_id)
    rules = AutoDMRule.select().where(AutoDMRule.account == account)
    return [
        {
            "id": r.id,
            "message_template": r.message_template,
            "is_active": r.is_active,
            "created_at": r.created_at.isoformat(),
        }
        for r in rules
    ]


def add_dm_rule(account_id: str, message_template: str) -> dict:
    account = InstagramAccount.get_by_id(account_id)
    rule = AutoDMRule.create(
        id=str(uuid.uuid4()),
        account=account,
        message_template=message_template,
    )
    return {"id": rule.id, "message_template": rule.message_template}


def delete_dm_rule(rule_id: str):
    AutoDMRule.delete().where(AutoDMRule.id == rule_id).execute()


def toggle_dm_rule(rule_id: str, is_active: bool):
    AutoDMRule.update(is_active=is_active).where(AutoDMRule.id == rule_id).execute()


# ── Welcome DMs ───────────────────────────────────────────────────────────────

def send_welcome_dms(account_id: str) -> dict:
    """
    Compare the two most recent follower snapshots, find new followers since
    the last snapshot, and send them the active DM template.

    Returns a summary of DMs sent.
    """
    try:
        account = InstagramAccount.get_by_id(account_id)
    except InstagramAccount.DoesNotExist:
        raise ValueError("Account not found")

    # Get active DM rule
    rule = (
        AutoDMRule.select()
        .where(AutoDMRule.account == account, AutoDMRule.is_active == True)
        .first()
    )
    if not rule:
        raise ValueError("No active DM template found. Add one first.")

    # Get the two most recent snapshots
    snapshots = list(
        FollowerSnapshot.select()
        .where(FollowerSnapshot.account == account)
        .order_by(FollowerSnapshot.taken_at.desc())
        .limit(2)
    )
    if len(snapshots) < 2:
        raise ValueError(
            "Need at least 2 follower snapshots to detect new followers. "
            "Take a snapshot now and again after some time, then run this."
        )

    latest, previous = snapshots[0], snapshots[1]
    current_ids = set(json.loads(latest.follower_ids))
    prev_ids = set(json.loads(previous.follower_ids))
    new_follower_ids = list(current_ids - prev_ids)

    if not new_follower_ids:
        return {"sent": 0, "skipped": 0, "message": "No new followers since last snapshot."}

    cl = _restore_client(account)

    sent = 0
    errors = 0
    for uid in new_follower_ids:
        try:
            user_info = cl.user_info(int(uid))
            username = user_info.username
            message = rule.message_template.replace("{username}", username)
            cl.direct_send(message, user_ids=[int(uid)])
            sent += 1
            _log(account.username, "welcome_dm", f"Welcome DM sent to @{username}")
            time.sleep(random.uniform(5, 12))
        except Exception as e:
            errors += 1
            logger.error(f"Failed to DM new follower {uid}: {e}")

    return {
        "sent": sent,
        "errors": errors,
        "new_followers_found": len(new_follower_ids),
    }


# ── Daily limit helpers ───────────────────────────────────────────────────────

SAFE_DAILY_LIMITS = {
    "like": 150,
    "follow": 60,
    "unfollow": 60,
    "comment": 30,
}


def _today() -> str:
    return _date.today().isoformat()


def _get_daily_count(account: InstagramAccount, action_type: str) -> int:
    row = DailyActionCount.get_or_none(
        DailyActionCount.account == account,
        DailyActionCount.action_type == action_type,
        DailyActionCount.date == _today(),
    )
    return row.count if row else 0


def _increment_daily(account: InstagramAccount, action_type: str, by: int = 1):
    today = _today()
    row, created = DailyActionCount.get_or_create(
        account=account,
        action_type=action_type,
        date=today,
        defaults={"id": str(uuid.uuid4()), "count": 0},
    )
    row.count += by
    row.save()


# ── Growth actions ────────────────────────────────────────────────────────────

def auto_like_hashtag(
    account_id: str,
    hashtag: str,
    amount: int = 20,
    daily_limit: int = SAFE_DAILY_LIMITS["like"],
) -> dict:
    """Like recent posts from a hashtag, respecting the daily limit."""
    account = InstagramAccount.get_by_id(account_id)
    cl = _restore_client(account)

    done_today = _get_daily_count(account, "like")
    remaining = max(0, daily_limit - done_today)
    if remaining == 0:
        return {"liked": 0, "skipped": amount, "reason": "Daily like limit reached."}

    to_like = min(amount, remaining)
    medias = cl.hashtag_medias_recent(hashtag.lstrip("#"), amount=to_like * 2)

    liked = 0
    for media in medias:
        if liked >= to_like:
            break
        try:
            cl.media_like(str(media.pk))
            liked += 1
            _increment_daily(account, "like")
            _log(account.username, "like", f"Liked post {media.pk} from #{hashtag}")
            time.sleep(random.uniform(3, 8))
        except Exception as e:
            logger.error(f"Like failed for {media.pk}: {e}")

    return {"liked": liked, "done_today": done_today + liked, "daily_limit": daily_limit}


def auto_follow_hashtag(
    account_id: str,
    hashtag: str,
    amount: int = 10,
    daily_limit: int = SAFE_DAILY_LIMITS["follow"],
) -> dict:
    """Follow users who recently posted under a hashtag."""
    account = InstagramAccount.get_by_id(account_id)
    cl = _restore_client(account)

    done_today = _get_daily_count(account, "follow")
    remaining = max(0, daily_limit - done_today)
    if remaining == 0:
        return {"followed": 0, "reason": "Daily follow limit reached."}

    to_follow = min(amount, remaining)
    medias = cl.hashtag_medias_recent(hashtag.lstrip("#"), amount=to_follow * 2)

    followed = 0
    for media in medias:
        if followed >= to_follow:
            break
        try:
            cl.user_follow(media.user.pk)
            followed += 1
            _increment_daily(account, "follow")
            _log(account.username, "follow", f"Followed @{media.user.username} from #{hashtag}")
            time.sleep(random.uniform(5, 12))
        except Exception as e:
            logger.error(f"Follow failed for {media.user.username}: {e}")

    return {"followed": followed, "done_today": done_today + followed, "daily_limit": daily_limit}


def auto_unfollow_non_followers(
    account_id: str,
    amount: int = 20,
    daily_limit: int = SAFE_DAILY_LIMITS["unfollow"],
) -> dict:
    """Unfollow users who don't follow back."""
    account = InstagramAccount.get_by_id(account_id)
    cl = _restore_client(account)

    done_today = _get_daily_count(account, "unfollow")
    remaining = max(0, daily_limit - done_today)
    if remaining == 0:
        return {"unfollowed": 0, "reason": "Daily unfollow limit reached."}

    to_unfollow = min(amount, remaining)

    following = cl.user_following(cl.user_id, amount=to_unfollow * 3)
    followers = cl.user_followers(cl.user_id, amount=500)
    followers_set = set(followers.keys())

    unfollowed = 0
    for uid, user in following.items():
        if unfollowed >= to_unfollow:
            break
        if uid in followers_set:
            continue  # They follow back — skip
        try:
            cl.user_unfollow(uid)
            unfollowed += 1
            _increment_daily(account, "unfollow")
            _log(account.username, "unfollow", f"Unfollowed @{user.username} (non-follower)")
            time.sleep(random.uniform(5, 12))
        except Exception as e:
            logger.error(f"Unfollow failed for {user.username}: {e}")

    return {"unfollowed": unfollowed, "done_today": done_today + unfollowed, "daily_limit": daily_limit}


def auto_comment_hashtag(
    account_id: str,
    hashtag: str,
    comments: list[str],
    amount: int = 5,
    daily_limit: int = SAFE_DAILY_LIMITS["comment"],
) -> dict:
    """Leave random comments on recent posts from a hashtag."""
    if not comments:
        raise ValueError("Provide at least one comment text.")
    account = InstagramAccount.get_by_id(account_id)
    cl = _restore_client(account)

    done_today = _get_daily_count(account, "comment")
    remaining = max(0, daily_limit - done_today)
    if remaining == 0:
        return {"commented": 0, "reason": "Daily comment limit reached."}

    to_comment = min(amount, remaining)
    medias = cl.hashtag_medias_recent(hashtag.lstrip("#"), amount=to_comment * 2)

    commented = 0
    for media in medias:
        if commented >= to_comment:
            break
        text = random.choice(comments)
        try:
            cl.media_comment(str(media.pk), text)
            commented += 1
            _increment_daily(account, "comment")
            _log(account.username, "comment", f"Commented on {media.pk} from #{hashtag}: {text[:60]}")
            time.sleep(random.uniform(10, 20))
        except Exception as e:
            logger.error(f"Comment failed on {media.pk}: {e}")

    return {"commented": commented, "done_today": done_today + commented, "daily_limit": daily_limit}


def get_daily_counts(account_id: str) -> dict:
    """Return today's action counts for all action types."""
    account = InstagramAccount.get_by_id(account_id)
    today = _today()
    rows = DailyActionCount.select().where(
        DailyActionCount.account == account,
        DailyActionCount.date == today,
    )
    counts = {at: 0 for at in SAFE_DAILY_LIMITS}
    for row in rows:
        counts[row.action_type] = row.count
    return {"counts": counts, "limits": SAFE_DAILY_LIMITS, "date": today}


# ── DM to commenters ──────────────────────────────────────────────────────────

def send_dm_to_commenters(
    account_id: str,
    media_id: str,
    message: str,
    amount: int = 20,
) -> dict:
    """Send a DM to everyone who commented on a post (skips own comments)."""
    account = InstagramAccount.get_by_id(account_id)
    cl = _restore_client(account)

    try:
        raw_comments = cl.media_comments(media_id, amount=amount)
    except Exception as e:
        raise ValueError(f"Could not fetch comments: {e}")

    seen_users: set[str] = set()
    sent = 0
    errors = 0

    for c in raw_comments:
        username = c.user.username
        uid = str(c.user.pk)
        if username == account.username or uid in seen_users:
            continue
        seen_users.add(uid)
        try:
            cl.direct_send(message, user_ids=[int(uid)])
            sent += 1
            _log(account.username, "dm_commenter", f"DM sent to @{username}")
            time.sleep(random.uniform(5, 12))
        except Exception as e:
            errors += 1
            logger.error(f"DM failed for @{username}: {e}")

    return {"sent": sent, "errors": errors, "unique_commenters": len(seen_users)}


# ── Activity log ──────────────────────────────────────────────────────────────

def get_activity_log(account_id: str, limit: int = 100) -> list[dict]:
    """Return recent automation activity for an account."""
    account = InstagramAccount.get_by_id(account_id)
    logs = (
        ActivityLog.select()
        .where(ActivityLog.account_username == account.username)
        .order_by(ActivityLog.created_at.desc())
        .limit(limit)
    )
    return [
        {
            "id": log.id,
            "action_type": log.action_type,
            "message": log.message,
            "created_at": log.created_at.isoformat(),
        }
        for log in logs
    ]
