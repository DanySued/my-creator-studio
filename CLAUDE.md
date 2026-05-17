# My Creator Studio

Single-user Instagram content tool (carousels, reels, scheduling). No local dev — edit here, commit, push to `master`; Railway auto-deploys in ~2 min.

## Stack
FastAPI (Python 3.12) · Peewee ORM · PostgreSQL · APScheduler · Next.js App Router · TypeScript · Tailwind · shadcn/ui · Google Gemini · MoviePy · Pillow · Pexels API · Instagrapi

## Key paths
```
api/main.py            FastAPI entry, registers all routers
api/routers/           carousel.py, reels.py, instagram.py, automation.py, health.py
api/services/          gemini.py, video.py, instagram.py, instagram_oauth.py, pexels.py, job_queue.py
api/models/database.py Peewee DB init + models
api/models/schemas.py  Pydantic schemas (API contract source of truth)
web/app/(dashboard)/   All pages: carousel, reels, publish, accounts, automation, settings
web/app/api/           Next.js route handlers — proxy to FastAPI at API_URL env var
web/components/        carousel/, reels/, layout/, ui/ (shadcn)
```

## API conventions
- Frontend → `/api/<resource>` → Next.js proxy → FastAPI at `API_URL`
- Router prefixes: `/carousel`, `/reels`, `/instagram`, `/automation`, `/health`
- Background jobs: APScheduler + poll `GET /reels/job/{job_id}`
- Media stored at `/media` (Railway mounted volume)

## Data models
- Carousel: id, title, theme, slides (JSON), created_at
- Reel: id, title, keywords, duration, output_path, created_at
- Job: id, reel_id, status (queued→processing→awaiting_clip_approval→done/failed), progress
- InstagramAccount: id, username, session data, status
- ScheduledPost: id, account_id, media_path, caption, scheduled_at, status
- ActivityLog: id, account_id, action_type, message, created_at

## Production URLs
- Web: https://web-production-77b4e.up.railway.app
- API: https://my-creator-studio-production.up.railway.app

## Constraints
- No multi-tenancy — simple password gate only
- Instagrapi is unofficial IG API — respect rate limits, no aggressive automation
- Reel generation (MoviePy) is CPU-heavy — always run in background jobs
- Next.js App Router only — no Pages Router patterns
- Commit after each logical unit of work, not at session end
