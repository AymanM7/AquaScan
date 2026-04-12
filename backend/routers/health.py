from fastapi import APIRouter
from starlette.requests import Request

router = APIRouter()


@router.get("/health")
async def health(request: Request):
    """Include `service` + `api_version` so you can confirm this is the full RainUSE API (not a stub on :8000)."""
    return {
        "status": "ok",
        "service": "rainuse-nexus",
        "api_version": request.app.version,
    }
