---
name: fastapi-backend
description: |
  This skill should be used when working on the My Creator Studio backend: adding FastAPI routes,
  Peewee ORM models, background job queue tasks, APScheduler jobs, or Pydantic schemas.
  Trigger on any request to add or modify routes, database models, services, job queue logic,
  or backend architecture in the api/ directory of this project.
---

# FastAPI Backend Skill — My Creator Studio

This project runs FastAPI + Peewee ORM + PostgreSQL + APScheduler on Railway. All backend code lives under `api/`.

## Key Paths

```
api/main.py                  FastAPI entry point — registers all routers
api/routers/                 carousel.py, reels.py, instagram.py, automation.py, health.py
api/services/                gemini.py, video.py, instagram.py, instagram_oauth.py, pexels.py, job_queue.py
api/models/database.py       Peewee DB init + all ORM models
api/models/schemas.py        Pydantic schemas (API contract source of truth)
```

## Router Conventions

- Every router file starts with `router = APIRouter()` (no prefix — prefix is set in `main.py`).
- Router prefixes: `/carousel`, `/reels`, `/instagram`, `/automation`, `/health`.
- Always use Pydantic `response_model=` on every route.
- Validate at the boundary: raise `HTTPException(status_code=400, ...)` for bad input, `404` for not found, `500` for unexpected failures.
- Pattern: validate input → call service/job_queue function → return result. Keep route handlers thin.

```python
from fastapi import APIRouter, HTTPException
from models.schemas import MyRequest, MyResponse
from models.database import MyModel

router = APIRouter()

@router.post("/resource", response_model=MyResponse)
async def create_resource(request: MyRequest):
    try:
        result = some_service_function(request)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    return result
```

## Peewee ORM Patterns

- All models inherit from `BaseModel` (defined in `database.py`) — never from `peewee.Model` directly.
- Use `CharField(primary_key=True)` with `str(uuid.uuid4())` for all PKs.
- Add new columns via the safe migration block in `init_db()`, never raw `CREATE TABLE`.
- Register new models in the `db.create_tables([...], safe=True)` call inside `init_db()`.
- Use `Model.get_by_id(id)` for lookups — wrap in try/except, raise `ValueError` on miss.
- JSON blobs (arrays, dicts) are stored as `TextField` with manual `json.dumps` / `json.loads`.

```python
# Adding a new model
class MyNewModel(BaseModel):
    id = CharField(primary_key=True)
    name = CharField()
    data = TextField(null=True)   # JSON blob
    created_at = DateTimeField(default=datetime.now)

    class Meta:
        table_name = "my_new_models"

# Safe migration for new columns on existing tables
for table, col, col_type in [
    ("my_new_models", "extra_field", "TEXT"),
]:
    try:
        db.execute_sql(f"ALTER TABLE {table} ADD COLUMN {col} {col_type}")
    except Exception:
        pass
```

## Pydantic Schema Conventions

- Schemas live in `api/models/schemas.py` — this is the API contract source of truth.
- Naming: `{Resource}Request`, `{Resource}Response`, `{Resource}ListResponse`.
- Use `str | None` (union syntax, Python 3.10+) for optional fields, not `Optional[str]`.
- `datetime` fields in responses are returned as-is (FastAPI serializes them to ISO strings).

## Background Job Queue (APScheduler)

All CPU-heavy or async work runs as a background job. See `references/job_queue_patterns.md` for full patterns.

Key rules:
- Always call `init_scheduler()` before `scheduler.add_job(...)` — it is idempotent.
- Job functions must be **plain sync functions** (not `async def`) when added to `BackgroundScheduler`.
- Dual-write every status change: both to `ReelJob` (DB) and `JOBS` dict (in-memory fallback).
- Job status lifecycle: `queued` → `processing` → `awaiting_clip_approval` → `processing` → `done` / `failed`.
- Always set `job.completed_at = datetime.now()` and call `job.save()` on both `done` and `failed` paths.
- Async helpers called from sync job functions must use `asyncio_run()` (defined in `job_queue.py`), not `asyncio.run()` (breaks on Windows).

## Adding a New Background Job

1. Create a plain sync function `_my_job(job_id: str, ...) returning None` in `job_queue.py`.
2. Create a `create_my_job(...)` factory: creates DB record, calls `init_scheduler()`, calls `scheduler.add_job(...)`.
3. Add a status-poll endpoint in the relevant router: `GET /resource/job/{job_id}`.
4. The job function must catch all exceptions and write `status="failed"` + `error_message` on failure.

## Reference Files

Load these into context as needed:

- `references/schema.md` — complete DB model + Pydantic schema reference for all models
- `references/job_queue_patterns.md` — APScheduler job patterns, phase architecture, in-memory fallback
