from __future__ import annotations

import uuid
from urllib.parse import unquote

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from models.building import Building
from models.climate import ClimateData
from models.corporate import CorporateData
from models.financial import FinancialData
from models.incentive_adapter import IncentiveAdapter
from schemas.building import BuildingSummary
from schemas.portfolio import PortfolioView
from schemas.states import StateProfile
from services.building_service import get_building_detail, list_buildings


async def _max_incentive_for_state(session: AsyncSession, state: str) -> int:
    r = await session.execute(
        select(func.coalesce(func.max(IncentiveAdapter.rebate_usd), 0))
        .select_from(IncentiveAdapter)
        .where(IncentiveAdapter.state == state)
    )
    return int(r.scalar() or 0)


async def _avg_drought_for_state(session: AsyncSession, state: str) -> float:
    stmt = (
        select(func.avg(ClimateData.drought_score))
        .select_from(Building)
        .join(ClimateData, ClimateData.building_id == Building.id)
        .where(Building.state == state)
    )
    r = await session.execute(stmt)
    v = r.scalar()
    return float(v or 0)


def _radar_scores(
    buildings: list[BuildingSummary],
    total_gallons: float,
    avg_score: float,
    avg_drought: float,
    top_incentive: int,
) -> dict[str, float]:
    n = max(len(buildings), 1)
    vol = min(100.0, (total_gallons / 80_000_000) * 100)
    roi = min(100.0, avg_score)
    regulation = min(100.0, 40 + (top_incentive / 25_000) * 40)
    corporate = min(100.0, sum(b.wrai for b in buildings) / n)
    resilience = min(100.0, avg_drought * 20 + 20)
    return {
        "volume": round(vol, 1),
        "roi": round(roi, 1),
        "regulation": round(regulation, 1),
        "corporate": round(corporate, 1),
        "resilience": round(resilience, 1),
    }


async def build_state_profile(session: AsyncSession, state: str) -> StateProfile:
    buildings, _ = await list_buildings(session, state=state, limit=5000)
    over100k = sum(1 for b in buildings if b.roof_sqft >= 100_000)
    total_gal = sum(b.annual_gallons for b in buildings)
    avg_score = (
        sum(b.final_score for b in buildings) / len(buildings) if buildings else 0.0
    )
    top_inc = await _max_incentive_for_state(session, state)
    avg_d = await _avg_drought_for_state(session, state)
    top5 = sorted(buildings, key=lambda b: b.final_score, reverse=True)[:5]
    radar = _radar_scores(buildings, total_gal, avg_score, avg_d, top_inc)
    return StateProfile(
        state=state,
        total_buildings_over_100k=over100k,
        total_annual_opportunity_gallons=round(total_gal, 0),
        avg_viability_score=round(avg_score, 2),
        top_incentive_value_usd=top_inc,
        avg_drought_score=round(avg_d, 2),
        top_5_buildings=top5,
        radar_scores=radar,
    )


async def get_portfolio_view(session: AsyncSession, owner_key: str) -> PortfolioView | None:
    raw = unquote(owner_key).strip()
    key = raw.lower().replace("+", " ")
    stmt = (
        select(Building.id, CorporateData.owner_name, CorporateData.corporate_parent)
        .distinct()
        .join(CorporateData, CorporateData.building_id == Building.id)
        .where(
            or_(
                func.lower(CorporateData.owner_name) == key,
                func.lower(func.coalesce(CorporateData.corporate_parent, "")) == key,
                func.lower(func.coalesce(CorporateData.ticker, "")) == key,
                CorporateData.sec_cik == raw,
            )
        )
    )
    r = await session.execute(stmt)
    pairs = r.all()
    if not pairs:
        return None

    owner_name = pairs[0][1] or ""
    corp_parent = pairs[0][2] or ""

    ids = list(dict.fromkeys(row[0] for row in pairs))
    summaries: list[BuildingSummary] = []
    for bid in ids:
        d = await get_building_detail(session, bid)
        if d:
            summaries.append(
                BuildingSummary(
                    id=d.id,
                    name=d.name,
                    address=d.address,
                    city=d.city,
                    state=d.state,
                    sector=d.sector,
                    roof_sqft=d.roof_sqft,
                    centroid_lat=d.centroid_lat,
                    centroid_lng=d.centroid_lng,
                    polygon_geojson=d.polygon_geojson,
                    final_score=d.final_score,
                    wrai=d.wrai,
                    genome_archetype=d.genome_archetype,
                    ct_detected=d.ct_detected,
                    ct_confidence=d.ct_confidence,
                    annual_gallons=d.annual_gallons,
                    payback_years=d.payback_years,
                    drought_label=d.drought_label,
                )
            )

    summaries.sort(key=lambda b: b.final_score, reverse=True)
    if not summaries:
        return None

    first = summaries[0]
    combined_roof = sum(b.roof_sqft for b in summaries)
    combined_gal = sum(b.annual_gallons for b in summaries)
    blended_rate = 9.6
    est_savings = combined_gal / 1000 * blended_rate

    narrative = (
        f"Start with {first.name}: highest viability ({first.final_score:.0f}). "
        f"Winning this site de-risks rollout across {len(summaries)} sibling assets."
    )

    tr = await session.execute(
        select(CorporateData.ticker).where(
            CorporateData.building_id == uuid.UUID(first.id)
        )
    )
    ticker_row = tr.first()
    ticker = ticker_row[0] if ticker_row else ""

    return PortfolioView(
        owner_name=owner_name or owner_key,
        corporate_parent=corp_parent or owner_name or owner_key,
        ticker=ticker or "",
        building_count=len(summaries),
        combined_roof_sqft=combined_roof,
        combined_annual_gallons=round(combined_gal, 0),
        combined_potential_savings_usd=round(est_savings * 1.2, 0),
        first_domino_building_id=first.id,
        first_domino_narrative=narrative,
        buildings=summaries,
    )
