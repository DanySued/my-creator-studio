from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel
import os

router = APIRouter()

_DEFAULT_DIR = os.path.join(
    os.path.dirname(__file__),
    "..",
    "..",
    "Green and Yellow Simple Local Gems Carousel Instagram Post",
)
TEMPLATES_DIR = os.path.abspath(os.getenv("SVG_TEMPLATES_DIR", _DEFAULT_DIR))


def _safe_path(name: str) -> str:
    if not name.endswith(".svg") or "/" in name or "\\" in name or ".." in name:
        raise HTTPException(status_code=400, detail="Invalid template name")
    path = os.path.abspath(os.path.join(TEMPLATES_DIR, name))
    if not path.startswith(TEMPLATES_DIR):
        raise HTTPException(status_code=400, detail="Invalid template name")
    return path


@router.get("/")
def list_templates():
    if not os.path.isdir(TEMPLATES_DIR):
        return {"templates": []}
    files = sorted(f for f in os.listdir(TEMPLATES_DIR) if f.endswith(".svg"))
    return {"templates": files}


@router.get("/{name}")
def get_template(name: str):
    path = _safe_path(name)
    if not os.path.isfile(path):
        raise HTTPException(status_code=404, detail="Template not found")
    with open(path, "rb") as f:
        content = f.read()
    return Response(content=content, media_type="image/svg+xml")


class SaveRequest(BaseModel):
    svg_content: str


@router.put("/{name}")
def save_template(name: str, body: SaveRequest):
    path = _safe_path(name)
    if not os.path.isfile(path):
        raise HTTPException(status_code=404, detail="Template not found")
    with open(path, "w", encoding="utf-8") as f:
        f.write(body.svg_content)
    return {"status": "saved"}
