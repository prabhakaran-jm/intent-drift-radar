"""FastAPI app: API + static frontend from backend/static."""

from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from .storage import load, save

app = FastAPI(title="Intent Drift Radar")

STATIC_DIR = Path(__file__).resolve().parent.parent / "static"

# API routes first so /api/* is not caught by SPA catch-all
@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/api/data/{name}")
def get_data(name: str):
    data = load(name)
    return {"name": name, "data": data}


@app.post("/api/data/{name}")
def set_data(name: str, body: dict):
    save(name, body)
    return {"name": name, "saved": True}


# Serve built frontend from backend/static
if STATIC_DIR.exists():
    assets_dir = STATIC_DIR / "assets"
    if assets_dir.is_dir():
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/{path:path}")
    def serve_spa(path: str):
        if path and not path.startswith("api/"):
            f = STATIC_DIR / path
            if f.is_file():
                return FileResponse(f)
        return FileResponse(STATIC_DIR / "index.html")
