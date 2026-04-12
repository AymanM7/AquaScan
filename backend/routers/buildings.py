import uuid
from dataclasses import asdict
from typing import Annotated

import logging

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from schemas.ai import MemoRequest
from schemas.building import (
    BuildingDetail,
    BuildingListResponse,
    HarvestOutput,
    ViabilityScoreResponse,
)
from services.building_service import get_building_detail, get_harvest_context, list_buildings
from services.hydrology import compute_water_twin
from services.claude_service import generate_boardroom, stream_deal_memo
from services.gemini_service import generate_voice_pitch_sync
from services.scoring import compute_full_score

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/buildings", response_model=BuildingListResponse)
async def api_list_buildings(
    session: Annotated[AsyncSession, Depends(get_db)],
    state: str = Query(..., min_length=2, max_length=2),
    min_score: float | None = None,
    min_roof: int | None = None,
    sector: str | None = None,
    cooling_tower: bool | None = None,
    min_drought: int | None = None,
    wrai_min: float | None = None,
    limit: int = Query(500, ge=1, le=2000),
):
    data, filters_applied = await list_buildings(
        session,
        state=state.upper(),
        min_score=min_score,
        min_roof=min_roof,
        sector=sector,
        cooling_tower=cooling_tower,
        min_drought=min_drought,
        wrai_min=wrai_min,
        limit=limit,
    )
    return BuildingListResponse(data=data, count=len(data), filters_applied=filters_applied)


@router.get("/building/{building_id}", response_model=BuildingDetail)
async def api_get_building(
    building_id: uuid.UUID,
    session: Annotated[AsyncSession, Depends(get_db)],
):
    detail = await get_building_detail(session, building_id)
    if not detail:
        raise HTTPException(status_code=404, detail={"error": "Not found", "code": "NOT_FOUND"})
    return detail


@router.get("/building/{building_id}/score/recompute", response_model=ViabilityScoreResponse)
async def api_recompute_score(
    building_id: uuid.UUID,
    session: Annotated[AsyncSession, Depends(get_db)],
):
    try:
        r = await compute_full_score(building_id, session)
        return ViabilityScoreResponse.model_validate(asdict(r))
    except ValueError:
        raise HTTPException(
            status_code=404, detail={"error": "Not found", "code": "NOT_FOUND"}
        ) from None


@router.get("/building/{building_id}/harvest", response_model=HarvestOutput)
async def api_building_harvest(
    building_id: uuid.UUID,
    session: Annotated[AsyncSession, Depends(get_db)],
    rainfall_adj: float = Query(0.0, ge=-0.4, le=0.2),
    rate_multiplier: float = Query(1.0, ge=1.0, le=2.0),
    reuse_fraction: float = Query(0.85, ge=0.5, le=0.95),
    runoff_coefficient: float = Query(0.85, ge=0.75, le=0.95),
):
    ctx = await get_harvest_context(session, building_id)
    if not ctx:
        raise HTTPException(status_code=404, detail={"error": "Not found", "code": "NOT_FOUND"})
    h = compute_water_twin(
        roof_sqft=ctx["roof_sqft"],
        annual_rain_inches=ctx["annual_rain_inches"],
        water_rate_per_kgal=ctx["water_rate_per_kgal"],
        sewer_rate_per_kgal=ctx["sewer_rate_per_kgal"],
        stormwater_fee_annual=ctx["stormwater_fee_annual"],
        rebate_usd=ctx["rebate_usd"],
        sales_tax_exempt=ctx["sales_tax_exempt"],
        property_tax_exempt=ctx["property_tax_exempt"],
        rainfall_adj=rainfall_adj,
        rate_multiplier=rate_multiplier,
        reuse_fraction=reuse_fraction,
        runoff_coefficient=runoff_coefficient,
    )
    return HarvestOutput(
        annual_gallons=h.annual_gallons,
        annual_savings_usd=h.annual_savings_usd,
        payback_years=h.payback_years,
        irr_pct=h.irr_pct,
        stormwater_fee_avoidance=h.stormwater_fee_avoidance,
        incentives_captured=h.incentives_captured,
        npv_20yr=h.npv_20yr,
        savings_curve=h.savings_curve,
    )


@router.post("/building/{building_id}/memo")
async def api_building_memo(
    building_id: uuid.UUID,
    body: MemoRequest,
    session: Annotated[AsyncSession, Depends(get_db)],
):
    building = await get_building_detail(session, building_id)
    if not building:
        raise HTTPException(status_code=404, detail={"error": "Not found", "code": "NOT_FOUND"})
    try:
        return stream_deal_memo(building, body.mode)
    except RuntimeError as e:
        logger.warning("Memo unavailable: %s", e)
        raise HTTPException(status_code=503, detail="AI service unavailable") from e


@router.post("/building/{building_id}/boardroom")
async def api_building_boardroom(
    building_id: uuid.UUID,
    session: Annotated[AsyncSession, Depends(get_db)],
):
    building = await get_building_detail(session, building_id)
    if not building:
        raise HTTPException(status_code=404, detail={"error": "Not found", "code": "NOT_FOUND"})
    try:
        return generate_boardroom(building)
    except RuntimeError as e:
        logger.warning("Boardroom unavailable: %s", e)
        raise HTTPException(status_code=503, detail="AI service unavailable") from e
    except Exception as e:
        logger.exception("Boardroom failed")
        raise HTTPException(status_code=500, detail=str(e)) from e


@router.post("/building/{building_id}/voice-script")
async def api_voice_script(
    building_id: uuid.UUID,
    session: Annotated[AsyncSession, Depends(get_db)],
):
    building = await get_building_detail(session, building_id)
    if not building:
        raise HTTPException(status_code=404, detail={"error": "Not found", "code": "NOT_FOUND"})
    try:
        script = generate_voice_pitch_sync(building)
        return {"script": script}
    except RuntimeError as e:
        logger.warning("Voice script unavailable: %s", e)
        raise HTTPException(status_code=503, detail="AI service unavailable") from e
