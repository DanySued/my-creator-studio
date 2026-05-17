"""Gemini API integration for carousel content generation."""
import os
import json
from typing import List, Optional
from models.schemas import SlideData, TopicSlideData, CarouselSlideItem
import google.generativeai as genai

_gemini_model: genai.GenerativeModel | None = None


def initialize_gemini():
    """Initialize Gemini client with API key."""
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY not set")
    genai.configure(api_key=api_key)


def _get_model() -> genai.GenerativeModel:
    """Return the cached Gemini model, initializing on first call."""
    global _gemini_model
    if _gemini_model is None:
        initialize_gemini()
        _gemini_model = genai.GenerativeModel("gemini-2.0-flash")
    return _gemini_model


def _parse_gemini_json(response_text: str) -> object:
    """Strip markdown fences from a Gemini response and parse as JSON."""
    text = response_text.strip()
    if text.startswith("```json"):
        text = text[7:]
    if text.startswith("```"):
        text = text[3:]
    if text.endswith("```"):
        text = text[:-3]
    try:
        return json.loads(text.strip())
    except json.JSONDecodeError:
        raise ValueError(f"Gemini returned invalid JSON: {text[:200]}")


TONE_INSTRUCTIONS = {
    "professional": "Use formal, structured language. Lead with facts and clear insights.",
    "casual": "Use friendly, conversational language. Keep it approachable and relatable.",
    "inspirational": "Use motivational, emotionally resonant language. Tell a story and inspire action.",
    "educational": "Use clear, explanatory language. Break down complex ideas step by step.",
    "bold": "Use short, punchy sentences. Maximum impact. Be direct and assertive.",
}


def generate_carousel_slides(
    content: str,
    slide_count: int = 5,
    title: str = "Generated Carousel",
    tone: str = "professional",
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
    tone_instruction = TONE_INSTRUCTIONS.get(tone, TONE_INSTRUCTIONS["professional"])

    prompt = f"""You are an expert content strategist. Convert the following document content into exactly {slide_count} Instagram carousel slides.

Tone: {tone_instruction}

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
- Apply the tone consistently across all slides
- Make content visually scannable
- Use active voice
- Include key points from the document
- Each slide should be self-contained
- Return ONLY valid JSON, no markdown or extra text"""

    slides_data = _parse_gemini_json(_get_model().generate_content(prompt).text)

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


def generate_slides_from_topic(
    topic: str,
    slide_count: int = 5,
    tone: str = "casual",
) -> List[TopicSlideData]:
    """
    Generate carousel slides from a topic using Gemini.

    Each slide includes a title, body text, and a Pexels image search query.
    The first slide is a cover and the last is a CTA/end slide.

    Args:
        topic      : The carousel subject (e.g. "Best coffee spots in Lisbon")
        slide_count: Total number of slides including cover and end
        tone       : Writing tone key from TONE_INSTRUCTIONS

    Returns:
        List of TopicSlideData (slide_type, title, body, pexels_query)
    """
    tone_instruction = TONE_INSTRUCTIONS.get(tone, TONE_INSTRUCTIONS["casual"])
    content_count = max(1, slide_count - 2)  # slides between cover and end

    prompt = f"""You are a creative Instagram content strategist.
Create a {slide_count}-slide Instagram carousel about: "{topic}"

Tone: {tone_instruction}

Structure:
- Slide 1: Cover slide — punchy title + a short engaging subtitle (max 12 words each)
- Slides 2 to {slide_count - 1}: Content slides — one focused tip/point per slide (title max 8 words, body max 40 words)
- Slide {slide_count}: End/CTA slide — a call to action or memorable closing line (title only, max 12 words)

For each slide also provide a short Pexels image search query (2-4 words) that would find a beautiful, aesthetically matching background photo.

Return a JSON array with exactly {slide_count} objects using this structure:
[
  {{
    "slide_type": "cover",
    "title": "...",
    "body": "...",
    "pexels_query": "..."
  }},
  {{
    "slide_type": "content",
    "title": "...",
    "body": "...",
    "pexels_query": "..."
  }},
  ...
  {{
    "slide_type": "end",
    "title": "...",
    "body": "",
    "pexels_query": "..."
  }}
]

Rules:
- slide_type must be exactly "cover", "content", or "end"
- body is empty string "" for "end" slides
- pexels_query should be a visually descriptive phrase, not the topic itself
- Return ONLY valid JSON, no markdown or extra text"""

    raw = _parse_gemini_json(_get_model().generate_content(prompt).text)

    slides = []
    for i, item in enumerate(raw[:slide_count]):
        slides.append(TopicSlideData(
            slide_type=str(item.get("slide_type", "content")).strip(),
            title=str(item.get("title", f"Slide {i+1}")).strip(),
            body=str(item.get("body", "")).strip(),
            pexels_query=str(item.get("pexels_query", topic)).strip(),
        ))

    # Ensure we always have the requested count
    while len(slides) < slide_count:
        slides.append(TopicSlideData(
            slide_type="content",
            title=f"Point {len(slides)}",
            body="More details coming soon.",
            pexels_query=topic,
        ))

    return slides[:slide_count]


def format_text_as_carousel_slides(
    raw_text: str,
    slide_count: Optional[int] = None,
) -> List[CarouselSlideItem]:
    """
    Parse and format arbitrary pasted text into carousel slides.

    Input:  Any text — article, bullet list, Twitter thread, etc.
    Output: Cover + content slides + CTA, as CarouselSlideItem list.
    """
    target = f"exactly {slide_count}" if slide_count else "between 5 and 8 (choose the best fit for the content)"

    prompt = f"""You are an Instagram content strategist. Transform the following text into a carousel slide deck.

Text:
---
{raw_text}
---

Create {target} slides:
- First slide: type "cover" — bold title (max 8 words) + short subtitle in body (max 12 words)
- Middle slides: type "content" — one focused point each, title (max 8 words) + body (max 35 words)
- Last slide: type "cta" — short call to action in title (max 10 words), body must be empty string

Return ONLY a JSON array, no code fences, no extra text:
[
  {{"type": "cover", "title": "...", "body": "..."}},
  {{"type": "content", "title": "...", "body": "..."}},
  {{"type": "cta", "title": "...", "body": ""}}
]

Rules: type must be "cover", "content", or "cta". No emojis, no asterisks, no markdown formatting."""

    raw = _parse_gemini_json(_get_model().generate_content(prompt).text)

    slides = []
    for i, item in enumerate(raw):
        slide_type = str(item.get("type", "content")).strip()
        if slide_type not in ("cover", "content", "cta"):
            slide_type = "content"
        slides.append(CarouselSlideItem(
            type=slide_type,
            number_label=str(i + 1).zfill(2),
            title=str(item.get("title", f"Slide {i + 1}")).strip(),
            body=str(item.get("body", "")).strip(),
        ))

    if not slides:
        slides.append(CarouselSlideItem(type="cover", number_label="01", title="My Carousel", body=""))

    return slides
