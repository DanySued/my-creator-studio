"""Gemini API integration for carousel content generation."""
import os
import json
from typing import List
from models.schemas import SlideData
import google.generativeai as genai


def initialize_gemini():
    """Initialize Gemini client with API key."""
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY not set")
    genai.configure(api_key=api_key)


def generate_carousel_slides(
    content: str,
    slide_count: int = 5,
    title: str = "Generated Carousel"
) -> List[SlideData]:
    """
    Generate carousel slides from document content using Gemini API.

    Args:
        content: Extracted text from uploaded document
        slide_count: Number of slides to generate
        title: Main carousel title

    Returns:
        List of SlideData objects with title and content for each slide
    """
    try:
        initialize_gemini()
    except ValueError as e:
        raise ValueError(f"Gemini not configured: {e}")

    # Create the prompt for Gemini
    prompt = f"""You are an expert content strategist. Convert the following document content into exactly {slide_count} carousel slides.

Document content:
---
{content}
---

Generate exactly {slide_count} carousel slides. For each slide, provide:
1. A concise, engaging title (max 10 words)
2. Body content (max 50 words, clear and impactful)

Return a JSON array with this exact structure:
[
  {{"title": "Slide Title", "content": "Slide body text..."}},
  {{"title": "Slide 2 Title", "content": "Slide 2 body text..."}},
  ...
]

Requirements:
- Make content visually scannable
- Use active voice
- Include key points from the document
- Each slide should be self-contained
- Return ONLY valid JSON, no markdown or extra text"""

    # Call Gemini API
    model = genai.GenerativeModel("gemini-2.0-flash")
    response = model.generate_content(prompt)

    # Parse response
    response_text = response.text.strip()

    # Remove markdown code blocks if present
    if response_text.startswith("```json"):
        response_text = response_text[7:]
    if response_text.startswith("```"):
        response_text = response_text[3:]
    if response_text.endswith("```"):
        response_text = response_text[:-3]
    response_text = response_text.strip()

    try:
        slides_data = json.loads(response_text)
    except json.JSONDecodeError as e:
        raise ValueError(f"Failed to parse Gemini response as JSON: {response_text[:200]}")

    # Validate and convert to SlideData
    slides = []
    for i, slide in enumerate(slides_data[:slide_count]):
        if not isinstance(slide, dict) or "title" not in slide or "content" not in slide:
            raise ValueError(f"Invalid slide format at position {i}")
        slides.append(SlideData(
            title=str(slide.get("title", f"Slide {i+1}")).strip(),
            content=str(slide.get("content", "")).strip()
        ))

    # Ensure we have the requested number of slides
    while len(slides) < slide_count:
        slides.append(SlideData(
            title=f"Slide {len(slides)+1}",
            content="Additional content generated from document."
        ))

    return slides[:slide_count]
