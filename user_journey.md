# User Journey — My Creator Studio

> Living document. Update this when new flows are added or changed.
> Current state: May 2026

---

## 1. Entry Points

| Entry | Path | Notes |
|-------|------|-------|
| Dashboard | `/` | Shows activity feed, recent drafts, quick-start cards |
| Direct URL | Any route | Protected by password gate if `AUTH_SECRET` is set |

---

## 2. Core Flows

### 2A — Create a Carousel from Scratch (AI-assisted)

```
Dashboard
  └─ "Create Carousel" card  ──→  /carousel
       ├─ Fill in: topic, tone, slide count, theme
       ├─ Click "Generate" (calls POST /api/carousel/from-text → Gemini)
       ├─ Preview slides in the live grid (theme crossfade animation)
       ├─ Drag to reorder slides
       ├─ Delete slide → 4s undo toast
       ├─ Download ZIP → toast confirms
       └─ Auto-saved to localStorage (carousel_draft) on every change
```

**State saved:** `localStorage.carousel_draft` → `{ slides, themeId, topic, tone }`

---

### 2B — Browse & Use a Template

```
TopBar  ──→  Templates  ──→  /templates
  ├─ Filter by category (All / Educational / Motivational / Marketing / Lifestyle / Tech)
  ├─ Preview: 3 mini SlideCard thumbnails per template card
  ├─ Click "Edit in Canvas"
  │     └─ Navigates to /canvas-editor?template=<canvasTemplateId>
  │          └─ Canvas auto-applies the matching design on load
  └─ Theme mapping (carousel → canvas):
       thread → minimal   |  noir → noir
       bloom  → pastel    |  navy → gradient
       plasma → aurora    |  clay → studio
```

**Note:** Template library is purely client-side (no DB). New templates = edit `TEMPLATES` in `templates/page.tsx`.

---

### 2C — Design in Canvas Editor (Canva-like)

```
/canvas-editor  (or from Templates via ?template=)
  │
  ├─ Left sidebar — tools
  │    Select · Text · Rect · Circle · Line · Draw · Upload Image
  │    Undo / Redo (Ctrl+Z / Ctrl+Y)
  │
  ├─ Top toolbar
  │    Canvas size: 1:1 · 4:5 · 9:16
  │    Templates panel (7 built-in + Panoramic + Editorial)
  │    AI Carousel (topic + tone + slide count + template → Gemini → auto-fills slides)
  │    Preview (Instagram phone mockup)
  │    Save changes / Saved indicator
  │    Clear · Export (PNG) · Export All
  │
  ├─ Canvas (Fabric.js, scalable)
  │
  ├─ Slide strip (bottom) — add · duplicate · delete slides
  │
  └─ Right panel — Properties
       Background color / swatches
       Selected object: position · opacity · color · font · alignment
```

**Templates available:**
| ID | Style | Key characteristic |
|----|-------|--------------------|
| noir | Dark editorial | Gold accents, high contrast |
| sunrise | Bold orange | Circular shapes, energy |
| minimal | Swiss clean | White, left black stripe, italic serif |
| aurora | Moody purple | Bokeh circles, gradient |
| gradient | Deep navy-violet | Night sky, glowing text |
| studio | Charcoal magazine | Orange top/bottom bars |
| pastel | Warm cream | Soft circles, handwritten feel |
| **panoramic** | **Bleeding orb** | Orb moves across slides — swipe-to-reveal |
| **editorial** | **Bold magazine** | Giant slide numbers, orange accent bar |

**Panoramic template — how it works:**
The orb is positioned in a virtual 3240px-wide canvas (orbX = 1620). Each slide N shifts the viewport: `displayX = 1620 - (N-1)*1080`. Slide 1 shows the orb's right edge bleeding in; slide 2 shows it centered; slide 3 shows it bleeding out left. Creates the "window into a bigger image" Instagram effect.

**Save mechanism:** `localStorage.canvas_slide_<slideId>` (per slide, not per carousel).

---

### 2D — Continue an In-Progress Carousel

```
Dashboard
  └─ "Recent Drafts" section (reads localStorage.carousel_draft)
       ├─ Shows last 3 saved carousels with mini thumbnails + metadata
       └─ "Continue editing" → /carousel (draft auto-loads from localStorage)
```

---

### 2E — Generate a Reel (Video)

```
TopBar  ──→  Reels  ──→  /reels
  ├─ Fill in: title, keywords, duration
  ├─ Submit → POST /api/reels/generate (queues background job)
  ├─ Poll GET /api/reels/job/{id} for progress
  ├─ Clip approval step (if stock footage) → select preferred clips
  └─ Download final .mp4
```

**Background:** MoviePy (CPU-heavy) runs in APScheduler job queue. Never blocks the API.

---

### 2F — Publish to Instagram

```
TopBar  ──→  Publish  ──→  /publish
  ├─ Select account (linked via Instagrapi)
  ├─ Upload media (carousel or reel)
  ├─ Write caption
  ├─ Set schedule or post now
  └─ Confirmation → activity log entry
```

---

### 2G — Connect an Instagram Account

```
TopBar  ──→  Accounts  ──→  /accounts
  ├─ Add account: enter IG username + password
  ├─ Instagrapi creates session (stored encrypted in DB)
  └─ Status: active / needs re-auth / rate-limited
```

---

### 2H — Automation Rules

```
TopBar  ──→  Automation  ──→  /automation
  └─ Create rules: "every Monday at 9am → post from queue"
       └─ APScheduler triggers via cron
```

---

## 3. Navigation Map

```
Dashboard (/)
├── Carousel (/carousel)
├── Canvas Editor (/canvas-editor)
├── Templates (/templates)  ──→  Canvas Editor
├── Reels (/reels)
├── Publish (/publish)
├── Accounts (/accounts)
├── Automation (/automation)
└── Settings (/settings)
```

---

## 4. Data Flow

```
Browser (Next.js)
  │  fetch /api/<resource>
  ▼
Next.js Route Handlers (app/api/)
  │  proxy to API_URL env var
  ▼
FastAPI (api/)
  │  Peewee ORM
  ▼
PostgreSQL (Railway managed)

Side-effects:
  • Gemini API  ←  carousel/reels text generation
  • Pexels API  ←  stock footage search
  • Instagrapi  ←  IG session management
  • MoviePy     ←  reel rendering (background job)
  • /media vol  ←  output file storage (Railway volume)
```

---

## 5. Known Limitations & Constraints

- **Single-user** — no multi-tenancy. One password gate (`AUTH_SECRET` env).
- **Instagrapi is unofficial** — respect IG rate limits. No aggressive automation.
- **Panoramic carousel** — works best with 3–5 slides. Beyond 5, the orb exits completely.
- **Canvas saves are per-slide** in localStorage, not persistent across devices or sessions.
- **No real-time collaboration** — tool is designed for solo use.

---

## 6. Open Loops / Future Ideas

- [ ] True panoramic: generate all slides from one wide Fabric canvas, then auto-slice
- [ ] Export carousel as MP4 slideshow (with swipe animation)
- [ ] Drag-to-reorder slides in Canvas Editor strip
- [ ] Cloud save (Supabase) instead of localStorage for canvas work
- [ ] Image background removal (background-removal API) before uploading to canvas
- [ ] Brand kit: save custom colors + fonts + logo once, auto-apply to all templates
