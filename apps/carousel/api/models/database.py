"""Database models for the Carousel app."""
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
    db = SqliteDatabase(os.path.join(_data_dir, "carousel.db"))


class BaseModel(Model):
    class Meta:
        database = db


class Carousel(BaseModel):
    id = CharField(primary_key=True)
    title = CharField()
    theme = CharField(default="midnight")
    slide_count = IntegerField()
    created_at = DateTimeField(default=datetime.now)

    class Meta:
        table_name = "carousels"


class CarouselSlide(BaseModel):
    id = CharField(primary_key=True)
    carousel = ForeignKeyField(Carousel, backref="slides")
    position = IntegerField()
    title = CharField()
    content = TextField()
    image_path = CharField()

    class Meta:
        table_name = "carousel_slides"


def init_db():
    db.create_tables([Carousel, CarouselSlide], safe=True)
