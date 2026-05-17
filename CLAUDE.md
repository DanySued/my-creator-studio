# My Creator Studio — Claude Context

## What this project is
An Instagram content-creation tool for a single user (Dany). Generates AI-powered carousels and video reels, manages Instagram accounts, and schedules posts. Deployed on Railway; there is no local dev — all changes are made here, committed, and pushed to GitHub so Railway auto-deploys.

---

## Stack
| Layer | Tech |
|-------|------|
| Backend | FastAPI (Python 3.12), Peewee ORM, PostgreSQL (Railway), APScheduler |
| Frontend | Next.js (App Router), TypeScript, Tailwind, shadcn/ui |
| AI | Google Gemini (`google-generativeai`) |
| Media | MoviePy, Pillow, Pexels API, Instagrapi |
| Infra | Railway (prod + deploy target) — no local dev |

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

docker-compose.yml     # Legacy local dev — not used, kept for reference only
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

## Production URLs
| Service | URL |
|---------|-----|
| Web (Next.js) | https://web-production-77b4e.up.railway.app |
| API (FastAPI) | https://my-creator-studio-production.up.railway.app |

These are the live sites. There is no local dev environment — test changes by verifying them on these URLs after deploy.

---

## Development workflow
1. Claude edits files in this repo.
2. After each logical change is complete, Claude commits and pushes to `master`.
3. Railway auto-deploys both `api` and `web` services within ~2 minutes of a push.
4. Dany verifies the change on the production URLs above.

**Commit after each logical unit of work** — don't batch everything to session end. Each push triggers Railway to rebuild and redeploy, so Dany sees the change while the session is still active.

---

## Important constraints
- Single-user app — no multi-tenancy, no user auth system (simple password gate)
- Instagrapi uses unofficial Instagram API — handle rate limits carefully, avoid aggressive automation
- Reel generation is CPU-heavy (MoviePy) — runs in background jobs, never block the request thread
- Next.js App Router only — no Pages Router patterns

---

## What NOT to read (already in .claudeignore)
`web/node_modules/`, `web/.next/`, `**/__pycache__/`, `media/`, `*.db`, `.env`, `scripts/`
