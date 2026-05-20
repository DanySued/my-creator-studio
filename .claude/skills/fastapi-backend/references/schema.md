# Database Models & Pydantic Schemas Reference

Source of truth: `api/models/database.py` and `api/models/schemas.py`.

---

## Peewee Models

### Carousel
```python
class Carousel(BaseModel):
    id = CharField(primary_key=True)        # uuid
    title = CharField()
    theme = CharField(default="midnight")
    slide_count = IntegerField()
    created_at = DateTimeField(default=datetime.now)
    # backref: slides -> CarouselSlide[]
```

### CarouselSlide
```python
class CarouselSlide(BaseModel):
    id = CharField(primary_key=True)
    carousel = ForeignKeyField(Carousel, backref="slides")
    position = IntegerField()               # 0-indexed
    title = CharField()
    content = TextField()
    image_path = CharField()               # path to PNG
```

### Reel
```python
class Reel(BaseModel):
    id = CharField(primary_key=True)
    title = CharField()
    keywords = TextField()                 # comma-separated
    duration = IntegerField()              # seconds
    audio_path = CharField()
    output_path = CharField()              # path to MP4
    srt_path = CharField(null=True)        # path to .srt (subtitles)
    created_at = DateTimeField(default=datetime.now)
```

### ReelJob
```python
class ReelJob(BaseModel):
    id = CharField(primary_key=True)
    reel = ForeignKeyField(Reel, backref="jobs", null=True)
    status = CharField(default="queued")   # queued|processing|awaiting_clip_approval|done|failed
    progress = IntegerField(default=0)     # 0-100
    error_message = TextField(null=True)
    clip_paths = TextField(null=True)      # JSON array of clip file paths
    pending_request_data = TextField(null=True)  # JSON-encoded ReelGenerateRequest
    created_at = DateTimeField(default=datetime.now)
    started_at = DateTimeField(null=True)
    completed_at = DateTimeField(null=True)
```

### AudioFile
```python
class AudioFile(BaseModel):
    id = CharField(primary_key=True)
    filename = CharField()
    file_path = CharField()
    duration = IntegerField()              # seconds
    uploaded_at = DateTimeField(default=datetime.now)
```

### InstagramAccount
```python
class InstagramAccount(BaseModel):
    id = CharField(primary_key=True)
    username = CharField(unique=True)
    session_data = TextField(null=True)        # instagrapi JSON settings
    instagram_user_id = CharField(null=True)   # numeric IG account ID
    access_token = TextField(null=True)        # Graph API token
    token_expires_at = DateTimeField(null=True)
    auth_method = CharField(default="password")  # "password" | "oauth"
    status = CharField(default="disconnected")   # connected | disconnected
    avatar_url = CharField(null=True)
    full_name = CharField(null=True)
    follower_count = IntegerField(default=0)
    following_count = IntegerField(default=0)
    last_active = DateTimeField(null=True)
    created_at = DateTimeField(default=datetime.now)
```

### ScheduledPost
```python
class ScheduledPost(BaseModel):
    id = CharField(primary_key=True)
    account = ForeignKeyField(InstagramAccount, backref="scheduled_posts")
    media_path = CharField()               # server-side absolute path
    caption = TextField(default="")
    post_type = CharField(default="reel")  # reel | photo
    scheduled_at = DateTimeField()
    status = CharField(default="pending")  # pending|posting|posted|failed|cancelled
    error_message = TextField(null=True)
    instagram_post_id = CharField(null=True)
    posted_at = DateTimeField(null=True)
    created_at = DateTimeField(default=datetime.now)
```

### ActivityLog
```python
class ActivityLog(BaseModel):
    id = CharField(primary_key=True)
    account_username = CharField(null=True)
    action_type = CharField()              # login|post|schedule|error|remove
    message = TextField()
    extra_data = TextField(null=True)      # JSON string
    created_at = DateTimeField(default=datetime.now)
```

### AutoReplyRule
```python
class AutoReplyRule(BaseModel):
    id = CharField(primary_key=True)
    account = ForeignKeyField(InstagramAccount, backref="reply_rules")
    trigger_keyword = CharField(default="*")  # "*" = match any comment
    reply_template = TextField()              # "|" separates variants
    is_active = BooleanField(default=True)
    created_at = DateTimeField(default=datetime.now)
```

### FollowerSnapshot
```python
class FollowerSnapshot(BaseModel):
    id = CharField(primary_key=True)
    account = ForeignKeyField(InstagramAccount, backref="follower_snapshots")
    follower_ids = TextField()             # JSON array of IG user IDs
    follower_count = IntegerField(default=0)
    taken_at = DateTimeField(default=datetime.now)
```

### AutoDMRule
```python
class AutoDMRule(BaseModel):
    id = CharField(primary_key=True)
    account = ForeignKeyField(InstagramAccount, backref="dm_rules")
    message_template = TextField()         # use {username} as placeholder
    is_active = BooleanField(default=True)
    created_at = DateTimeField(default=datetime.now)
```

### DailyActionCount
```python
class DailyActionCount(BaseModel):
    id = CharField(primary_key=True)
    account = ForeignKeyField(InstagramAccount, backref="daily_counts")
    action_type = CharField()              # like|follow|unfollow|comment
    date = CharField()                     # ISO date YYYY-MM-DD
    count = IntegerField(default=0)
    # unique_together: (account, action_type, date)
```

---

## Pydantic Schemas (Request/Response)

### Carousel Schemas
- `CarouselGenerateRequest`: content, slide_count=5, theme, title, tone
- `CarouselExportRequest`: carousel_id, theme, slides: List[SlideData]
- `CarouselFromTextRequest`: raw_text, theme, handle, font, size, slide_count=None
- `CarouselRenderRequest`: carousel_id=None, slides, theme, handle, size
- `CarouselGenerateResponse`: carousel_id, slides: List[SlideData]
- `CarouselResponse`: id, title, theme, slide_count, created_at
- `BulkCarouselRequest`: topic, carousel_count=3, slides_per_carousel=5, tone, top_label

### Reel Schemas
- `ReelGenerateRequest`: keywords: List[str], audio_file_id, duration=15, title, song_start_time=0, overlays=[], count=1, subtitles_enabled=False
- `ReelJobResponse`: job_id, reel_id, status, progress, phase, phase_progress, error_message, clip_count, created_at, completed_at, reels_done, reels_total, srt_path
- `ReelResponse`: id, title, keywords, duration, output_path, created_at
- `AudioUploadResponse`: id, filename, duration
- `TextOverlayItem`: text, x=50.0, y=82.0, font="sans", bold=False, italic=False

### Instagram / Publish Schemas
- `LoginRequest`: username, password
- `PostRequest`: account_id, media_path, caption="", post_type="reel"
- `ScheduleRequest`: account_id, media_path, caption, post_type, scheduled_at: datetime
- `AccountResponse`: id, username, full_name, avatar_url, status, follower_count, following_count, last_active, created_at
- `ScheduledPostResponse`: id, account_username, post_type, caption, scheduled_at, status, error_message, posted_at
- `ActivityLogEntry`: id, account_username, action_type, message, created_at
