"""Pydantic schemas for request/response validation — Instagram & Automation only."""
from pydantic import BaseModel
from datetime import datetime
from typing import List, Optional


# == Instagram / Publish ==

class LoginRequest(BaseModel):
    username: str
    password: str


class VerifyRequest(BaseModel):
    pending_id: str
    code: str


class PostRequest(BaseModel):
    account_id: str
    media_path: str   # server-side absolute path
    caption: str = ""
    post_type: str = "reel"  # reel | photo


class ScheduleRequest(BaseModel):
    account_id: str
    media_path: str
    caption: str = ""
    post_type: str = "reel"
    scheduled_at: datetime


class AccountResponse(BaseModel):
    id: str
    username: str
    full_name: str
    avatar_url: str | None
    status: str
    follower_count: int
    following_count: int
    last_active: str | None
    created_at: str


class ScheduledPostResponse(BaseModel):
    id: str
    account_username: str
    post_type: str
    caption: str
    scheduled_at: str
    status: str
    error_message: str | None
    posted_at: str | None


class ActivityLogEntry(BaseModel):
    id: str
    account_username: str | None
    action_type: str
    message: str
    created_at: str


# == OAuth ==

class OAuthConnectResponse(BaseModel):
    auth_url: str


# == Growth / Automation ==

class AutoReplyRuleResponse(BaseModel):
    id: str
    trigger_keyword: str
    reply_template: str
    is_active: bool
    created_at: str


class DMRuleResponse(BaseModel):
    id: str
    message_template: str
    is_active: bool
    created_at: str


class FollowerSnapshotResponse(BaseModel):
    snapshot_id: str
    follower_count: int
    gained: List[dict]
    lost: List[dict]
    previous_count: Optional[int]
    taken_at: str


# == Gemini stubs (kept for gemini.py import compatibility) ==

class SlideData(BaseModel):
    """A single slide with title and content."""
    title: str
    content: str


class TopicSlideData(BaseModel):
    """A single slide spec produced from a topic, ready for rendering."""
    slide_type: str   # "cover" | "content" | "end"
    title: str
    body: str = ""
    pexels_query: str = ""


class CarouselSlideItem(BaseModel):
    """A single slide in the new text-paste carousel system."""
    type: str           # "cover" | "content" | "cta"
    number_label: str   # "01", "02", ...
    title: str
    body: str
