# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

My Creator Studio is a self-hosted Instagram content automation platform. It has two services:

- **`api/`** — Python FastAPI backend (port 8000), running via Uvicorn inside Docker
- **`web/`** — Next.js 16 frontend (port 3000), also Dockerized

Both services are orchestrated with `docker-compose.yml` for local development and deployed to **Railway** in production. The database is SQLite locally (Peewee ORM, persisted in a Docker volume at `/data/studio.db`) and PostgreSQL on Railway (via `DATABASE_URL`). Generated media (reels, carousel slides) lives in `/media/`, mounted from `./media/` on the host.

## Running the project

**Full stack (recommended):**
```bash
# Copy and fill in .env before first run
cp .env.example .env
docker compose up --build
```

**Frontend only (local dev, hot-reload):**
```bash
cd web
npm install
npm run dev       # http://localhost:3000
```

**Backend only (local dev):**
```bash
cd api
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

**Lint frontend:**
```bash
cd web && npm run lint
```

## Architecture: API proxy pattern

The Next.js frontend **never calls the Python API directly from the browser**. All API calls go through Next.js Route Handler catch-alls:

- `web/app/api/instagram/[...path]/route.ts` → proxies to `http://localhost:8000/instagram/**`
- `web/app/api/carousel/`, `web/app/api/reels/`, `web/app/api/automation/` — same pattern

The server-side environment variable `API_URL` uses Docker's internal hostname (`http://api:8000`). In local dev without Docker it falls back to `http://localhost:8000`. The browser only ever talks to `localhost:3000/api/...`.

## Architecture: Python API

Routers in `api/routers/` are thin HTTP handlers. Business logic lives in `api/services/`:

| Service | Responsibility |
|---|---|
| `gemini.py` | Google Gemini AI — carousel slide generation |
| `pexels.py` | Pexels API — stock video search & download |
| `video.py` | MoviePy/FFmpeg — trim, concat, scale, mix audio, burn text overlay |
| `instagram.py` | instagrapi (private API) — post media, fetch comments/followers |
| `instagram_oauth.py` | Official Meta OAuth 2.0 flow — token exchange, refresh |
| `automation.py` | Comment auto-reply, follower snapshots, welcome DMs, growth actions |
| `job_queue.py` | APScheduler — background reel generation jobs and scheduled posts |

## Architecture: database models (Peewee ORM — SQLite locally / PostgreSQL on Railway)

All models are in `api/models/database.py`. Key relationships:

- `Carousel` → `CarouselSlide` (1:many)
- `Reel` → `ReelJob` (1:many, job tracks async progress 0–100%)
- `InstagramAccount` → `ScheduledPost`, `AutoReplyRule`, `AutoDMRule`, `FollowerSnapshot`, `DailyActionCount`

`InstagramAccount` supports two auth methods stored on the same row:
- `auth_method="password"` — instagrapi session JSON in `session_data`
- `auth_method="oauth"` — Meta Graph API `access_token` + `instagram_user_id`

## Architecture: Next.js frontend

- **Route group `(dashboard)/`** — all authenticated pages share `layout.tsx` which wraps children with `<ReelGenerationProvider>` and renders `<GlobalReelStatus>` (floating reel job progress overlay)
- **`contexts/ReelGenerationContext`** — global React context that tracks reel generation job state; components poll the job status endpoint via this context rather than managing their own state
- **UI components** — Radix UI primitives + shadcn/ui, styled with Tailwind CSS v4

## Environment variables

See `.env.example` for the full list. Required external services:

| Variable | Service |
|---|---|
| `GEMINI_API_KEY` | Google AI Studio — carousel generation |
| `PEXELS_API_KEY` | Pexels — stock footage for reels |
| `INSTAGRAM_APP_ID` / `INSTAGRAM_APP_SECRET` | Meta Developer app (OAuth) |
| `UPSTASH_REDIS_REST_URL` / `_TOKEN` | Upstash Redis — job caching, rate limits |
| `QSTASH_TOKEN` / signing keys | Upstash QStash — durable scheduled posts |
| `DATABASE_URL` | PostgreSQL connection string — set automatically by Railway via `${{Postgres.DATABASE_URL}}` |

## Next.js version note

This project uses **Next.js 16**, which has breaking changes from earlier versions. Before writing any Next.js code, check `web/node_modules/next/dist/docs/` for current API conventions. The `web/AGENTS.md` file (loaded as `web/CLAUDE.md`) contains this warning too.

## Railway deployment

Production runs on Railway (project: `my-creator-studio`, environment: `production`) with three services:

| Service | Source | Public URL |
|---|---|---|
| `my-creator-studio` (API) | `api/` via `api/railway.toml` | `my-creator-studio-production.up.railway.app` |
| `web` | `web/` via `web/railway.toml` | `web-production-77b4e.up.railway.app` |
| `Postgres` | Railway managed image | internal only (`postgres.railway.internal:5432`) |

Both app services deploy automatically on push to `master`. The API healthcheck path is `/health/backend`; the web healthcheck path is `/`. The web service reaches the API via Railway's private network using the `API_URL` environment variable (set to the API's internal Railway hostname).

## Reel generation flow

1. Client POSTs to `/api/reels/generate` (Next.js proxy → FastAPI)
2. FastAPI creates a `ReelJob` record and queues an APScheduler job → returns `job_id`
3. Background job: search Pexels → download clips → trim → concat → scale to 9:16 → mix audio → burn text overlay
4. Client polls `/api/reels/job/[id]` for `status` and `progress` (0–100%)
5. On completion, the final MP4 is at `MEDIA_DIR/generated/reels/{reel_id}/final.mp4`, served via FastAPI's `/media/` static mount
