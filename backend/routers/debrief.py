from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models.user import LoginDebrief
from schemas.ai import DebriefGenerateRequest
from services.building_service import get_territory_summary
from services.claude_service import generate_debrief_script_sync
from services.elevenlabs_service import generate_debrief_audio
from services.user_service import get_user_settings

router = APIRouter()


async def _latest_debrief_payload(session: AsyncSession, user_id: str) -> dict:
    r = await session.execute(
        select(LoginDebrief)
        .where(LoginDebrief.user_id == user_id)
        .order_by(LoginDebrief.generated_at.desc())
        .limit(1)
    )
    row = r.scalar_one_or_none()
    if not row:
        return {"script_text": None, "elevenlabs_audio_url": None}
    return {
        "script_text": row.script_text,
        "elevenlabs_audio_url": row.elevenlabs_audio_url,
    }


@router.get("/debrief")
async def get_latest_debrief_query(
    session: Annotated[AsyncSession, Depends(get_db)],
    user_id: str = Query(..., min_length=1, max_length=512),
):
    """Prefer this for user IDs that contain `@` or other path-sensitive characters."""
    return await _latest_debrief_payload(session, user_id)


@router.get("/debrief/{user_id}")
async def get_latest_debrief(
    user_id: str,
    session: Annotated[AsyncSession, Depends(get_db)],
):
    return await _latest_debrief_payload(session, user_id)


@router.post("/debrief/generate")
async def trigger_debrief(
    body: DebriefGenerateRequest,
    session: Annotated[AsyncSession, Depends(get_db)],
):
    territory_data = await get_territory_summary(session, body.user_id)
    script = generate_debrief_script_sync(body.user_id, territory_data)
    settings = await get_user_settings(session, body.user_id)
    voice_id = "pNInz6obpgDQGcFmaJgB"  # Adam-like default ElevenLabs id placeholder
    if settings and settings.voice_model == "rachel":
        voice_id = "21m00Tcm4TlvDq8ikWAM"
    audio_url = await generate_debrief_audio(script, voice_id, body.user_id)
    debrief = LoginDebrief(
        user_id=body.user_id,
        script_text=script,
        elevenlabs_audio_url=audio_url,
    )
    session.add(debrief)
    await session.commit()
    await session.refresh(debrief)
    return {
        "script_text": debrief.script_text,
        "elevenlabs_audio_url": debrief.elevenlabs_audio_url,
    }
