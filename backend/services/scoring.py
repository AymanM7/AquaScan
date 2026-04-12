"""Viability scoring, WRAI, genome — PHASE_02 §2–4 (mirrors frontend/lib/scoring.ts)."""

from __future__ import annotations

import uuid
from dataclasses import dataclass

from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from adapters.incentive import compute_incentive_value, load_adapter
from models.alert import AlertEvent
from models.building import Building
from models.climate import ClimateData
from models.corporate import CorporateData
from models.cv_result import CVResult
from models.financial import FinancialData
from models.incentive_adapter import IncentiveAdapter
from models.score import ViabilityScore
from schemas.alerts import AlertEventSchema
from schemas.building import BuildingDetail, BuildingSummary
from services.building_service import (
    _default_incentive,
    _get_dfw_incentive,
    _polygon_geometry,
)
from services.hydrology import compute_water_twin


def _roof_score(roof_sqft: int) -> float:
    if roof_sqft < 100_000:
        return 0.0
    if roof_sqft < 150_000:
        return 5.0
    if roof_sqft < 250_000:
        return 7.0
    if roof_sqft < 350_000:
        return 9.0
    return 10.0


def _ct_score(ct_detected: bool, ct_confidence: float) -> float:
    if not ct_detected:
        return 3.0
    c = ct_confidence or 0.0
    if 0.5 <= c < 0.7:
        return 6.0
    if 0.7 <= c < 0.85:
        return 8.0
    if c >= 0.85:
        return 10.0
    return 6.0


def _cv_conf_score(roof_confidence: float, area_confidence: float) -> float:
    return (roof_confidence * 0.6 + area_confidence * 0.4) * 10.0


def compute_physical_score(
    roof_sqft: int,
    ct_detected: bool,
    ct_confidence: float,
    roof_confidence: float,
    area_confidence: float,
) -> float:
    rs = _roof_score(roof_sqft)
    cs = _ct_score(ct_detected, ct_confidence)
    cv = _cv_conf_score(roof_confidence, area_confidence)
    physical_raw = rs * 0.50 + cs * 0.30 + cv * 0.20
    return physical_raw * 4.0


def _water_rate_score(combined_rate: float) -> float:
    if combined_rate < 8:
        return 3.0
    if combined_rate < 11:
        return 5.0
    if combined_rate < 14:
        return 7.0
    if combined_rate <= 18:
        return 9.0
    return 10.0


def _stormwater_score(fee_annual: float) -> float:
    if fee_annual < 500:
        return 2.0
    if fee_annual <= 2_000:
        return 5.0
    if fee_annual <= 5_000:
        return 7.0
    return 10.0


def _incentive_score(total_incentive: float) -> float:
    if total_incentive <= 0:
        return 0.0
    if total_incentive <= 5_000:
        return 4.0
    if total_incentive <= 25_000:
        return 6.0
    if total_incentive <= 100_000:
        return 8.0
    return 10.0


def _payback_score(payback_years: float) -> float:
    if payback_years > 10:
        return 2.0
    if payback_years > 7:
        return 4.0
    if payback_years > 5:
        return 6.0
    if payback_years > 3:
        return 8.0
    return 10.0


def compute_economic_score(
    water_rate_per_kgal: float,
    sewer_rate_per_kgal: float,
    stormwater_fee_annual: float,
    total_incentive_estimate: float,
    payback_years: float,
) -> float:
    combined = (water_rate_per_kgal or 0.0) + (sewer_rate_per_kgal or 0.0)
    rate_score = _water_rate_score(combined)
    storm_score = _stormwater_score(stormwater_fee_annual or 0.0)
    inc_score = _incentive_score(total_incentive_estimate)
    pb_score = _payback_score(payback_years)
    economic_raw = (
        rate_score * 0.35 + storm_score * 0.30 + inc_score * 0.20 + pb_score * 0.15
    )
    return economic_raw * 3.5


def _esg_score(water_mentions: int, leed_certified: bool) -> float:
    m = int(water_mentions or 0)
    if m == 0:
        s = 1.0
    elif m <= 2:
        s = 3.0
    elif m <= 5:
        s = 5.0
    elif m <= 9:
        s = 7.0
    else:
        s = 10.0
    if leed_certified:
        s = min(10.0, s + 2.0)
    return s


def _drought_score_from_label(drought_label: str | None) -> float:
    label = (drought_label or "None").strip()
    mapping = {"None": 0.0, "D0": 3.0, "D1": 5.0, "D2": 7.0, "D3": 9.0, "D4": 10.0}
    return mapping.get(label, 0.0)


def _flood_score(flood_zone: str | None, fema_flood_risk: float) -> float:
    z = (flood_zone or "").upper()
    if z == "X":
        return 3.0
    if z == "AO":
        return 5.0
    if z == "AE":
        return 8.0
    if z == "VE":
        return 10.0
    r = float(fema_flood_risk or 0.0)
    return max(0.0, min(10.0, r * 10.0))


def _leed_score(leed_certified: bool, leed_level: str | None) -> float:
    if not leed_certified:
        return 2.0
    lvl = (leed_level or "").strip().lower()
    if lvl == "certified":
        return 5.0
    if lvl == "silver":
        return 6.0
    if lvl == "gold":
        return 8.0
    if lvl == "platinum":
        return 10.0
    return 5.0


def compute_strategic_score(
    water_mentions: int,
    leed_certified: bool,
    leed_level: str | None,
    drought_label: str | None,
    flood_zone: str | None,
    fema_flood_risk: float,
) -> float:
    esg = _esg_score(water_mentions, leed_certified)
    drt = _drought_score_from_label(drought_label)
    fld = _flood_score(flood_zone, fema_flood_risk)
    leed = _leed_score(leed_certified, leed_level)
    strategic_raw = esg * 0.30 + drt * 0.30 + fld * 0.20 + leed * 0.20
    return strategic_raw * 2.5


def compute_confidence(
    roof_confidence: float,
    ct_confidence: float,
    area_confidence: float,
    ct_detected: bool,
) -> float:
    ct_c = float(ct_confidence or 0.0) if ct_detected else 0.8
    return (
        float(roof_confidence or 0.0) * 0.4
        + ct_c * 0.35
        + float(area_confidence or 0.0) * 0.25
    )


def _drought_normalized(drought_label: str | None) -> float:
    label = (drought_label or "None").strip()
    m = {"None": 0.0, "D0": 0.2, "D1": 0.4, "D2": 0.6, "D3": 0.8, "D4": 1.0}
    return m.get(label, 0.0)


def _peer_esg_pressure(sector: str | None) -> float:
    s = sector or ""
    table = {
        "Data Center": 85.0,
        "Manufacturing": 70.0,
        "Logistics": 65.0,
        "Hospital": 60.0,
        "University": 75.0,
    }
    return float(table.get(s, 50.0))


def _rate_trajectory(city: str, state: str) -> float:
    c = (city or "").lower()
    st = (state or "").upper()
    if st == "TX" and ("austin" in c):
        return 78.0
    if st == "TX":
        return 72.0
    if "philadelphia" in c or st == "PA":
        return 65.0
    if "tucson" in c or st == "AZ":
        return 88.0
    return 70.0


def _regulatory_momentum_from_adapter(adapter_row: IncentiveAdapter | None) -> float:
    """0–100 regulatory momentum heuristic from seeded adapter metadata (PHASE_02 §3)."""
    if not adapter_row:
        return 20.0
    score = 20.0
    if (adapter_row.rebate_usd or 0) > 0 or (adapter_row.program_name or ""):
        score = 40.0
    if adapter_row.mandate_threshold_sqft:
        score = max(score, 70.0)
    desc = (adapter_row.description or "").lower()
    if "penalt" in desc or "enforcement" in desc:
        score = max(score, 100.0)
    elif "pending" in desc and "mandate" in desc:
        score = max(score, 90.0)
    elif "mandate" in desc or "reuse" in desc:
        score = max(score, 70.0)
    return float(min(100.0, score))


def compute_wrai(
    *,
    drought_label: str | None,
    fema_flood_risk: float,
    sector: str | None,
    city: str,
    state: str,
    adapter_row: IncentiveAdapter | None,
) -> float:
    climate_acc = (_drought_normalized(drought_label) * 0.6 + float(fema_flood_risk or 0.0) * 0.4) * 100.0
    reg = _regulatory_momentum_from_adapter(adapter_row)
    peer = _peer_esg_pressure(sector)
    rate = _rate_trajectory(city, state)
    return reg * 0.30 + climate_acc * 0.25 + peer * 0.25 + rate * 0.20


def classify_genome(
    physical: float,
    economic: float,
    strategic: float,
    ct_detected: bool,
    wrai: float,
) -> str:
    phys_norm = physical / 40.0 * 100.0
    econ_norm = economic / 35.0 * 100.0
    strat_norm = strategic / 25.0 * 100.0

    if ct_detected and phys_norm >= 75.0:
        return "Cooling-Driven Reuse Giant"
    if phys_norm >= 80.0 and econ_norm >= 70.0:
        return "Storm-Value Titan"
    if strat_norm >= 80.0 and econ_norm >= 60.0:
        return "ESG Mandate Accelerator"
    if econ_norm >= 80.0 and phys_norm >= 60.0 and strat_norm < 50.0:
        return "Hidden High-ROI Candidate"
    if strat_norm >= 70.0 and phys_norm >= 55.0:
        return "Flood-Resilience Priority"

    max_pillar = max(phys_norm, econ_norm, strat_norm)
    if max_pillar == phys_norm:
        return "Storm-Value Titan"
    if max_pillar == econ_norm:
        return "Hidden High-ROI Candidate"
    return "ESG Mandate Accelerator"


def wrai_badge_label(wrai: float) -> str:
    if wrai >= 80.0:
        return "Act Now"
    if wrai >= 60.0:
        return "High Priority"
    if wrai >= 40.0:
        return "Monitor"
    return "Standard"


@dataclass
class ViabilityScoreResult:
    final_score: float
    score_raw: float
    physical_score: float
    economic_score: float
    strategic_score: float
    wrai: float
    genome_archetype: str
    confidence_composite: float


async def _load_building_detail_for_scoring(
    session: AsyncSession, building_id: uuid.UUID
) -> BuildingDetail | None:
    """Same joins as `get_building_detail`, but ignores existing viability pillar scores for math."""
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
            FinancialData.city_id,
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

    def _sum_row(
        row_: Any,
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
            id=str(row_.id),
            name=row_.name or "",
            address=row_.address or "",
            city=row_.city,
            state=row_.state,
            sector=row_.sector or "",
            roof_sqft=row_.roof_sqft,
            centroid_lat=float(row_.lat or 0),
            centroid_lng=float(row_.lon or 0),
            polygon_geojson=_polygon_geometry(row_.poly_gj)
            or {"type": "Polygon", "coordinates": []},
            final_score=0.0,
            wrai=0.0,
            genome_archetype="",
            ct_detected=bool(row_.ct_detected) if row_.ct_detected is not None else False,
            ct_confidence=float(row_.ct_confidence or 0),
            annual_gallons=h.annual_gallons,
            payback_years=h.payback_years,
            drought_label=row_.drought_label or "None",
        )

    base = _sum_row(
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

    return BuildingDetail(
        **base.model_dump(),
        area_confidence=float(row.area_confidence or 0),
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
        physical_score=0.0,
        economic_score=0.0,
        strategic_score=0.0,
        confidence_composite=0.0,
        alert_events=alert_schemas,
        roof_confidence=float(row.roof_confidence or 0),
        drought_score=int(row.drought_score or 0),
        wrai_badge="Standard",
        irr_pct=0.0,
        annual_savings_usd=0.0,
        npv_20yr=0.0,
        stormwater_fee_avoidance=0.0,
        savings_curve=[],
        hydro_thesis="rain_roi",
    )


async def _get_adapter_row(session: AsyncSession, city_id: str) -> IncentiveAdapter | None:
    r = await session.execute(
        select(IncentiveAdapter).where(IncentiveAdapter.city_id == city_id)
    )
    row = r.scalar_one_or_none()
    if row:
        return row
    r2 = await session.execute(
        select(IncentiveAdapter).where(IncentiveAdapter.city_id == "dallas_tx")
    )
    return r2.scalar_one_or_none()


async def compute_full_score(
    building_id: uuid.UUID, session: AsyncSession
) -> ViabilityScoreResult:
    detail = await _load_building_detail_for_scoring(session, building_id)
    if not detail:
        raise ValueError("Building not found")

    fd = await session.execute(select(FinancialData).where(FinancialData.building_id == building_id))
    fin = fd.scalar_one_or_none()
    city_id = fin.city_id if fin and fin.city_id else "dallas_tx"
    adapter_dict = load_adapter(city_id)

    capex = float(detail.roof_sqft) * 0.018
    inv = compute_incentive_value(adapter_dict, int(detail.roof_sqft), capex)

    harvest = compute_water_twin(
        roof_sqft=float(detail.roof_sqft),
        annual_rain_inches=float(detail.annual_rain_inches or 34.0),
        water_rate_per_kgal=float(detail.water_rate_per_kgal or 4.5),
        sewer_rate_per_kgal=float(detail.sewer_rate_per_kgal or 5.1),
        stormwater_fee_annual=float(detail.stormwater_fee_annual or 0.0),
        rebate_usd=float(inv.get("rebate_usd") or 0),
        sales_tax_exempt=bool(inv.get("sales_tax_exempt")),
        property_tax_exempt=bool(inv.get("property_tax_exempt")),
    )

    physical = compute_physical_score(
        int(detail.roof_sqft),
        bool(detail.ct_detected),
        float(detail.ct_confidence or 0.0),
        float(detail.roof_confidence or 0.0),
        float(detail.area_confidence or 0.0),
    )
    economic = compute_economic_score(
        float(detail.water_rate_per_kgal or 0.0),
        float(detail.sewer_rate_per_kgal or 0.0),
        float(detail.stormwater_fee_annual or 0.0),
        float(inv.get("total_incentive_estimate") or 0.0),
        float(harvest.payback_years),
    )
    strategic = compute_strategic_score(
        int(detail.water_mentions or 0),
        bool(detail.leed_certified),
        detail.leed_level,
        detail.drought_label,
        detail.flood_zone,
        float(detail.fema_flood_risk or 0.0),
    )
    confidence = compute_confidence(
        float(detail.roof_confidence or 0.0),
        float(detail.ct_confidence or 0.0),
        float(detail.area_confidence or 0.0),
        bool(detail.ct_detected),
    )

    v_raw = physical + economic + strategic
    v_adj = v_raw * (0.6 + 0.4 * confidence)

    adapter_row = await _get_adapter_row(session, city_id)
    wrai = compute_wrai(
        drought_label=detail.drought_label,
        fema_flood_risk=float(detail.fema_flood_risk or 0.0),
        sector=detail.sector,
        city=detail.city,
        state=detail.state,
        adapter_row=adapter_row,
    )
    genome = classify_genome(physical, economic, strategic, bool(detail.ct_detected), wrai)
    detail.wrai_badge = wrai_badge_label(wrai)
    detail.irr_pct = float(harvest.irr_pct)
    detail.annual_savings_usd = float(harvest.annual_savings_usd)
    detail.npv_20yr = float(harvest.npv_20yr)
    detail.stormwater_fee_avoidance = float(harvest.stormwater_fee_avoidance)
    detail.savings_curve = list(harvest.savings_curve)
    detail.hydro_thesis = hydro_deliberation_class(detail)

    final = round(v_adj, 1)

    vs = await session.execute(select(ViabilityScore).where(ViabilityScore.building_id == building_id))
    row = vs.scalar_one_or_none()
    if row:
        row.final_score = final
        row.score_raw = round(v_raw, 2)
        row.physical_score = round(physical, 2)
        row.economic_score = round(economic, 2)
        row.strategic_score = round(strategic, 2)
        row.wrai = round(wrai, 2)
        row.genome_archetype = genome
        row.confidence_composite = round(confidence, 4)
    else:
        session.add(
            ViabilityScore(
                building_id=building_id,
                final_score=final,
                score_raw=round(v_raw, 2),
                physical_score=round(physical, 2),
                economic_score=round(economic, 2),
                strategic_score=round(strategic, 2),
                wrai=round(wrai, 2),
                genome_archetype=genome,
                confidence_composite=round(confidence, 4),
            )
        )
    await session.commit()

    return ViabilityScoreResult(
        final_score=final,
        score_raw=round(v_raw, 2),
        physical_score=round(physical, 2),
        economic_score=round(economic, 2),
        strategic_score=round(strategic, 2),
        wrai=round(wrai, 2),
        genome_archetype=genome,
        confidence_composite=round(confidence, 4),
    )


async def hydro_deliberation_class(building: BuildingDetail) -> str:
    """PHASE_06 — lightweight local classifier to avoid extra LLM calls when keys missing."""
    if building.ct_detected and float(building.ct_confidence or 0.0) >= 0.7:
        return "cooling_reuse"
    fz = (building.flood_zone or "").upper()
    if fz in {"AE", "VE"} or float(building.fema_flood_risk or 0.0) >= 0.35:
        return "resilience_flood"
    return "rain_roi"
