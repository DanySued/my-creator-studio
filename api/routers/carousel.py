"""Carousel generation API endpoints."""
import os
import uuid
import json
from io import BytesIO
from typing import List

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
import zipfile

from models.schemas import (
    CarouselGenerateRequest,
    CarouselExportRequest,
    CarouselGenerateResponse,
    CarouselHistoryResponse,
    CarouselResponse,
    SlideData,
)
from models.database import Carousel, CarouselSlide
from services.gemini import generate_carousel_slides

router = APIRouter()

# Media directory for storing generated files
MEDIA_DIR = os.getenv("MEDIA_DIR", "/media")
CAROUSEL_DIR = os.path.join(MEDIA_DIR, "generated")
os.makedirs(CAROUSEL_DIR, exist_ok=True)


@router.post("/generate", response_model=CarouselGenerateResponse)
async def generate_carousel(request: CarouselGenerateRequest):
    """
    Generate carousel slides from document content using Gemini AI.

    - **content**: Extracted text from PDF/DOCX/TXT
    - **slide_count**: Number of slides to generate (default: 5)
    - **theme**: Carousel theme (default: midnight)
    - **title**: Carousel title (default: Generated Carousel)

    Returns slide data ready for preview/export.
    """
    if not request.content or len(request.content.strip()) < 10:
        raise HTTPException(status_code=400, detail="Content must be at least 10 characters")

    if request.slide_count < 1 or request.slide_count > 20:
        raise HTTPException(status_code=400, detail="Slide count must be between 1 and 20")

    try:
        # Generate slides using Gemini
        slides = generate_carousel_slides(
            content=request.content,
            slide_count=request.slide_count,
            title=request.title,
        )
    except ValueError as e:
        raise HTTPException(status_code=500, detail=f"Generation failed: {str(e)}")
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Gemini API error: {str(e)[:200]}"
        )

    # Create carousel record
    carousel_id = str(uuid.uuid4())
    try:
        carousel = Carousel.create(
            id=carousel_id,
            title=request.title,
            theme=request.theme,
            slide_count=len(slides),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

    # Store slides in database
    for i, slide in enumerate(slides):
        try:
            CarouselSlide.create(
                id=f"{carousel_id}-slide-{i}",
                carousel=carousel,
                position=i,
                title=slide.title,
                content=slide.content,
                image_path="",
            )
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to store slide: {str(e)}")

    return CarouselGenerateResponse(
        carousel_id=carousel_id,
        slides=slides,
    )


@router.post("/export")
async def export_carousel(request: CarouselExportRequest):
    """
    Export carousel slide data as a ZIP file (JSON manifest + per-slide JSON).
    PNG rendering is handled client-side by html-to-image.
    """
    if not request.carousel_id:
        raise HTTPException(status_code=400, detail="carousel_id required")

    if len(request.slides) == 0:
        raise HTTPException(status_code=400, detail="No slides provided")

    try:
        carousel = Carousel.get_by_id(request.carousel_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Carousel not found")

    # Create ZIP in memory
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
                slide_json = {
                    "position": i,
                    "title": slide.title,
                    "content": slide.content,
                }
                zf.writestr(f"slide_{str(i + 1).zfill(2)}.json", json.dumps(slide_json, indent=2))

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Export failed: {str(e)}")

    # Return ZIP file
    zip_buffer.seek(0)
    safe_name = carousel.title.replace(" ", "_").replace("/", "_")
    return StreamingResponse(
        zip_buffer,
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{safe_name}.zip"'},
    )


@router.get("/history", response_model=CarouselHistoryResponse)
async def get_carousel_history():
    """
    List all past carousels in order of creation (newest first).
    """
    try:
        carousels = Carousel.select().order_by(Carousel.created_at.desc())
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
