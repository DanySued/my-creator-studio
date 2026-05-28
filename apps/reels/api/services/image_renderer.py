"""
Pillow-based carousel slide renderer.

Reproduces the "Green and Yellow Simple Local Gems" Canva template aesthetic:
  - 1080 × 1350 px (Instagram 4:5 portrait)
  - Pexels photo background, cropped to fill
  - Black semi-transparent overlay (80 % opacity)
  - Yellow (#ffde59) bold title text — left-aligned
  - Thin yellow horizontal separator line
  - White regular body text — left-aligned, wraps automatically
  - Slide-number badge bottom-right
  - Optional top-left label (e.g. account handle or category)

Slide types
-----------
cover   : large yellow title centred vertically, white subtitle near bottom
content : yellow title + separator + white body, slide counter bottom-right
end     : yellow CTA text centred, no body
"""

from __future__ import annotations

import io
import os
import textwrap
from dataclasses import dataclass, field
from functools import lru_cache
from pathlib import Path
from typing import Optional

import httpx
from PIL import Image, ImageDraw, ImageFont, ImageFilter

# ── Constants ────────────────────────────────────────────────────────────────

CANVAS_W = 1080
CANVAS_H = 1350

YELLOW = (255, 222, 89)      # #ffde59
WHITE  = (255, 255, 255)
BLACK  = (0, 0, 0)

OVERLAY_ALPHA = 204           # 80 % of 255

PADDING_X = 108               # ~10 % of width  (81/810 × 1080)
PADDING_TOP = 120
STRIPE_W = 54                 # continuity stripe width (px)

ASSETS_DIR = Path(__file__).parent.parent / "assets" / "fonts"
FONT_BOLD   = ASSETS_DIR / "Montserrat-Bold.ttf"
FONT_SEMI   = ASSETS_DIR / "Montserrat-SemiBold.ttf"
FONT_REGULAR = ASSETS_DIR / "Montserrat-Regular.ttf"

# ── Color themes (for gradient-background slides) ────────────────────────────
# Each theme carries a stripe color (continuity bar between slides) and a
# slideStyle hint used for watermark number rendering.

THEMES: dict[str, dict] = {
    "thread": {
        "bg1": (249, 246, 241), "bg2": (237, 232, 224),
        "accent": (26, 26, 26), "title": (13, 13, 13), "body": (90, 90, 90),
        "stripe": (200, 184, 154), "style": "editorial",
    },
    "noir": {
        "bg1": (12, 12, 12), "bg2": (28, 28, 28),
        "accent": (212, 168, 83), "title": (255, 255, 255), "body": (200, 195, 175),
        "stripe": (212, 168, 83), "style": "bold-number",
    },
    "bloom": {
        "bg1": (240, 232, 255), "bg2": (220, 200, 255),
        "accent": (124, 58, 237), "title": (30, 10, 60), "body": (74, 44, 138),
        "stripe": (124, 58, 237), "style": "classic",
    },
    "navy": {
        "bg1": (8, 20, 46), "bg2": (20, 48, 90),
        "accent": (201, 168, 76), "title": (255, 255, 255), "body": (200, 215, 235),
        "stripe": (201, 168, 76), "style": "bold-number",
    },
    "plasma": {
        "bg1": (4, 4, 4), "bg2": (12, 12, 20),
        "accent": (0, 229, 255), "title": (255, 255, 255), "body": (180, 240, 255),
        "stripe": (0, 229, 255), "style": "bold-number",
    },
    "clay": {
        "bg1": (247, 237, 226), "bg2": (232, 213, 192),
        "accent": (196, 94, 61), "title": (45, 24, 16), "body": (107, 69, 53),
        "stripe": (196, 94, 61), "style": "editorial",
    },
}


# ── Helpers ──────────────────────────────────────────────────────────────────

@lru_cache(maxsize=32)
def _load_font(path: Path, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(path), size)


def _download_image(url: str, timeout: int = 20) -> Image.Image:
    """Download an image from a URL and return a PIL Image."""
    resp = httpx.get(url, timeout=timeout, follow_redirects=True)
    resp.raise_for_status()
    return Image.open(io.BytesIO(resp.content)).convert("RGBA")


def _crop_to_fill(img: Image.Image, target_w: int, target_h: int) -> Image.Image:
    """Scale + center-crop image to exactly target_w × target_h."""
    img_w, img_h = img.size
    scale = max(target_w / img_w, target_h / img_h)
    new_w = int(img_w * scale)
    new_h = int(img_h * scale)
    img = img.resize((new_w, new_h), Image.LANCZOS)
    left = (new_w - target_w) // 2
    top  = (new_h - target_h) // 2
    return img.crop((left, top, left + target_w, top + target_h))


def _draw_wrapped_text(
    draw: ImageDraw.ImageDraw,
    text: str,
    font: ImageFont.FreeTypeFont,
    color: tuple,
    x: int,
    y: int,
    max_width: int,
    line_spacing: int = 12,
) -> int:
    """
    Draw left-aligned wrapped text. Returns the Y coordinate just below
    the last line (useful for stacking elements).
    """
    # Wrap by character width estimation
    avg_char_w = font.getbbox("A")[2]
    chars_per_line = max(1, max_width // max(1, avg_char_w))
    lines = []
    for paragraph in text.split("\n"):
        wrapped = textwrap.wrap(paragraph, width=chars_per_line) or [""]
        lines.extend(wrapped)

    current_y = y
    for line in lines:
        draw.text((x, current_y), line, font=font, fill=color)
        bbox = draw.textbbox((x, current_y), line, font=font)
        current_y = bbox[3] + line_spacing

    return current_y


def _draw_separator(draw: ImageDraw.ImageDraw, x: int, y: int, width: int = 320, thickness: int = 3):
    """Draw a thin yellow horizontal line."""
    draw.rectangle([x, y, x + width, y + thickness], fill=YELLOW)


def _draw_slide_number(
    draw: ImageDraw.ImageDraw,
    current: int,
    total: int,
    font: ImageFont.FreeTypeFont,
):
    """Small slide counter in the bottom-right corner."""
    text = f"{current}/{total}"
    bbox = draw.textbbox((0, 0), text, font=font)
    w = bbox[2] - bbox[0]
    x = CANVAS_W - PADDING_X - w
    y = CANVAS_H - PADDING_TOP
    draw.text((x, y), text, font=font, fill=(255, 255, 255, 160))


def _draw_top_label(draw: ImageDraw.ImageDraw, label: str, font: ImageFont.FreeTypeFont):
    """Small yellow category/handle label in the top-left corner."""
    draw.text((PADDING_X, PADDING_TOP), label.upper(), font=font, fill=YELLOW)


# ── Core render function ─────────────────────────────────────────────────────

def render_slide(
    *,
    slide_type: str,          # "cover" | "content" | "end"
    title: str,
    body: str = "",
    bg_image_url: str,
    top_label: str = "",       # e.g. "@yourhandle" or category
    slide_num: int = 1,
    total_slides: int = 5,
    blur_bg: bool = False,
) -> bytes:
    """
    Render a single carousel slide and return raw PNG bytes.

    Parameters
    ----------
    slide_type   : "cover", "content", or "end"
    title        : Main heading (yellow)
    body         : Body copy (white) — only used for "content" slides
    bg_image_url : Pexels full-resolution image URL
    top_label    : Optional small label at top-left (e.g. "@handle")
    slide_num    : 1-based index of this slide
    total_slides : Total number of slides in the carousel
    blur_bg      : Lightly blur the background photo
    """

    # 1. Background photo
    bg = _download_image(bg_image_url)
    bg = _crop_to_fill(bg, CANVAS_W, CANVAS_H)
    if blur_bg:
        bg = bg.filter(ImageFilter.GaussianBlur(radius=4))

    # 2. Dark overlay
    overlay = Image.new("RGBA", (CANVAS_W, CANVAS_H), (*BLACK, OVERLAY_ALPHA))
    composite = Image.alpha_composite(bg, overlay)

    # 3. Drawing layer
    canvas = composite.convert("RGBA")
    draw = ImageDraw.Draw(canvas)

    # 4. Load fonts
    font_title_large  = _load_font(FONT_BOLD,    96)
    font_title_medium = _load_font(FONT_BOLD,    72)
    font_title_small  = _load_font(FONT_SEMI,    58)
    font_body         = _load_font(FONT_REGULAR, 42)
    font_label        = _load_font(FONT_SEMI,    28)
    font_counter      = _load_font(FONT_REGULAR, 30)

    text_area_w = CANVAS_W - 2 * PADDING_X

    # 5. Render by slide type
    if slide_type == "cover":
        _render_cover(draw, title, body, top_label, font_title_large, font_body, font_label, text_area_w)

    elif slide_type == "content":
        _render_content(draw, title, body, top_label, font_title_small, font_body, font_label, text_area_w)
        _draw_slide_number(draw, slide_num, total_slides, font_counter)

    elif slide_type == "end":
        _render_end(draw, title, top_label, font_title_medium, font_label, text_area_w)

    # 6. Return PNG bytes
    out = io.BytesIO()
    canvas.convert("RGB").save(out, format="PNG", optimize=True)
    out.seek(0)
    return out.read()


# ── Slide-type renderers ─────────────────────────────────────────────────────

def _render_cover(draw, title, subtitle, label, font_title, font_body, font_label, text_area_w):
    """Cover slide: large yellow title in the upper-middle, white subtitle near bottom."""

    if label:
        _draw_top_label(draw, label, font_label)

    # Title — vertically centred around 38 % from top
    title_y = int(CANVAS_H * 0.28)
    title_end_y = _draw_wrapped_text(
        draw, title, font_title, YELLOW,
        PADDING_X, title_y, text_area_w, line_spacing=16,
    )

    # Separator line below title
    sep_y = title_end_y + 30
    _draw_separator(draw, PADDING_X, sep_y, width=text_area_w // 2)

    # Subtitle / tagline near the bottom
    if subtitle:
        _draw_wrapped_text(
            draw, subtitle, font_body, WHITE,
            PADDING_X, int(CANVAS_H * 0.78), text_area_w, line_spacing=10,
        )


def _render_content(draw, title, body, label, font_title, font_body, font_label, text_area_w):
    """Content slide: yellow title + thin separator + white body text."""

    if label:
        _draw_top_label(draw, label, font_label)

    # Title — start at ~22 % from top
    title_y = int(CANVAS_H * 0.22)
    title_end_y = _draw_wrapped_text(
        draw, title, font_title, YELLOW,
        PADDING_X, title_y, text_area_w, line_spacing=14,
    )

    # Separator line
    sep_y = title_end_y + 28
    _draw_separator(draw, PADDING_X, sep_y, width=text_area_w // 3)

    # Body text
    body_y = sep_y + 36
    _draw_wrapped_text(
        draw, body, font_body, WHITE,
        PADDING_X, body_y, text_area_w, line_spacing=14,
    )


def _render_end(draw, cta_text, label, font_title, font_label, text_area_w):
    """End / CTA slide: yellow text centred, no body."""

    if label:
        _draw_top_label(draw, label, font_label)

    # Centre the CTA text vertically
    cta_y = int(CANVAS_H * 0.40)
    _draw_wrapped_text(
        draw, cta_text, font_title, YELLOW,
        PADDING_X, cta_y, text_area_w, line_spacing=16,
    )


# ── Batch helper ─────────────────────────────────────────────────────────────

@dataclass
class SlideSpec:
    slide_type: str          # "cover" | "content" | "end"
    title: str
    body: str = ""
    bg_image_url: str = ""
    pexels_query: str = ""   # used to fetch bg_image_url if not provided


def _make_gradient_bg(w: int, h: int, c1: tuple, c2: tuple) -> Image.Image:
    """Create a vertical gradient background using PIL only (no numpy)."""
    strip = Image.new("RGB", (1, h))
    pix = strip.load()
    for y in range(h):
        t = y / max(h - 1, 1)
        pix[0, y] = (
            int(c1[0] + (c2[0] - c1[0]) * t),
            int(c1[1] + (c2[1] - c1[1]) * t),
            int(c1[2] + (c2[2] - c1[2]) * t),
        )
    return strip.resize((w, h), Image.NEAREST).convert("RGBA")


def render_slide_themed(
    *,
    slide_type: str,           # "cover" | "content" | "cta"
    title: str,
    body: str = "",
    theme: str = "thread",
    top_label: str = "",
    slide_num: int = 1,
    total_slides: int = 5,
    canvas_w: int = CANVAS_W,
    canvas_h: int = CANVAS_H,
) -> bytes:
    """
    Render a single carousel slide using a color gradient theme.
    No photo required — background is generated from the theme palette.
    Each slide carries continuity stripes on its edges so the carousel
    feels connected when swiped on Instagram.
    """
    colors = THEMES.get(theme, THEMES["thread"])

    bg = _make_gradient_bg(canvas_w, canvas_h, colors["bg1"], colors["bg2"])
    canvas = bg.copy()
    draw = ImageDraw.Draw(canvas)

    # ── Continuity stripes ───────────────────────────────────────────────────
    stripe_color = colors.get("stripe", (200, 200, 200))
    # Left stripe: content + cta slides (they follow another slide)
    if slide_type in ("content", "cta"):
        draw.rectangle([0, 0, STRIPE_W - 1, canvas_h - 1], fill=stripe_color)
    # Right stripe: cover + content slides (another slide follows them)
    if slide_type in ("cover", "content"):
        draw.rectangle([canvas_w - STRIPE_W, 0, canvas_w - 1, canvas_h - 1], fill=stripe_color)

    font_title_large  = _load_font(FONT_BOLD,    96)
    font_title_medium = _load_font(FONT_BOLD,    72)
    font_title_small  = _load_font(FONT_SEMI,    58)
    font_body         = _load_font(FONT_REGULAR, 42)
    font_label        = _load_font(FONT_SEMI,    28)
    font_counter      = _load_font(FONT_REGULAR, 30)

    t_color = colors["title"]
    b_color = colors["body"]
    a_color = colors["accent"]
    text_area_w = canvas_w - 2 * PADDING_X

    # ── Watermark number (bold-number themes) ────────────────────────────────
    if colors.get("style") == "bold-number" and slide_type != "cta":
        num_label = str(slide_num).zfill(2)
        font_wm = _load_font(FONT_BOLD, 420)
        bbox = draw.textbbox((0, 0), num_label, font=font_wm)
        wm_w = bbox[2] - bbox[0]
        # Anchor to lower-right, inside the right stripe
        wm_x = canvas_w - STRIPE_W - 20 - wm_w
        wm_y = int(canvas_h * 0.60)
        draw.text((wm_x, wm_y), num_label, font=font_wm, fill=(*a_color, 23))

    if slide_type == "cover":
        if top_label:
            draw.text((PADDING_X, PADDING_TOP), top_label, font=font_label, fill=a_color)
        # Number label top-left
        num_label = str(slide_num).zfill(2)
        draw.text((PADDING_X, PADDING_TOP), num_label, font=font_label, fill=(*a_color, 230))
        title_y = int(canvas_h * 0.25)
        title_end_y = _draw_wrapped_text(
            draw, title, font_title_large, t_color, PADDING_X, title_y, text_area_w, line_spacing=16
        )
        sep_y = int(canvas_h * 0.62)
        draw.rectangle([PADDING_X, sep_y, PADDING_X + 320, sep_y + 3], fill=a_color)
        if body:
            _draw_wrapped_text(
                draw, body, font_body, b_color, PADDING_X, int(canvas_h * 0.67), text_area_w, line_spacing=10
            )

    elif slide_type == "content":
        num_label = str(slide_num).zfill(2)
        draw.text((PADDING_X, PADDING_TOP), num_label, font=font_label, fill=(*a_color, 230))
        if top_label:
            # Place handle top-right (inside right stripe boundary)
            bbox = draw.textbbox((0, 0), top_label, font=font_label)
            lw = bbox[2] - bbox[0]
            draw.text((canvas_w - STRIPE_W - PADDING_X // 2 - lw, PADDING_TOP), top_label, font=font_label, fill=(*a_color, 190))
        title_y = int(canvas_h * 0.20)
        title_end_y = _draw_wrapped_text(
            draw, title, font_title_small, t_color, PADDING_X, title_y, text_area_w, line_spacing=14
        )
        sep_y = int(canvas_h * 0.48)
        draw.rectangle([PADDING_X, sep_y, PADDING_X + 270, sep_y + 3], fill=a_color)
        body_y = int(canvas_h * 0.53)
        _draw_wrapped_text(draw, body, font_body, b_color, PADDING_X, body_y, text_area_w, line_spacing=14)
        _draw_slide_number(draw, slide_num, total_slides, font_counter)

    elif slide_type == "cta":
        # Large left-aligned CTA with handle below
        cta_y = int(canvas_h * 0.38)
        _draw_wrapped_text(draw, title, font_title_medium, t_color, PADDING_X, cta_y, text_area_w, line_spacing=16)
        sep_y = int(canvas_h * 0.63)
        draw.rectangle([PADDING_X, sep_y, PADDING_X + 240, sep_y + 3], fill=a_color)
        if top_label:
            draw.text((PADDING_X, int(canvas_h * 0.68)), top_label, font=font_label, fill=a_color)

    out = io.BytesIO()
    canvas.convert("RGB").save(out, format="PNG", optimize=True)
    out.seek(0)
    return out.read()


def render_carousel(
    slides: list[SlideSpec],
    top_label: str = "",
) -> list[bytes]:
    """
    Render a full carousel. Each SlideSpec must have bg_image_url populated
    before calling this function.

    Returns a list of PNG byte strings, one per slide.
    """
    total = len(slides)
    result = []
    for i, spec in enumerate(slides):
        png = render_slide(
            slide_type=spec.slide_type,
            title=spec.title,
            body=spec.body,
            bg_image_url=spec.bg_image_url,
            top_label=top_label,
            slide_num=i + 1,
            total_slides=total,
        )
        result.append(png)
    return result


def render_carousel_themed(
    slides: list,
    theme: str = "thread",
    top_label: str = "",
    canvas_w: int = CANVAS_W,
    canvas_h: int = CANVAS_H,
) -> list[bytes]:
    """
    Render a full carousel using a color theme. Accepts CarouselSlideItem objects
    or plain dicts with keys: type, title, body.
    """
    total = len(slides)
    result = []
    for i, slide in enumerate(slides):
        png = render_slide_themed(
            slide_type=slide.type,
            title=slide.title,
            body=slide.body,
            theme=theme,
            top_label=top_label,
            slide_num=i + 1,
            total_slides=total,
            canvas_w=canvas_w,
            canvas_h=canvas_h,
        )
        result.append(png)
    return result
