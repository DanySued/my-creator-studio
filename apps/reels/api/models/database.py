"""Database models using Peewee ORM — SQLite locally, PostgreSQL (Railway) in production."""
import os
import urllib.parse
from datetime import datetime
from peewee import Model, CharField, TextField, IntegerField, DateTimeField, ForeignKeyField

# Use PostgreSQL when DATABASE_URL is set (Railway/Supabase), else fall back to SQLite
_DATABASE_URL = os.getenv("DATABASE_URL")
if _DATABASE_URL:
    from playhouse.pool import PooledPostgresqlDatabase
    _p = urllib.parse.urlparse(_DATABASE_URL)
    db = PooledPostgresqlDatabase(
        _p.path.lstrip("/"),
        host=_p.hostname,
        port=_p.port or 5432,
        user=_p.username,
        password=_p.password,
        max_connections=10,
        stale_timeout=300,
    )
else:
    from peewee import SqliteDatabase
    _data_dir = os.getenv("DATA_DIR", "/data")
    db = SqliteDatabase(os.path.join(_data_dir, "studio.db"))


class BaseModel(Model):
    class Meta:
        database = db


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


def init_db():
    """Initialize database tables."""
    if not _DATABASE_URL:
        os.makedirs(os.path.dirname(db.database), exist_ok=True)
    db.create_tables([Reel, ReelJob, AudioFile], safe=True)
    for table, col, col_type in [
        ("reel_jobs", "clip_paths", "TEXT"),
        ("reel_jobs", "pending_request_data", "TEXT"),
        ("reels", "srt_path", "TEXT"),
    ]:
        try:
            db.execute_sql(f"ALTER TABLE {table} ADD COLUMN {col} {col_type}")
        except Exception:
            pass


if __name__ == "__main__":
    init_db()
