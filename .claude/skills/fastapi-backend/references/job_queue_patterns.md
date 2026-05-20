# Job Queue & APScheduler Patterns

Source of truth: `api/services/job_queue.py`.

---

## Architecture Overview

Jobs use a **dual-write** pattern: every status transition writes to both the DB (`ReelJob`) and an in-memory dict (`JOBS`). The in-memory dict is the fallback if the DB lookup fails during polling — this handles edge cases where the DB record isn't committed yet.

```
JOBS: dict = {}   # In-memory fallback, keyed by job_id
scheduler: BackgroundScheduler | None = None   # Global singleton
```

## Scheduler Initialization

Always call `init_scheduler()` before `scheduler.add_job()`. It is idempotent (checks `if scheduler is None`).

```python
def init_scheduler():
    global scheduler
    if scheduler is None:
        scheduler = BackgroundScheduler()
        scheduler.start()
```

## Creating a New Job (Factory Pattern)

```python
def create_my_job(request: MyRequest) -> str:
    job_id = str(uuid.uuid4())
    resource_id = str(uuid.uuid4())

    # 1. Create DB records
    resource = MyModel.create(id=resource_id, ...)
    job = ReelJob.create(id=job_id, status="queued", progress=0, ...)

    # 2. Queue the background job
    init_scheduler()
    scheduler.add_job(
        _my_job_function,
        args=(job_id, resource_id, request),
        id=job_id,
        name=f"my_job_{job_id}",
    )

    # 3. Seed in-memory state
    JOBS[job_id] = {"status": "queued", "progress": 0, "error": None}
    return job_id
```

## Job Function Structure

Job functions MUST be **plain sync functions** — `BackgroundScheduler` cannot run `async def`. Use `asyncio_run()` for any async calls.

```python
def _my_job(job_id: str, resource_id: str, request: MyRequest) -> None:
    try:
        job = ReelJob.get_by_id(job_id)
        job.status = "processing"
        job.started_at = datetime.now()
        job.progress = 10
        job.save()
        JOBS[job_id] = {"status": "processing", "progress": 10, "error": None}

        # ... do work, update progress incrementally ...
        job.progress = 50
        job.save()
        JOBS[job_id]["progress"] = 50

        # Mark done
        job.status = "done"
        job.progress = 100
        job.completed_at = datetime.now()
        job.save()
        JOBS[job_id] = {"status": "done", "progress": 100, "error": None}

    except Exception as e:
        job = ReelJob.get_by_id(job_id)
        job.status = "failed"
        job.error_message = str(e)
        job.completed_at = datetime.now()
        job.save()
        JOBS[job_id] = {"status": "failed", "progress": job.progress, "error": str(e)}
```

## Two-Phase Job Pattern (Reel Generation)

The reel job pauses for user approval mid-way. The same pattern can be reused for any human-in-the-loop flow.

```
Phase 1 (_phase1_prepare_clips):
  queued (0%) -> processing (10-40%) -> awaiting_clip_approval (50%)

[User approves via POST /reels/approve-clips/{job_id}]

Phase 2 (_phase2_render_reel):
  processing (55-95%) -> done (100%)
```

Resuming phase 2 is a separate `scheduler.add_job()` call — APScheduler does not chain jobs automatically:

```python
def approve_clips(job_id: str) -> None:
    job = ReelJob.get_by_id(job_id)
    if job.status != "awaiting_clip_approval":
        raise ValueError(f"Job is not awaiting clip approval (status: {job.status})")

    job.status = "processing"
    job.progress = 55
    job.save()
    JOBS[job_id] = {"status": "processing", "progress": 55, "error": None}

    init_scheduler()
    scheduler.add_job(
        _phase2_render_reel,
        args=(job_id, str(job.reel_id)),
        id=f"{job_id}_phase2",
        name=f"reel_render_{job_id}",
    )
```

## Scheduled (Date-Trigger) Jobs

For "fire once at a specific datetime" jobs (like Instagram scheduled posts):

```python
scheduler.add_job(
    _execute_scheduled_post,
    trigger="date",
    run_date=scheduled_at,           # datetime object
    args=(post_id,),
    id=f"ig_post_{post_id}",
    name=f"ig_post_{post_id}",
    misfire_grace_time=300,          # fire up to 5 min late if server was down
)
```

## Async from Sync Context

Never call `asyncio.run()` directly — it fails on Windows when a loop is already running. Use the project's helper:

```python
def asyncio_run(coro):
    import sys
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()
```

## Status Polling Endpoint Pattern

```python
@router.get("/job/{job_id}", response_model=ReelJobResponse)
async def get_job(job_id: str):
    status = get_job_status(job_id)
    if status.get("status") == "not_found":
        raise HTTPException(status_code=404, detail="Job not found")
    return status
```

`get_job_status()` tries the DB first, falls back to `JOBS` dict, returns `{"status": "not_found"}` if neither has it.

## Job Progress Milestones (Reel Generation Reference)

| Progress | Phase | Event |
|----------|-------|-------|
| 0        | 1     | queued |
| 10       | 1     | processing started |
| 20       | 1     | Pexels search done |
| 40       | 1     | clips trimmed |
| 50       | 1     | awaiting_clip_approval |
| 55       | 2     | clips approved, phase 2 starting |
| 60       | 2     | concat done |
| 75       | 2     | scaled to 1080x1920 |
| 90       | 2     | audio mixed |
| 95       | 2     | overlays burned |
| 98-99    | 2     | subtitles burned (if enabled) |
| 100      | 2     | done |
