# My Creator Studio — Web Frontend

Next.js 16 frontend for the My Creator Studio platform. All UI runs here; API calls proxy server-side to the Python backend.

## Development

```bash
npm install
npm run dev       # http://localhost:3000  (hot-reload)
npm run lint      # ESLint check
npm run build     # Production build (same as Railway uses)
```

## Architecture

- **Route proxy** — browser never calls the Python API directly. All requests go through Next.js Route Handler catch-alls in `app/api/` which forward to `API_URL` (Docker internal: `http://api:8000`, Railway: private hostname).
- **`(dashboard)/layout.tsx`** — wraps every page with `<ReelGenerationProvider>` and renders `<GlobalReelStatus>` (floating reel-job pill).
- **`lib/ReelGenerationContext.tsx`** — global context for reel job state; polls `/api/reels/job/{id}` every 2 s; stops on terminal states.
- **UI** — Radix UI primitives + shadcn/ui, Tailwind CSS v4.

## Environment variables

| Variable | Value in Docker | Value on Railway |
|---|---|---|
| `API_URL` | `http://api:8000` | Railway private hostname |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` | `https://web-production-77b4e.up.railway.app` |

## Deployment

Deployed to Railway. Pushes to `master` trigger an automatic rebuild via the Dockerfile (production standalone build → `node server.js`). No local Docker needed for development — use `npm run dev` instead.

> **Note:** This project uses **Next.js 16**, which has breaking changes from earlier versions. Before adding any Next.js-specific code, check `node_modules/next/dist/docs/` for current API conventions.
