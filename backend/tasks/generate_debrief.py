"""Login debrief generation — PHASE_07."""

from __future__ import annotations

import asyncio

from celery_app import celery_app
from database import AsyncSessionLocal
from models.user import LoginDebrief
from services.building_service import get_territory_summary
from services.claude_service import generate_debrief_script_sync
from services.elevenlabs_service import generate_debrief_audio
from services.user_service import get_user_settings


@celery_app.task(name="tasks.generate_debrief.generate_user_debrief")
def generate_user_debrief(user_id: str):
    return asyncio.run(_generate_debrief_async(user_id))


async def _generate_debrief_async(user_id: str):
    async with AsyncSessionLocal() as db:
        territory_data = await get_territory_summary(db, user_id)
        script = generate_debrief_script_sync(user_id, territory_data)
        settings = await get_user_settings(db, user_id)
        voice_id = (
            "21m00Tcm4TlvDq8ikWAM"
            if not settings or settings.voice_model != "adam"
            else "pNInz6obpgDQGcFmaJgB"
        )
        audio_url = await generate_debrief_audio(script, voice_id, user_id)
        row = LoginDebrief(
            user_id=user_id,
            script_text=script,
            elevenlabs_audio_url=audio_url,
        )
        db.add(row)
        await db.commit()
