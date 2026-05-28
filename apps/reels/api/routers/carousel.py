"""Carousel generation API endpoints."""
import asyncio
import os
import uuid
import json
from io import BytesIO
from typing import List

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse
import zipfile

from models.schemas import (
    BulkCarouselRequest,
    CarouselFromTextRequest,
    CarouselFromTextResponse,
    CarouselGenerateRequest,
    CarouselExportRequest,
    CarouselGenerateResponse,
    CarouselHistoryResponse,
    CarouselRenderRequest,
    CarouselResponse,
    PexelsPhotoSearchResponse,
    SlideData,
)
from models.database import Carousel, CarouselSlide, db
from services.gemini import format_text_as_carousel_slides, generate_carousel_slides, generate_slides_from_topic
from services.pexels import search_photos
from services.image_renderer import SlideSpec, render_carousel, render_carousel_themed

router = APIRouter()

MEDIA_DIR = os.getenv("MEDIA_DIR", "/media")


def _save_carousel_to_db(carousel_id: str, title: str, theme: str, slide_pairs: list[tuple[str, str]]) -> None:
    """Persist a carousel and its slides in a single transaction."""
    with db.atomic():
        Carousel.create(id=carousel_id, title=title, theme=theme, slide_count=len(slide_pairs))
        CarouselSlide.insert_many([
            {
                "id": f"{carousel_id}-slide-{i}",
                "carousel": carousel_id,
                "position": i,
                "title": slide_title,
                "content": slide_content,
                "image_path": "",
            }
            for i, (slide_title, slide_content) in enumerate(slide_pairs)
        ]).execute()


CAROUSEL_DIR = os.path.join(MEDIA_DIR, "generated")
os.makedirs(CAROUSEL_DIR, exist_ok=True)


@router.post("/generate", response_model=CarouselGenerateResponse)
async def generate_carousel(request: CarouselGenerateRequest):
    """Generate carousel slides from document content using Gemini AI."""
    if not request.content or len(request.content.strip()) < 10:
        raise HTTPException(status_code=400, detail="Content must be at least 10 characters")
    if request.slide_count < 1 or request.slide_count > 20:
        raise HTTPException(status_code=400, detail="Slide count must be between 1 and 20")
    try:
        slides = await asyncio.to_thread(
            generate_carousel_slides,
            content=request.content,
            slide_count=request.slide_count,
            title=request.title,
            tone=request.tone,
        )
    except ValueError as e:
        raise HTTPException(status_code=500, detail=f"Generation failed: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gemini API error: {str(e)[:200]}")

    carousel_id = str(uuid.uuid4())
    try:
        _save_carousel_to_db(carousel_id, request.title, request.theme, [(s.title, s.content) for s in slides])
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

    return CarouselGenerateResponse(carousel_id=carousel_id, slides=slides)


@router.post("/export")
async def export_carousel(request: CarouselExportRequest):
    """Export carousel slide data as a ZIP file."""
    if not request.carousel_id:
        raise HTTPException(status_code=400, detail="carousel_id required")
    if len(request.slides) == 0:
        raise HTTPException(status_code=400, detail="No slides provided")
    try:
        carousel = Carousel.get_by_id(request.carousel_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Carousel not found")

    zip_buffer = BytesIO()
    try:
        with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zf:
            manifest = {
                "carousel_id": request.carousel_id,
                "title": carousel.title,
                "theme": request.theme,
                "slide_count": len(request.slides),
                "created_at": carousel.created_at.isoformat(),
            }
            zf.writestr("manifest.json", json.dumps(manifest, indent=2))
            for i, slide in enumerate(request.slides):
                slide_json = {"position": i, "title": slide.title, "content": slide.content}
                zf.writestr(f"slide_{str(i + 1).zfill(2)}.json", json.dumps(slide_json, indent=2))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Export failed: {str(e)}")

    zip_buffer.seek(0)
    safe_name = carousel.title.replace(" ", "_").replace("/", "_")
    return StreamingResponse(
        zip_buffer,
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{safe_name}.zip"'},
    )


@router.get("/pexels-backgrounds", response_model=PexelsPhotoSearchResponse)
async def pexels_background_search(q: str = Query(..., min_length=1)):
    """Search Pexels for square photos to use as slide backgrounds."""
    try:
        photos = await search_photos(query=q, per_page=20)
        return PexelsPhotoSearchResponse(photos=photos)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Pexels search failed: {str(e)[:200]}")


@router.post("/bulk")
async def bulk_generate_carousel(request: BulkCarouselRequest):
    """Bulk-generate rendered carousel PNGs from a topic.

    Calls Gemini for slide content, fetches Pexels backgrounds, renders
    1080x1350 PNGs with Pillow and returns a ZIP as carousel_01/slide_01.png.
    """
    if request.carousel_count < 1 or request.carousel_count > 10:
        raise HTTPException(status_code=400, detail="carousel_count must be between 1 and 10")
    if request.slides_per_carousel < 3 or request.slides_per_carousel > 10:
        raise HTTPException(status_code=400, detail="slides_per_carousel must be between 3 and 10")

    async def _generate_one_carousel(carousel_idx: int) -> list[bytes]:
        """Run Gemini + parallel Pexels fetches + Pillow render for one carousel."""
        topic_slides = await asyncio.to_thread(
            generate_slides_from_topic,
            topic=request.topic,
            slide_count=request.slides_per_carousel,
            tone=request.tone,
        )

        try:
            fallback_photos = await search_photos(query=request.topic, per_page=10)
        except Exception:
            fallback_photos = []

        async def _fetch_bg(query: str, slide_idx: int) -> str:
            try:
                photos = await search_photos(query=query, per_page=5)
                return photos[slide_idx % len(photos)]["full"]
            except Exception:
                return fallback_photos[slide_idx % len(fallback_photos)]["full"]

        bg_urls = await asyncio.gather(*[
            _fetch_bg(ts.pexels_query, slide_idx) for slide_idx, ts in enumerate(topic_slides)
        ])
        specs = [
            SlideSpec(slide_type=ts.slide_type, title=ts.title, body=ts.body, bg_image_url=url)
            for ts, url in zip(topic_slides, bg_urls)
        ]
        return await asyncio.to_thread(render_carousel, specs, request.top_label)

    try:
        all_png_lists = await asyncio.gather(*[
            _generate_one_carousel(i) for i in range(request.carousel_count)
        ])
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Bulk generation failed: {str(e)[:200]}")

    zip_buffer = BytesIO()
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        for carousel_idx, png_list in enumerate(all_png_lists):
            folder = f"carousel_{str(carousel_idx + 1).zfill(2)}"
            for slide_idx, png_bytes in enumerate(png_list):
                zf.writestr(f"{folder}/slide_{str(slide_idx + 1).zfill(2)}.png", png_bytes)

    zip_buffer.seek(0)
    safe_topic = request.topic[:40].replace(" ", "_").replace("/", "_")
    return StreamingResponse(
        zip_buffer,
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="carousels_{safe_topic}.zip"'},
    )


@router.post("/from-text", response_model=CarouselFromTextResponse)
async def generate_from_text(request: CarouselFromTextRequest):
    """Generate carousel slides from pasted raw text using Gemini AI."""
    if not request.raw_text or len(request.raw_text.strip()) < 20:
        raise HTTPException(status_code=400, detail="Text must be at least 20 characters")
    try:
        slides = await asyncio.to_thread(
            format_text_as_carousel_slides,
            raw_text=request.raw_text,
            slide_count=request.slide_count,
            tone=request.tone,
        )
    except ValueError as e:
        raise HTTPException(status_code=500, detail=f"Generation failed: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gemini API error: {str(e)[:200]}")

    carousel_id = str(uuid.uuid4())
    try:
        _save_carousel_to_db(
            carousel_id,
            slides[0].title if slides else "Carousel",
            request.theme,
            [(s.title, s.body) for s in slides],
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

    return CarouselFromTextResponse(carousel_id=carousel_id, slides=slides)


@router.post("/render-png")
async def render_carousel_png(request: CarouselRenderRequest):
    """Render carousel slides as themed PNG images and return as ZIP."""
    if not request.slides:
        raise HTTPException(status_code=400, detail="No slides provided")
    try:
        png_list = await asyncio.to_thread(
            lambda: render_carousel_themed(
                slides=request.slides,
                theme=request.theme,
                top_label=request.handle,
            )
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Render error: {str(e)[:200]}")

    zip_buffer = BytesIO()
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        for i, png_bytes in enumerate(png_list):
            zf.writestr(f"slide_{str(i + 1).zfill(2)}.png", png_bytes)

    zip_buffer.seek(0)
    return StreamingResponse(
        zip_buffer,
        media_type="application/zip",
        headers={"Content-Disposition": 'attachment; filename="carousel.zip"'},
    )


@router.get("/history", response_model=CarouselHistoryResponse)
async def get_carousel_history():
    """List all past carousels in order of creation (newest first)."""
    try:
        carousels = Carousel.select().order_by(Carousel.created_at.desc()).limit(50)
        return CarouselHistoryResponse(
            carousels=[
                CarouselResponse(
                    id=c.id,
                    title=c.title,
                    theme=c.theme,
                    slide_count=c.slide_count,
                    created_at=c.created_at,
                )
                for c in carousels
            ]
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
