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


class Carousel(BaseModel):
    """Stores carousel generation history and metadata."""
    id = CharField(primary_key=True)
    title = CharField()
    theme = CharField(default="thread")
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


def init_db():
    """Initialize database tables."""
    if not _DATABASE_URL:
        os.makedirs(os.path.dirname(db.database), exist_ok=True)
    db.create_tables([Carousel, CarouselSlide], safe=True)


if __name__ == "__main__":
    init_db()
