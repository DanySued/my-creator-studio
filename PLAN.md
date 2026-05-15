# My Creator Studio — Build Plan

> **Personal content studio** merging three projects (carroussel, viralvibe, instagram-automation-bot) into one unified dashboard.
> All four phases are complete and deployed to Railway. This file is kept as a historical record.

---

## Status Legend
- `[ ]` Not started
- `[~]` In progress
- `[x]` Done
- `[!]` Blocked / needs attention

---

## Architecture

```
my-creator-studio/
├── web/                  # Next.js 16 — all three tool UIs + BFF API routes
│   ├── app/
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx       # Sidebar + top bar
│   │   │   ├── page.tsx         # Home / overview
│   │   │   ├── carousel/        # Carousel generator
│   │   │   ├── reels/           # Reels generator
│   │   │   ├── publish/         # Post & schedule
│   │   │   ├── accounts/        # Instagram accounts
│   │   │   └── settings/        # API keys + health checks
│   │   └── api/                 # BFF proxy routes to Python
│   ├── components/
│   │   ├── layout/              # Sidebar, TopBar, StatusBar
│   │   ├── carousel/            # Migrated from carroussel
│   │   ├── reels/               # Migrated from viralvibe
│   │   ├── publish/             # New
│   │   └── ui/                  # shadcn/ui primitives
│   └── package.json
│
├── api/                  # Python FastAPI — heavy lifting
│   ├── main.py
│   ├── routers/
│   │   ├── carousel.py          # Gemini AI calls
│   │   ├── reels.py             # Pexels + ffmpeg video pipeline
│   │   ├── instagram.py         # instagrapi posting + scheduling
│   │   └── health.py            # Tests every API connection
│   ├── services/
│   │   ├── gemini.py
│   │   ├── pexels.py
│   │   ├── video.py             # ffmpeg pipeline
│   │   └── instagram.py
│   ├── models/
│   │   ├── database.py          # Peewee SQLite models
│   │   └── schemas.py           # Pydantic schemas
│   ├── data/
│   │   └── studio.db            # SQLite — accounts, schedule, logs
│   └── requirements.txt
│
├── media/                # Shared local storage (Docker volume)
│   ├── generated/               # Carousel PNGs + Reel MP4s
│   ├── uploads/                 # User uploads (docs, audio)
│   └── music/                   # Audio library
│
├── docker-compose.yml    # `docker compose up` starts everything
├── .env.example          # All env vars documented
└── PLAN.md               # This file
```

**Key decisions:**
- Docker Compose orchestrates both services locally — one command to run
- ffmpeg runs inside Docker — no manual install needed
- Next.js API routes proxy to Python — no CORS issues in the UI
- SQLite locally (Peewee ORM, `/data/studio.db`) — PostgreSQL on Railway (auto-wired via `DATABASE_URL`)
- Media files in a shared volume — no cloud storage needed
- Deployed to Railway; both app services auto-deploy on push to `master`

---

## Required Setup (do before coding)

| Tool | Purpose | Status | Notes |
|------|---------|--------|-------|
| Docker Desktop | Runs both services + ffmpeg | `[ ]` | docker.com/products/docker-desktop |
| Node.js 20 LTS | Next.js frontend | `[ ]` | nodejs.org |
| Google Gemini API key | Carousel AI generation | `[ ]` | aistudio.google.com → Get API key |
| Pexels API key | Stock footage for reels | `[ ]` | pexels.com/api |

---

## Phase 1 — Foundation
> Goal: New repo running, dashboard shell up, Settings page shows live health checks for all integrations.

### 1.1 Repo & Project Structure
- [x] Create `my-creator-studio/` directory
- [x] Initialize git repo
- [x] Create `web/` — Next.js 16 app with TypeScript + Tailwind CSS 4 + shadcn/ui (base-ui)
- [x] Create `api/` — Python FastAPI skeleton
- [x] Create `media/` folder structure
- [x] Create `docker-compose.yml`
- [x] Create `.env.example` with all required variables documented

### 1.2 Dashboard Shell (Next.js)
- [x] Sidebar with navigation: Carousel, Reels, Publish, Accounts, Settings
- [x] Top bar with page title + description
- [x] Placeholder pages for each section
- [x] Dark theme, high-fidelity design (violet accent, glass-style cards)
- [x] Route: `/` → redirects to `/dashboard`; all sections at their own paths

### 1.3 Python API Skeleton
- [x] FastAPI app with CORS configured
- [x] Health check router — tests Gemini, Pexels connections
- [x] Serve media files statically
- [x] Router stubs for carousel, reels, instagram
- [x] Dockerfile for the API service (includes ffmpeg)

### 1.4 Settings Page
- [x] API key input fields (Gemini, Pexels) with show/hide toggle
- [x] Connection status cards (✅/❌/checking) for each integration
- [x] "Test" button — calls backend health endpoint, saves key on success
- [x] Step-by-step setup guide inline (collapsible)
- [x] Troubleshooting tips shown when connection fails
- [x] Backend service guide (how to run, first-time setup tips)
- [x] Instagram account cards — add / remove / check session status (Phase 4)

### 1.5 Docker Compose
- [x] `web` service: Next.js on port 3000
- [x] `api` service: FastAPI on port 8000, ffmpeg installed via apt
- [x] Shared `media/` volume
- [x] `api_data` named volume for SQLite persistence
- [x] Verified end-to-end `docker compose up` flow

---

## Phase 2 — Carousel Tool
> Goal: Full carousel generation working inside the unified UI. Source: `carroussel/` repo.

### 2.1 Migrate Frontend
- [x] Port `UploadZone` component — accepts PDF, DOCX, TXT
- [x] Port `ConfigPanel` — slide count, language, theme selector
- [x] Port `SlidePreview` + `SlideStrip` — inline editing
- [x] Port `ThemeSelector` with all original themes
- [x] Port `GalleryPage` — browse generated carousels
- [x] Port `SettingsPage` — export quality (pixel ratio)
- [x] Port image crop tool (`react-easy-crop`)

### 2.2 Backend (Gemini API)
- [x] `POST /carousel/generate` — accepts text, returns slide JSON array (from `carroussel/api/generate.ts`, rewritten in Python)
- [x] `POST /carousel/export` — accepts slide data, returns ZIP of PNGs
- [x] `GET /carousel/history` — lists past generated carousels from SQLite

### 2.3 Wire Up
- [x] Next.js API route `/api/carousel/*` proxies to Python
- [x] Text extraction (PDF/DOCX) stays client-side (pdfjs-dist + mammoth)
- [x] Export ZIP downloads correctly from Python response
- [x] Error handling: Gemini quota exceeded, invalid file type, empty content

---

## Phase 3 — Reels Tool
> Goal: Full reel generation working. Source: `viralvibe/` repo + its separate backend.

### 3.1 Migrate Frontend
- [x] Port `KeywordEngine` — tag-based keyword input
- [x] Port `AudioLibrary` — upload and select music tracks
- [x] Port `BulkSettings` — reel count, duration, song start time
- [x] Port `TextOverlays` — add/edit/position text burned into video
- [x] Port `Timeline` — song timeline / clip trim UI
- [x] Port `VideoPreview` — preview generated reel
- [x] Port `MyReelsPage` — library of all generated reels

### 3.2 Backend (Pexels + ffmpeg)
- [x] `POST /reels/generate` — accepts keywords + audio + settings, queues job
- [x] `GET /reels/job/{id}` — polls job status (queued → processing → done)
- [x] `GET /reels/list` — lists all generated reels
- [x] `POST /reels/upload-audio` — saves audio track to `media/music/`
- [x] `GET /reels/audio` — lists audio library
- [x] ffmpeg pipeline: fetch Pexels clips → trim → concat → mix audio → burn text → 1080×1920 MP4

### 3.3 Wire Up
- [x] Job polling via Server-Sent Events (SSE) or 2s interval
- [x] Progress bar during generation
- [x] Download generated reel
- [x] Error handling: Pexels quota, ffmpeg failure, no clips found for keyword

---

## Phase 4 — Publish & Automation
> Goal: End-to-end create → publish flow. Source: `instagram-automation-bot/` repo.

### 4.1 Instagram Account Manager
- [x] Add account — username + password → instagrapi login → session saved to SQLite
- [x] 2FA handling — prompt for code in UI
- [x] Challenge handling — show challenge type + instructions
- [x] Account cards showing: avatar, username, session status, last active
- [x] Remove account — clears session from DB

### 4.2 Publish Page
- [x] Media picker — select from generated carousels or reels, or upload directly
- [x] Caption editor with character count + hashtag suggestions
- [x] Account selector (which account to post from)
- [x] Post type selector: Feed Post, Reel, Story, Carousel
- [x] Post Now button
- [x] Schedule — date/time picker → adds to schedule queue

### 4.3 Schedule Queue
- [x] List of scheduled posts (pending, posted, failed)
- [x] Cancel / reschedule
- [x] APScheduler running in Python background — fires posts at scheduled time
- [x] Retry on failure with notification in activity log

### 4.4 Automation (from instagram-automation-bot)
- [x] Auto-reply rules — define keyword → reply template
- [x] Auto-like by hashtag — configure hashtag + daily limit
- [x] Auto-follow by hashtag
- [x] Activity log — real-time stream of all actions (SSE)

### 4.5 Wire Up
- [x] `POST /instagram/post` — post immediately
- [x] `POST /instagram/schedule` — schedule post
- [x] `GET /instagram/queue` — list scheduled posts
- [x] `POST /instagram/auto-reply` — create/update rule
- [x] `GET /instagram/log` — SSE stream of activity log

---

## Environment Variables Reference

```env
# Gemini (carousel AI)
GEMINI_API_KEY=your_key_here

# Pexels (stock footage)
PEXELS_API_KEY=your_key_here

# Meta Developer app (Instagram OAuth)
INSTAGRAM_APP_ID=your_app_id
INSTAGRAM_APP_SECRET=your_app_secret

# Upstash Redis (job caching, rate limits)
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=your_token

# Upstash QStash (durable scheduled posts)
QSTASH_TOKEN=your_token
QSTASH_CURRENT_SIGNING_KEY=your_key
QSTASH_NEXT_SIGNING_KEY=your_key

# PostgreSQL — set automatically by Railway via ${{Postgres.DATABASE_URL}}
DATABASE_URL=postgresql://...

# Internal API URL (set automatically by Docker Compose / Railway)
API_URL=http://api:8000

# Next.js (set automatically)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## How to Run (once built)

```bash
# Start everything
docker compose up

# Open the app
# → http://localhost:3000

# Stop
docker compose down

# Rebuild after code changes
docker compose up --build
```

---

## Session Log

| Date | Session | What was done |
|------|---------|---------------|
| 2026-05-06 | 1 | Phase 1 complete: repo init, Next.js 16 dashboard shell, Python API skeleton, Settings page with health checks + guided setup, Docker Compose |
| 2026-05-06–09 | 2–N | Phases 2–4 complete: carousel generator, reel generator with APScheduler job queue, Instagram account management (password + OAuth), publish page, schedule queue, automation rules |
| 2026-05-15 | — | Deployed to Railway (API + web + Postgres). Reel generation refactored to 2-phase progress (0→100% per phase) with smooth RAF animation. FastAPI `response_model` schema updated to expose `phase`/`phase_progress`. |
