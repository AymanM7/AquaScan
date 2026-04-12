from __future__ import annotations

import json
import uuid
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from models.alert import AlertEvent
from models.building import Building
from models.climate import ClimateData
from models.corporate import CorporateData
from models.cv_result import CVResult
from models.financial import FinancialData
from models.incentive_adapter import IncentiveAdapter
from models.score import ViabilityScore
from models.user import AutomationReport, AutomationRun, UserSettings
from schemas.alerts import AlertEventSchema
from schemas.building import BuildingDetail, BuildingSummary
from services.hydrology import compute_water_twin


def _polygon_feature(poly_geojson_str: str | None) -> dict[str, Any]:
    if not poly_geojson_str:
        return {"type": "Feature", "geometry": None, "properties": {}}
    try:
        geom = json.loads(poly_geojson_str)
    except json.JSONDecodeError:
        geom = None
    return {"type": "Feature", "geometry": geom, "properties": {}}


def _polygon_geometry(poly_geojson_str: str | None) -> dict[str, Any] | None:
    feat = _polygon_feature(poly_geojson_str)
    g = feat.get("geometry")
    return g if isinstance(g, dict) else None


def _default_incentive() -> dict[str, Any]:
    return {
        "rebate_usd": 0,
        "sales_tax_exempt": False,
        "property_tax_exempt": False,
        "stormwater_credit_pct": 0.0,
        "program_name": "",
    }


async def _get_dfw_incentive(session: AsyncSession) -> IncentiveAdapter | None:
    r = await session.execute(
        select(IncentiveAdapter).where(IncentiveAdapter.city_id == "dallas_tx")
    )
    return r.scalar_one_or_none()


def _summary_from_row(
    row: Any,
    incentive: dict[str, Any],
    rain: float,
    roof: int,
    water_rate: float,
    sewer_rate: float,
    storm_fee: float,
) -> BuildingSummary:
    h = compute_water_twin(
        roof_sqft=float(roof),
        annual_rain_inches=rain or 0.0,
        water_rate_per_kgal=water_rate or 4.5,
        sewer_rate_per_kgal=sewer_rate or 5.1,
        stormwater_fee_annual=storm_fee or 0.0,
        rebate_usd=float(incentive.get("rebate_usd") or 0),
        sales_tax_exempt=bool(incentive.get("sales_tax_exempt")),
        property_tax_exempt=bool(incentive.get("property_tax_exempt")),
    )
    return BuildingSummary(
        id=str(row.id),
        name=row.name or "",
        address=row.address or "",
        city=row.city,
        state=row.state,
        sector=row.sector or "",
        roof_sqft=row.roof_sqft,
        centroid_lat=float(row.lat or 0),
        centroid_lng=float(row.lon or 0),
        polygon_geojson=_polygon_geometry(row.poly_gj) or {"type": "Polygon", "coordinates": []},
        final_score=float(row.final_score or 0),
        wrai=float(row.wrai or 0),
        genome_archetype=row.genome_archetype or "",
        ct_detected=bool(row.ct_detected) if row.ct_detected is not None else False,
        ct_confidence=float(row.ct_confidence or 0),
        annual_gallons=h.annual_gallons,
        payback_years=h.payback_years,
        drought_label=row.drought_label or "None",
    )


async def list_buildings(
    session: AsyncSession,
    *,
    state: str,
    min_score: float | None = None,
    min_roof: int | None = None,
    sector: str | None = None,
    cooling_tower: bool | None = None,
    min_drought: int | None = None,
    wrai_min: float | None = None,
    limit: int = 500,
) -> tuple[list[BuildingSummary], dict[str, Any]]:
    filters_applied: dict[str, Any] = {"state": state}
    inc_row = await _get_dfw_incentive(session)
    inc = _default_incentive()
    if inc_row:
        inc = {
            "rebate_usd": inc_row.rebate_usd or 0,
            "sales_tax_exempt": bool(inc_row.sales_tax_exempt),
            "property_tax_exempt": bool(inc_row.property_tax_exempt),
            "stormwater_credit_pct": float(inc_row.stormwater_credit_pct or 0),
            "program_name": inc_row.program_name or "",
        }

    stmt = (
        select(
            Building.id,
            Building.name,
            Building.address,
            Building.city,
            Building.state,
            Building.sector,
            Building.roof_sqft,
            func.ST_AsGeoJSON(Building.polygon).label("poly_gj"),
            func.ST_X(Building.centroid).label("lon"),
            func.ST_Y(Building.centroid).label("lat"),
            ViabilityScore.final_score,
            ViabilityScore.wrai,
            ViabilityScore.genome_archetype,
            CVResult.ct_detected,
            CVResult.ct_confidence,
            ClimateData.annual_rain_inches,
            ClimateData.drought_label,
            ClimateData.drought_score,
            FinancialData.water_rate_per_kgal,
            FinancialData.sewer_rate_per_kgal,
            FinancialData.stormwater_fee_annual,
        )
        .select_from(Building)
        .join(ViabilityScore, ViabilityScore.building_id == Building.id)
        .outerjoin(CVResult, CVResult.building_id == Building.id)
        .outerjoin(ClimateData, ClimateData.building_id == Building.id)
        .outerjoin(FinancialData, FinancialData.building_id == Building.id)
        .where(Building.state == state)
    )

    if min_score is not None:
        stmt = stmt.where(ViabilityScore.final_score >= min_score)
        filters_applied["min_score"] = min_score
    if min_roof is not None:
        stmt = stmt.where(Building.roof_sqft >= min_roof)
        filters_applied["min_roof"] = min_roof
    if sector:
        stmt = stmt.where(Building.sector == sector)
        filters_applied["sector"] = sector
    if cooling_tower is not None:
        stmt = stmt.where(CVResult.ct_detected == cooling_tower)
        filters_applied["cooling_tower"] = cooling_tower
    if min_drought is not None:
        stmt = stmt.where(ClimateData.drought_score >= min_drought)
        filters_applied["min_drought"] = min_drought
    if wrai_min is not None:
        stmt = stmt.where(ViabilityScore.wrai >= wrai_min)
        filters_applied["wrai_min"] = wrai_min

    stmt = stmt.order_by(ViabilityScore.final_score.desc()).limit(min(limit, 2000))

    result = await session.execute(stmt)
    rows = result.mappings().all()
    out: list[BuildingSummary] = []
    for row in rows:
        out.append(
            _summary_from_row(
                row,
                inc,
                float(row.annual_rain_inches or 0),
                int(row.roof_sqft),
                float(row.water_rate_per_kgal or 4.5),
                float(row.sewer_rate_per_kgal or 5.1),
                float(row.stormwater_fee_annual or 0),
            )
        )
    return out, filters_applied


async def get_building_detail(
    session: AsyncSession, building_id: uuid.UUID
) -> BuildingDetail | None:
    inc_row = await _get_dfw_incentive(session)
    inc = _default_incentive()
    if inc_row:
        inc = {
            "rebate_usd": inc_row.rebate_usd or 0,
            "sales_tax_exempt": bool(inc_row.sales_tax_exempt),
            "property_tax_exempt": bool(inc_row.property_tax_exempt),
            "stormwater_credit_pct": float(inc_row.stormwater_credit_pct or 0),
            "program_name": inc_row.program_name or "",
        }

    stmt = (
        select(
            Building.id,
            Building.name,
            Building.address,
            Building.city,
            Building.state,
            Building.sector,
            Building.roof_sqft,
            Building.area_confidence,
            func.ST_AsGeoJSON(Building.polygon).label("poly_gj"),
            func.ST_X(Building.centroid).label("lon"),
            func.ST_Y(Building.centroid).label("lat"),
            ViabilityScore.final_score,
            ViabilityScore.wrai,
            ViabilityScore.genome_archetype,
            ViabilityScore.physical_score,
            ViabilityScore.economic_score,
            ViabilityScore.strategic_score,
            ViabilityScore.confidence_composite,
            CVResult.ct_detected,
            CVResult.ct_confidence,
            CVResult.ct_boxes,
            CVResult.roof_mask_url,
            CVResult.raw_chip_url,
            CVResult.masked_chip_url,
            CVResult.roof_confidence,
            ClimateData.annual_rain_inches,
            ClimateData.drought_label,
            ClimateData.drought_score,
            ClimateData.flood_zone,
            ClimateData.fema_flood_risk,
            FinancialData.water_rate_per_kgal,
            FinancialData.sewer_rate_per_kgal,
            FinancialData.stormwater_fee_annual,
            CorporateData.owner_name,
            CorporateData.sec_cik,
            CorporateData.esg_score,
            CorporateData.water_mentions,
            CorporateData.leed_certified,
            CorporateData.leed_level,
            CorporateData.esg_accelerator,
            CorporateData.ticker,
            CorporateData.corporate_parent,
        )
        .select_from(Building)
        .join(ViabilityScore, ViabilityScore.building_id == Building.id)
        .outerjoin(CVResult, CVResult.building_id == Building.id)
        .outerjoin(ClimateData, ClimateData.building_id == Building.id)
        .outerjoin(FinancialData, FinancialData.building_id == Building.id)
        .outerjoin(CorporateData, CorporateData.building_id == Building.id)
        .where(Building.id == building_id)
    )
    r = await session.execute(stmt)
    row = r.mappings().one_or_none()
    if not row:
        return None

    base = _summary_from_row(
        row,
        inc,
        float(row.annual_rain_inches or 0),
        int(row.roof_sqft),
        float(row.water_rate_per_kgal or 4.5),
        float(row.sewer_rate_per_kgal or 5.1),
        float(row.stormwater_fee_annual or 0),
    )

    ar = await session.execute(
        select(AlertEvent).where(AlertEvent.building_ids.contains([building_id]))
    )
    alerts = ar.scalars().all()
    alert_schemas = [
        AlertEventSchema(
            id=str(a.id),
            type=a.type,
            state=a.state,
            city=a.city,
            building_ids=[str(x) for x in (a.building_ids or [])],
            score_delta=a.score_delta,
            description=a.description,
            source=a.source,
            event_timestamp=a.event_timestamp.isoformat() if a.event_timestamp else "",
        )
        for a in alerts
    ]

    boxes = row.ct_boxes if isinstance(row.ct_boxes, list) else []

    h2 = compute_water_twin(
        roof_sqft=float(row.roof_sqft),
        annual_rain_inches=float(row.annual_rain_inches or 0),
        water_rate_per_kgal=float(row.water_rate_per_kgal or 4.5),
        sewer_rate_per_kgal=float(row.sewer_rate_per_kgal or 5.1),
        stormwater_fee_annual=float(row.stormwater_fee_annual or 0),
        rebate_usd=float(inc.get("rebate_usd") or 0),
        sales_tax_exempt=bool(inc.get("sales_tax_exempt")),
        property_tax_exempt=bool(inc.get("property_tax_exempt")),
    )

    from services.scoring import hydro_deliberation_class, wrai_badge_label

    detail = BuildingDetail(
        **base.model_dump(),
        area_confidence=float(row.area_confidence or 0),
        roof_confidence=float(row.roof_confidence or 0),
        drought_score=int(row.drought_score or 0),
        roof_mask_url=row.roof_mask_url,
        raw_chip_url=row.raw_chip_url,
        masked_chip_url=row.masked_chip_url,
        ct_boxes=boxes,
        water_rate_per_kgal=float(row.water_rate_per_kgal or 0),
        sewer_rate_per_kgal=float(row.sewer_rate_per_kgal or 0),
        stormwater_fee_annual=float(row.stormwater_fee_annual or 0),
        rebate_usd=int(inc.get("rebate_usd") or 0),
        sales_tax_exempt=bool(inc.get("sales_tax_exempt")),
        property_tax_exempt=bool(inc.get("property_tax_exempt")),
        stormwater_credit_pct=float(inc.get("stormwater_credit_pct") or 0),
        program_name=str(inc.get("program_name") or ""),
        owner_name=row.owner_name or "",
        sec_cik=row.sec_cik or "",
        esg_score=float(row.esg_score or 0),
        water_mentions=int(row.water_mentions or 0),
        leed_certified=bool(row.leed_certified),
        leed_level=row.leed_level or "",
        esg_accelerator=bool(row.esg_accelerator),
        ticker=row.ticker or "",
        corporate_parent=row.corporate_parent or "",
        annual_rain_inches=float(row.annual_rain_inches or 0),
        flood_zone=row.flood_zone or "",
        fema_flood_risk=float(row.fema_flood_risk or 0),
        physical_score=float(row.physical_score or 0),
        economic_score=float(row.economic_score or 0),
        strategic_score=float(row.strategic_score or 0),
        confidence_composite=float(row.confidence_composite or 0),
        alert_events=alert_schemas,
        wrai_badge=wrai_badge_label(float(row.wrai or 0)),
        irr_pct=float(h2.irr_pct),
        annual_savings_usd=float(h2.annual_savings_usd),
        npv_20yr=float(h2.npv_20yr),
        stormwater_fee_avoidance=float(h2.stormwater_fee_avoidance),
        savings_curve=list(h2.savings_curve),
        hydro_thesis="rain_roi",
    )
    return detail.model_copy(update={"hydro_thesis": hydro_deliberation_class(detail)})


async def get_harvest_context(
    session: AsyncSession, building_id: uuid.UUID
) -> dict[str, Any] | None:
    stmt = (
        select(
            Building.roof_sqft,
            ClimateData.annual_rain_inches,
            FinancialData.water_rate_per_kgal,
            FinancialData.sewer_rate_per_kgal,
            FinancialData.stormwater_fee_annual,
            FinancialData.city_id,
        )
        .select_from(Building)
        .outerjoin(ClimateData, ClimateData.building_id == Building.id)
        .outerjoin(FinancialData, FinancialData.building_id == Building.id)
        .where(Building.id == building_id)
    )
    r = await session.execute(stmt)
    row = r.mappings().one_or_none()
    if not row:
        return None

    city_id = row.city_id or "dallas_tx"
    ir = await session.execute(
        select(IncentiveAdapter).where(IncentiveAdapter.city_id == city_id)
    )
    adapter = ir.scalar_one_or_none()
    if not adapter:
        ir2 = await session.execute(
            select(IncentiveAdapter).where(IncentiveAdapter.city_id == "dallas_tx")
        )
        adapter = ir2.scalar_one_or_none()

    rebate = adapter.rebate_usd if adapter else 0
    st = bool(adapter.sales_tax_exempt) if adapter else False
    pt = bool(adapter.property_tax_exempt) if adapter else False

    return {
        "roof_sqft": float(row.roof_sqft),
        "annual_rain_inches": float(row.annual_rain_inches or 34.0),
        "water_rate_per_kgal": float(row.water_rate_per_kgal or 4.5),
        "sewer_rate_per_kgal": float(row.sewer_rate_per_kgal or 5.1),
        "stormwater_fee_annual": float(row.stormwater_fee_annual or 0),
        "rebate_usd": float(rebate or 0),
        "sales_tax_exempt": st,
        "property_tax_exempt": pt,
    }


def territory_to_state(territory: str) -> str:
    if territory == "DFW":
        return "TX"
    return "TX"


async def get_buildings_for_territory_scan(
    session: AsyncSession, state: str
) -> list[tuple[Building, ViabilityScore]]:
    stmt = (
        select(Building, ViabilityScore)
        .join(ViabilityScore, ViabilityScore.building_id == Building.id)
        .where(Building.state == state)
    )
    r = await session.execute(stmt)
    return list(r.all())


async def get_territory_summary(session: AsyncSession, user_id: str) -> dict[str, Any]:
    r = await session.execute(select(UserSettings).where(UserSettings.user_id == user_id))
    us = r.scalar_one_or_none()
    territory = us.territory if us else "DFW"
    st = territory_to_state(territory)

    top_stmt = (
        select(
            Building.id,
            Building.name,
            Building.city,
            Building.roof_sqft,
            ViabilityScore.final_score,
            ClimateData.drought_label,
            ClimateData.annual_rain_inches,
        )
        .join(ViabilityScore, ViabilityScore.building_id == Building.id)
        .outerjoin(ClimateData, ClimateData.building_id == Building.id)
        .where(Building.state == st)
        .order_by(ViabilityScore.final_score.desc())
        .limit(1)
    )
    top = (await session.execute(top_stmt)).mappings().first()

    ar = await session.execute(
        select(AlertEvent).order_by(AlertEvent.event_timestamp.desc()).limit(1)
    )
    latest = ar.scalar_one_or_none()

    rc = await session.execute(
        select(func.count())
        .select_from(AutomationReport)
        .join(AutomationRun, AutomationReport.run_id == AutomationRun.id)
        .where(AutomationRun.user_id == user_id)
    )
    reports_pending = int(rc.scalar_one() or 0)

    lr = await session.execute(
        select(AutomationRun)
        .where(AutomationRun.user_id == user_id)
        .order_by(AutomationRun.run_at.desc())
        .limit(1)
    )
    last_run = lr.scalar_one_or_none()
    crossings = int(last_run.crossings_count or 0) if last_run else 0

    drought_label = str(top["drought_label"] if top and top["drought_label"] else "D2")
    rain = float(top["annual_rain_inches"] or 34.0) if top else 34.0
    roof = int(top["roof_sqft"] or 0) if top else 0
    top_gallons_m = (roof * rain * 0.623 * 0.85) / 1_000_000.0 if roof else 0.0

    return {
        "territory": territory,
        "new_crossings": crossings,
        "top_building_name": str(top["name"]) if top else "No buildings",
        "top_building_city": str(top["city"]) if top else "",
        "top_score": float(top["final_score"]) if top else 0.0,
        "top_gallons_m": float(top_gallons_m),
        "drought_label": drought_label,
        "drought_description": f"{drought_label} conditions across metro monitoring grid",
        "latest_event": (latest.description if latest else "No recent events"),
        "reports_pending": reports_pending,
    }
