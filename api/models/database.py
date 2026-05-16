"""Database models using Peewee ORM — SQLite locally, PostgreSQL (Railway) in production."""
import os
import urllib.parse
from datetime import datetime
from peewee import Model, CharField, TextField, IntegerField, DateTimeField, ForeignKeyField, BooleanField

# Use PostgreSQL when DATABASE_URL is set (Railway/Supabase), else fall back to SQLite
_DATABASE_URL = os.getenv("DATABASE_URL")
if _DATABASE_URL:
    from peewee import PostgresqlDatabase
    _p = urllib.parse.urlparse(_DATABASE_URL)
    db = PostgresqlDatabase(
        _p.path.lstrip("/"),
        host=_p.hostname,
        port=_p.port or 5432,
        user=_p.username,
        password=_p.password,
    )
else:
    from peewee import SqliteDatabase
    _data_dir = os.getenv("DATA_DIR", "/data")
    db = SqliteDatabase(os.path.join(_data_dir, "studio.db"))


class BaseModel(Model):
    class Meta:
        database = db


class Carousel(BaseModel):
    """Stores carousel generation history and metadata."""
    id = CharField(primary_key=True)
    title = CharField()
    theme = CharField(default="midnight")
    slide_count = IntegerField()
    created_at = DateTimeField(default=datetime.now)

    class Meta:
        table_name = "carousels"


class CarouselSlide(BaseModel):
    """Individual slides within a carousel."""
    id = CharField(primary_key=True)
    carousel = ForeignKeyField(Carousel, backref="slides")
    position = IntegerField()  # 0-indexed slide number
    title = CharField()
    content = TextField()
    image_path = CharField()  # Path to PNG file

    class Meta:
        table_name = "carousel_slides"


class Reel(BaseModel):
    """Stores reel generation history and metadata."""
    id = CharField(primary_key=True)
    title = CharField()
    keywords = TextField()  # Comma-separated keywords
    duration = IntegerField()  # Video duration in seconds
    audio_path = CharField()  # Path to audio file
    output_path = CharField()  # Path to generated MP4
    srt_path = CharField(null=True)  # Path to generated .srt subtitle file (if subtitles were enabled)
    created_at = DateTimeField(default=datetime.now)

    class Meta:
        table_name = "reels"


class ReelJob(BaseModel):
    """Background job status for reel generation."""
    id = CharField(primary_key=True)
    reel = ForeignKeyField(Reel, backref="jobs", null=True)
    status = CharField(default="queued")  # queued, processing, awaiting_clip_approval, done, failed
    progress = IntegerField(default=0)  # 0-100
    error_message = TextField(null=True)
    clip_paths = TextField(null=True)           # JSON array of trimmed clip file paths
    pending_request_data = TextField(null=True) # JSON-encoded ReelGenerateRequest for phase 2
    created_at = DateTimeField(default=datetime.now)
    started_at = DateTimeField(null=True)
    completed_at = DateTimeField(null=True)

    class Meta:
        table_name = "reel_jobs"


class AudioFile(BaseModel):
    """Uploaded audio tracks for reels."""
    id = CharField(primary_key=True)
    filename = CharField()
    file_path = CharField()
    duration = IntegerField()  # Duration in seconds
    uploaded_at = DateTimeField(default=datetime.now)

    class Meta:
        table_name = "audio_files"


# ── Phase 4 ──────────────────────────────────────────────────────────────────

class InstagramAccount(BaseModel):
    """Connected Instagram account — supports both OAuth (official API) and instagrapi (private API)."""
    id = CharField(primary_key=True)
    username = CharField(unique=True)
    # ── instagrapi private-API session (username/password flow) ───────────────
    session_data = TextField(null=True)   # JSON-encoded instagrapi settings
    # ── Official Meta OAuth (Instagram Platform API) ─────────────────────────
    instagram_user_id = CharField(null=True)   # Numeric Instagram account ID
    access_token = TextField(null=True)         # Long-lived Graph API token (60 days)
    token_expires_at = DateTimeField(null=True)
    auth_method = CharField(default="password") # "password" | "oauth"
    # ── Shared profile fields ─────────────────────────────────────────────────
    status = CharField(default="disconnected")  # connected | disconnected
    avatar_url = CharField(null=True)
    full_name = CharField(null=True)
    follower_count = IntegerField(default=0)
    following_count = IntegerField(default=0)
    last_active = DateTimeField(null=True)
    created_at = DateTimeField(default=datetime.now)

    class Meta:
        table_name = "instagram_accounts"


class ScheduledPost(BaseModel):
    """A post queued for future publishing."""
    id = CharField(primary_key=True)
    account = ForeignKeyField(InstagramAccount, backref="scheduled_posts")
    media_path = CharField()             # Server-side path to MP4 or image
    caption = TextField(default="")
    post_type = CharField(default="reel")  # reel | photo
    scheduled_at = DateTimeField()
    status = CharField(default="pending")  # pending | posting | posted | failed | cancelled
    error_message = TextField(null=True)
    instagram_post_id = CharField(null=True)
    posted_at = DateTimeField(null=True)
    created_at = DateTimeField(default=datetime.now)

    class Meta:
        table_name = "scheduled_posts"


class ActivityLog(BaseModel):
    """Audit trail of all Instagram actions."""
    id = CharField(primary_key=True)
    account_username = CharField(null=True)
    action_type = CharField()   # login | post | schedule | error | remove
    message = TextField()
    extra_data = TextField(null=True)  # JSON string for extra context
    created_at = DateTimeField(default=datetime.now)

    class Meta:
        table_name = "activity_log"


# ── Automation (bot) ──────────────────────────────────────────────────────────

class AutoReplyRule(BaseModel):
    """Keyword-triggered comment reply rules. Template rules fire first; AI handles the rest."""
    id = CharField(primary_key=True)
    account = ForeignKeyField(InstagramAccount, backref="reply_rules")
    trigger_keyword = CharField(default="*")  # "*" = match any comment
    reply_template = TextField()              # Use "|" to separate variants
    is_active = BooleanField(default=True)
    created_at = DateTimeField(default=datetime.now)

    class Meta:
        table_name = "auto_reply_rules"


class FollowerSnapshot(BaseModel):
    """Point-in-time snapshot of an account's follower list for tracking gains/losses."""
    id = CharField(primary_key=True)
    account = ForeignKeyField(InstagramAccount, backref="follower_snapshots")
    follower_ids = TextField()   # JSON array of Instagram user IDs
    follower_count = IntegerField(default=0)
    taken_at = DateTimeField(default=datetime.now)

    class Meta:
        table_name = "follower_snapshots"


class AutoDMRule(BaseModel):
    """Welcome DM template sent automatically to new followers."""
    id = CharField(primary_key=True)
    account = ForeignKeyField(InstagramAccount, backref="dm_rules")
    message_template = TextField()   # The DM text; use {username} as a placeholder
    is_active = BooleanField(default=True)
    created_at = DateTimeField(default=datetime.now)

    class Meta:
        table_name = "auto_dm_rules"


class DailyActionCount(BaseModel):
    """Per-account, per-action-type daily counter for rate-limit enforcement."""
    id = CharField(primary_key=True)
    account = ForeignKeyField(InstagramAccount, backref="daily_counts")
    action_type = CharField()   # like | follow | unfollow | comment
    date = CharField()          # ISO date string YYYY-MM-DD
    count = IntegerField(default=0)

    class Meta:
        table_name = "daily_action_counts"
        indexes = (
            (("account", "action_type", "date"), True),  # unique together
        )


# Create tables on import
def init_db():
    """Initialize database tables."""
    if not _DATABASE_URL:
        os.makedirs(os.path.dirname(db.database), exist_ok=True)
    db.create_tables([
        Carousel, CarouselSlide,
        Reel, ReelJob, AudioFile,
        InstagramAccount, ScheduledPost, ActivityLog,
        AutoReplyRule, FollowerSnapshot, AutoDMRule, DailyActionCount,
    ], safe=True)
    # Safe migration: add columns that were added after initial schema creation
    for table, col, col_type in [
        ("reel_jobs", "clip_paths", "TEXT"),
        ("reel_jobs", "pending_request_data", "TEXT"),
        ("reels", "srt_path", "TEXT"),
    ]:
        try:
            db.execute_sql(f"ALTER TABLE {table} ADD COLUMN {col} {col_type}")
        except Exception:
            pass  # Column already exists


if __name__ == "__main__":
    init_db()
