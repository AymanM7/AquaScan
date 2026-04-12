"""Dealroom memo cache + send stub — PHASE_08."""

from __future__ import annotations

import logging
import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from schemas.dealroom import DealroomMemoResponse, DealroomSendRequest, DealroomSendResponse
from services.building_service import get_building_detail

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/dealroom/{building_id}/cached-memo", response_model=DealroomMemoResponse)
async def api_dealroom_cached_memo(
    building_id: uuid.UUID,
    session: Annotated[AsyncSession, Depends(get_db)],
):
    b = await get_building_detail(session, building_id)
    if not b:
        raise HTTPException(status_code=404, detail={"error": "Not found", "code": "NOT_FOUND"})
    memo = (
        f"{b.name} — {b.roof_sqft:,} sqft roof, {b.annual_gallons / 1e6:.2f}M gal/yr capture potential, "
        f"{b.payback_years:.1f}yr payback, WRAI {b.wrai:.0f} ({b.wrai_badge}). "
        f"Drought: {b.drought_label}. Incentive: {b.program_name} (${b.rebate_usd:,})."
    )
    verdict = (
        "Proceed with site assessment and proposal — drought exposure and incentive window "
        "create board-level urgency. Recommend pilot authorization with phased installation."
    )
    return DealroomMemoResponse(memo=memo, mode="Executive", boardroom_verdict=verdict)


@router.post("/dealroom/{building_id}/send", response_model=DealroomSendResponse)
async def api_dealroom_send(
    building_id: uuid.UUID,
    body: DealroomSendRequest,
    session: Annotated[AsyncSession, Depends(get_db)],
):
    b = await get_building_detail(session, building_id)
    if not b:
        raise HTTPException(status_code=404, detail={"error": "Not found", "code": "NOT_FOUND"})
    logger.info(
        "Dealroom send approved (stub): building=%s to=%s",
        building_id,
        body.recipient_email,
    )
    return DealroomSendResponse(
        success=True,
        message=f"Dossier queued for {body.recipient_name or body.recipient_email} (demo: no email sent).",
    )
