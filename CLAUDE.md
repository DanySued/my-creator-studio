# My Creator Studio — Claude Context

## What this project is
An Instagram content-creation tool for a single user (Dany). Generates AI-powered carousels and video reels, manages Instagram accounts, and schedules posts. Deployed on Railway; auto-commits and pushes on every Claude session stop.

---

## Stack
| Layer | Tech |
|-------|------|
| Backend | FastAPI (Python 3.12), Peewee ORM, PostgreSQL (Railway), APScheduler |
| Frontend | Next.js (App Router), TypeScript, Tailwind, shadcn/ui |
| AI | Google Gemini (`google-generativeai`) |
| Media | MoviePy, Pillow, Pexels API, Instagrapi |
| Infra | Railway (prod), Docker Compose (local) |

---

## Key paths
```
api/
  main.py              # FastAPI app entry — registers all routers
  routers/             # carousel.py, reels.py, instagram.py, automation.py, health.py
  services/            # gemini.py, video.py, instagram.py, instagram_oauth.py, pexels.py, job_queue.py
  models/
    database.py        # Peewee DB init + model definitions
    schemas.py         # Pydantic request/response schemas (source of truth for API contracts)

web/
  app/
    (dashboard)/       # All authenticated pages: carousel, reels, publish, accounts, automation, settings
    api/               # Next.js API routes that proxy to FastAPI backend
    login/             # Auth page
    instagram/callback/ # OAuth callback
  components/
    carousel/          # Carousel editor UI components
    reels/             # Reels editor UI components
    layout/            # Sidebar, nav
    ui/                # shadcn primitives

docker-compose.yml     # Local dev: api:8000, web:3000
.env                   # Secrets — never commit (already in .claudeignore)
```

---

## API conventions
- Frontend calls `/api/<resource>` → Next.js route handler → proxies to FastAPI at `API_URL` (env var)
- All FastAPI endpoints live under their router prefix: `/carousel`, `/reels`, `/instagram`, `/automation`, `/health`
- Background jobs (reel generation) use APScheduler + job status polling via `GET /reels/job/{job_id}`
- Media files (videos, audio, images) are stored on the server filesystem under `/media` (mounted volume)

---

## Data models summary
- **Carousel**: id, title, theme, slides (JSON), created_at
- **Reel**: id, title, keywords, duration, output_path, created_at
- **Job**: id, reel_id, status (queued→processing→awaiting_clip_approval→done/failed), progress
- **InstagramAccount**: id, username, session data, status
- **ScheduledPost**: id, account_id, media_path, caption, scheduled_at, status
- **ActivityLog**: id, account_id, action_type, message, created_at

---

## Local dev
```bash
docker compose up          # starts api (8000) + web (3000)
docker compose up api      # backend only
```

---

## Deploy
- **Railway** hosts both services. Pushing to `master` triggers a deploy automatically.
- A git hook auto-commits and pushes all changes at the end of every Claude session.
- Do NOT manually commit during a session unless testing git history — the hook handles it.

---

## Important constraints
- Single-user app — no multi-tenancy, no user auth system (simple password gate)
- Instagrapi uses unofficial Instagram API — handle rate limits carefully, avoid aggressive automation
- Reel generation is CPU-heavy (MoviePy) — runs in background jobs, never block the request thread
- Next.js App Router only — no Pages Router patterns

---

## What NOT to read (already in .claudeignore)
`web/node_modules/`, `web/.next/`, `**/__pycache__/`, `media/`, `*.db`, `.env`, `scripts/`
