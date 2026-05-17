"""Database models for the Reels app."""
import os
import urllib.parse
from datetime import datetime
from peewee import Model, CharField, TextField, IntegerField, DateTimeField, ForeignKeyField

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
    db = SqliteDatabase(os.path.join(_data_dir, "reels.db"))


class BaseModel(Model):
    class Meta:
        database = db


class Reel(BaseModel):
    id = CharField(primary_key=True)
    title = CharField()
    keywords = TextField()
    duration = IntegerField()
    audio_path = CharField()
    output_path = CharField()
    srt_path = CharField(null=True)
    created_at = DateTimeField(default=datetime.now)

    class Meta:
        table_name = "reels"


class ReelJob(BaseModel):
    id = CharField(primary_key=True)
    reel = ForeignKeyField(Reel, backref="jobs", null=True)
    status = CharField(default="queued")
    progress = IntegerField(default=0)
    error_message = TextField(null=True)
    clip_paths = TextField(null=True)
    pending_request_data = TextField(null=True)
    created_at = DateTimeField(default=datetime.now)
    started_at = DateTimeField(null=True)
    completed_at = DateTimeField(null=True)

    class Meta:
        table_name = "reel_jobs"


class AudioFile(BaseModel):
    id = CharField(primary_key=True)
    filename = CharField()
    file_path = CharField()
    duration = IntegerField()
    uploaded_at = DateTimeField(default=datetime.now)

    class Meta:
        table_name = "audio_files"


def init_db():
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
