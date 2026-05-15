from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import httpx
import os
from models.database import db

router = APIRouter()


class KeyPayload(BaseModel):
    apiKey: str


@router.post("/gemini")
async def test_gemini(payload: KeyPayload):
    """Test a Gemini API key by making a minimal generation call."""
    url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent"
    headers = {"Content-Type": "application/json"}
    params = {"key": payload.apiKey}
    body = {"contents": [{"parts": [{"text": "Say OK"}]}]}

    async with httpx.AsyncClient(timeout=10) as client:
        try:
            r = await client.post(url, json=body, headers=headers, params=params)
        except httpx.ConnectError:
            raise HTTPException(status_code=502, detail="Could not reach Google — check your internet connection")

    if r.status_code == 400:
        raise HTTPException(status_code=400, detail="API key is invalid or malformed")
    if r.status_code == 403:
        raise HTTPException(status_code=403, detail="API key is valid but access is denied — check billing or project restrictions")
    if r.status_code == 429:
        raise HTTPException(status_code=429, detail="Quota exceeded — wait a minute and try again (free tier: 15 req/min)")
    if not r.is_success:
        raise HTTPException(status_code=r.status_code, detail=f"Gemini error: {r.text[:200]}")

    _save_env_key("GEMINI_API_KEY", payload.apiKey)
    return {"ok": True}


@router.post("/pexels")
async def test_pexels(payload: KeyPayload):
    """Test a Pexels API key by fetching one video result."""
    url = "https://api.pexels.com/videos/search"
    headers = {"Authorization": payload.apiKey}
    params = {"query": "nature", "per_page": 1}

    async with httpx.AsyncClient(timeout=10) as client:
        try:
            r = await client.get(url, headers=headers, params=params)
        except httpx.ConnectError:
            raise HTTPException(status_code=502, detail="Could not reach Pexels — check your internet connection")

    if r.status_code == 401:
        raise HTTPException(status_code=401, detail="API key is invalid — copy your key again from pexels.com/api")
    if r.status_code == 429:
        raise HTTPException(status_code=429, detail="Rate limit hit — free tier allows 200 req/hour, try again shortly")
    if not r.is_success:
        raise HTTPException(status_code=r.status_code, detail=f"Pexels error: {r.text[:200]}")

    _save_env_key("PEXELS_API_KEY", payload.apiKey)
    return {"ok": True}


@router.get("/backend")
def backend_health():
    """Liveness check — reports DB connectivity so Railway healthcheck can track it."""
    db_error = None
    try:
        with db.connection_context():
            db.execute_sql("SELECT 1")
    except Exception as exc:
        db_error = str(exc)
    return {
        "ok": True,
        "db": db_error is None,
        "db_error": db_error,
        "gemini_configured": bool(os.getenv("GEMINI_API_KEY")),
        "pexels_configured": bool(os.getenv("PEXELS_API_KEY")),
    }


def _save_env_key(key: str, value: str):
    """Append or update a key in $DATA_DIR/.env.keys (persistent across restarts)."""
    env_file = os.path.join(os.getenv("DATA_DIR", "/data"), ".env.keys")
    os.makedirs(os.path.dirname(env_file), exist_ok=True)
    lines = []
    try:
        with open(env_file) as f:
            lines = [l for l in f.readlines() if not l.startswith(f"{key}=")]
    except FileNotFoundError:
        pass
    lines.append(f"{key}={value}\n")
    with open(env_file, "w") as f:
        f.writelines(lines)
    os.environ[key] = value
