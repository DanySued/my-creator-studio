<!-- BEGIN:nextjs-agent-rules -->
# Next.js conventions in this project

- **App Router only** — all pages are in `app/`. No `pages/` directory.
- **Route groups**: `(dashboard)/` wraps all authenticated pages with a shared layout.
- **API proxy pattern**: `app/api/<resource>/route.ts` files proxy requests to the FastAPI backend at `process.env.API_URL`. Do not add business logic here — just forward.
- **Components**: `components/ui/` = shadcn primitives (don't edit). Feature components live in `components/carousel/`, `components/reels/`, `components/layout/`.
- **Styling**: Tailwind only — no CSS modules, no inline styles.
- **Auth**: middleware.ts handles session checks. Login page is `app/login/`.
<!-- END:nextjs-agent-rules -->
