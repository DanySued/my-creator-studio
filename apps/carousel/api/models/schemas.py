"""Pydantic schemas for the Carousel app."""
from pydantic import BaseModel
from datetime import datetime
from typing import List, Optional


class SlideData(BaseModel):
    title: str
    content: str


class CarouselGenerateRequest(BaseModel):
    content: str
    slide_count: int = 5
    theme: str = "midnight"
    title: str = "Generated Carousel"
    tone: str = "professional"


class PexelsPhotoItem(BaseModel):
    id: int
    thumb: str
    full: str
    photographer: str


class PexelsPhotoSearchResponse(BaseModel):
    photos: List[PexelsPhotoItem]


class CarouselExportRequest(BaseModel):
    carousel_id: str
    theme: str = "midnight"
    slides: List[SlideData]


class CarouselResponse(BaseModel):
    id: str
    title: str
    theme: str
    slide_count: int
    created_at: datetime


class CarouselHistoryResponse(BaseModel):
    carousels: List[CarouselResponse]


class CarouselGenerateResponse(BaseModel):
    carousel_id: str
    slides: List[SlideData]


class TopicSlideData(BaseModel):
    slide_type: str
    title: str
    body: str = ""
    pexels_query: str = ""


class BulkCarouselRequest(BaseModel):
    topic: str
    carousel_count: int = 3
    slides_per_carousel: int = 5
    tone: str = "casual"
    top_label: str = ""


class BulkCarouselResponse(BaseModel):
    carousel_count: int
    slides_per_carousel: int
    topic: str


class CarouselSlideItem(BaseModel):
    type: str
    number_label: str
    title: str
    body: str


class CarouselFromTextRequest(BaseModel):
    raw_text: str
    theme: str = "midnight"
    handle: str = ""
    font: str = "inter"
    size: str = "1080x1350"
    slide_count: Optional[int] = None


class CarouselFromTextResponse(BaseModel):
    carousel_id: str
    slides: List[CarouselSlideItem]


class CarouselRenderRequest(BaseModel):
    carousel_id: Optional[str] = None
    slides: List[CarouselSlideItem]
    theme: str = "midnight"
    handle: str = ""
    size: str = "1080x1350"
