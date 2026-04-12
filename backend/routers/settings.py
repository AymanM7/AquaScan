from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models.user import UserSettings
from schemas.settings import SaveSettingsRequest, UserSettingsSchema

router = APIRouter()


@router.get("/settings/{user_id}", response_model=UserSettingsSchema)
async def get_settings(
    user_id: str,
    session: Annotated[AsyncSession, Depends(get_db)],
):
    r = await session.execute(select(UserSettings).where(UserSettings.user_id == user_id))
    row = r.scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail={"error": "Not found", "code": "NOT_FOUND"})
    return UserSettingsSchema(
        user_id=row.user_id,
        territory=row.territory or "DFW",
        cadence=row.cadence or "weekly",
        score_threshold=row.score_threshold or 75,
        onboarding_complete=bool(row.onboarding_complete),
        rep_zip=row.rep_zip,
        notification_email=bool(row.notification_email),
        voice_model=row.voice_model or "rachel",
    )


@router.post("/settings/{user_id}", response_model=UserSettingsSchema)
async def save_settings(
    user_id: str,
    body: SaveSettingsRequest,
    session: Annotated[AsyncSession, Depends(get_db)],
):
    r = await session.execute(select(UserSettings).where(UserSettings.user_id == user_id))
    row = r.scalar_one_or_none()
    if row:
        row.territory = body.territory
        row.cadence = body.cadence
        row.score_threshold = body.score_threshold
        row.onboarding_complete = body.onboarding_complete
        if body.rep_zip is not None:
            row.rep_zip = body.rep_zip
        if body.notification_email is not None:
            row.notification_email = body.notification_email
        if body.voice_model is not None:
            row.voice_model = body.voice_model
    else:
        row = UserSettings(
            user_id=user_id,
            territory=body.territory,
            cadence=body.cadence,
            score_threshold=body.score_threshold,
            onboarding_complete=body.onboarding_complete,
            rep_zip=body.rep_zip,
            notification_email=body.notification_email
            if body.notification_email is not None
            else True,
            voice_model=body.voice_model or "rachel",
        )
        session.add(row)
    await session.commit()
    await session.refresh(row)
    # Celery Beat schedule: Phase 07
    return UserSettingsSchema(
        user_id=row.user_id,
        territory=row.territory or "DFW",
        cadence=row.cadence or "weekly",
        score_threshold=row.score_threshold or 75,
        onboarding_complete=bool(row.onboarding_complete),
        rep_zip=row.rep_zip,
        notification_email=bool(row.notification_email),
        voice_model=row.voice_model or "rachel",
    )
