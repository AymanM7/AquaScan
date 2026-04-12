"""
Seed DFW + demo data — full spec alignment.
  cd backend && . .venv/bin/activate && python -m seed.seed_dfw
"""

from __future__ import annotations

import asyncio
import random
import uuid
from datetime import datetime, timedelta, timezone

from geoalchemy2.elements import WKTElement
from sqlalchemy import delete

from database import AsyncSessionLocal
from models.alert import AlertEvent
from models.building import Building
from models.climate import ClimateData
from models.corporate import CorporateData
from models.cv_result import CVResult
from models.financial import FinancialData
from models.incentive_adapter import IncentiveAdapter
from models.incentive_stack import IncentiveStack
from models.score import ViabilityScore
from models.texas_reference import TexasReferenceCase
from models.user import (
    AutomationReport,
    AutomationRun,
    LoginDebrief,
    RepNotification,
    UserSettings,
)

NS = uuid.UUID("6ba7b810-9dad-11d1-80b4-00c04fd430c8")

CT_TYPES = ["Induced-Draft Rectangular", "Cross-Flow", "Forced-Draft"]
CT_ARRANGEMENTS = [
    "Clustered, NW corner",
    "Clustered, rooftop center",
    "Distributed, east wing",
    "Single unit, SW corner",
]


def _rect(lon: float, lat: float, d: float = 0.0025) -> tuple[str, str]:
    poly = (
        f"POLYGON(({lon - d} {lat - d}, {lon + d} {lat - d}, "
        f"{lon + d} {lat + d}, {lon - d} {lat + d}, {lon - d} {lat - d}))"
    )
    pt = f"POINT({lon} {lat})"
    return poly, pt


def _placeholders() -> tuple[str, str, str]:
    return (
        "https://example.com/rainuse/raw-chip-placeholder.png",
        "https://example.com/rainuse/mask-chip-placeholder.png",
        "https://example.com/rainuse/roof-mask-placeholder.png",
    )


def _compute_ct_demand_tier(ct_detected: bool, ct_count: int) -> str:
    if not ct_detected or ct_count == 0:
        return "None"
    if ct_count >= 3:
        return "High"
    return "Medium"


def _est_cooling_consumption(ct_count: int, roof_sqft: int) -> float:
    if ct_count == 0:
        return 0.0
    base_per_tower = 2_500_000 + (roof_sqft / 100_000) * 800_000
    return round(ct_count * base_per_tower)


async def _clear(session) -> None:
    await session.execute(delete(RepNotification))
    await session.execute(delete(AutomationReport))
    await session.execute(delete(AutomationRun))
    await session.execute(delete(LoginDebrief))
    await session.execute(delete(AlertEvent))
    await session.execute(delete(IncentiveStack))
    await session.execute(delete(ViabilityScore))
    await session.execute(delete(CVResult))
    await session.execute(delete(ClimateData))
    await session.execute(delete(FinancialData))
    await session.execute(delete(CorporateData))
    await session.execute(delete(Building))
    await session.execute(delete(IncentiveAdapter))
    await session.execute(delete(UserSettings))
    await session.execute(delete(TexasReferenceCase))


async def seed() -> None:
    random.seed(42)
    async with AsyncSessionLocal() as session:
        await _clear(session)

        # --- Texas Reference Case ---
        session.add(
            TexasReferenceCase(
                project_name="Grundfos CBS Brookshire",
                project_value_usd=43_900_000,
                abatement_pct=60,
                abatement_years=10,
                county_tax_rate=0.00556187,
                annual_savings_usd=146_500,
                total_savings_usd=1_460_000,
                description=(
                    "Grundfos CBS Brookshire expansion: ~$1.46M in county tax savings "
                    "over 10 years via 60% Chapter 312 abatement on a $43.9M project."
                ),
            )
        )

        # --- Incentive Adapters ---
        adapters = [
            IncentiveAdapter(
                city_id="austin_tx",
                city_name="Austin",
                state="TX",
                rebate_usd=100_000,
                mandate_threshold_sqft=100_000,
                sales_tax_exempt=True,
                property_tax_exempt=False,
                stormwater_credit_pct=0.0,
                green_infra_grant_max=0,
                program_name="Bucks for Business / GoPurple",
                description="Up to $100K utility rebate; reuse mandate >100k sqft",
                adapter_json={"programs": []},
            ),
            IncentiveAdapter(
                city_id="dallas_tx",
                city_name="Dallas / Fort Worth",
                state="TX",
                rebate_usd=100_000,
                mandate_threshold_sqft=None,
                sales_tax_exempt=True,
                property_tax_exempt=True,
                stormwater_credit_pct=0.0,
                green_infra_grant_max=0,
                program_name="Dallas ICI Rebate + Texas Tax Exemptions",
                description="Dallas ICI up to $100K; §151.355 sales tax; §11.32 property tax; Ch.312 abatement",
                adapter_json={"programs": []},
            ),
            IncentiveAdapter(
                city_id="san_antonio_tx",
                city_name="San Antonio",
                state="TX",
                rebate_usd=0,
                mandate_threshold_sqft=None,
                sales_tax_exempt=True,
                property_tax_exempt=False,
                stormwater_credit_pct=0.0,
                green_infra_grant_max=0,
                program_name="SAWS Commercial Custom Rebate",
                description="No fixed cap; calculated on water savings and ROI",
                adapter_json={"programs": []},
            ),
            IncentiveAdapter(
                city_id="philadelphia_pa",
                city_name="Philadelphia",
                state="PA",
                rebate_usd=0,
                mandate_threshold_sqft=None,
                sales_tax_exempt=False,
                property_tax_exempt=False,
                stormwater_credit_pct=45.0,
                green_infra_grant_max=100_000,
                program_name="Green Stormwater Infrastructure",
                description="Up to $100k/acre grants; 45% stormwater credit",
                adapter_json={"programs": []},
            ),
            IncentiveAdapter(
                city_id="tucson_az",
                city_name="Tucson",
                state="AZ",
                rebate_usd=2000,
                mandate_threshold_sqft=None,
                sales_tax_exempt=False,
                property_tax_exempt=False,
                stormwater_credit_pct=0.0,
                green_infra_grant_max=0,
                program_name="Harvesting Rebate",
                description="$2,000 harvesting rebate",
                adapter_json={"programs": []},
            ),
        ]
        session.add_all(adapters)

        # --- Demo User ---
        rep_id = "rep@grundfos.com"
        session.add(
            UserSettings(
                user_id=rep_id,
                territory="DFW",
                cadence="weekly",
                score_threshold=80,
                onboarding_complete=True,
                rep_zip="76107",
                notification_email=True,
                voice_model="rachel",
            )
        )

        # --- Primary Anchor Buildings ---
        primaries = [
            {
                "id": uuid.uuid5(NS, "prologis-burleson"),
                "name": "Prologis DFW Logistics Center",
                "address": "2800 E Renfro St",
                "city": "Burleson",
                "zip": "76028",
                "sector": "Logistics",
                "roof": 142_000,
                "eff_catch": 128_000,
                "usable_fp": 104_000,
                "score": 87.0,
                "raw": 88.0,
                "phys": 35.0,
                "econ": 30.0,
                "strat": 22.0,
                "wrai": 84.0,
                "genome": "Storm-Value Titan",
                "conf": 0.88,
                "lon": -97.3209,
                "lat": 32.5421,
                "owner": "Prologis, L.P.",
                "parent": "Prologis Inc.",
                "ticker": "PLD",
                "cik": "0001045609",
                "ct": True,
                "ctcf": 0.86,
                "ct_count": 2,
                "ct_type": "Induced-Draft Rectangular",
                "ct_arr": "Clustered, NW corner",
                "esg_mentions": 4,
                "leed": False,
                "drought": "D2",
                "rain": 34.2,
            },
            {
                "id": uuid.uuid5(NS, "cyrusone-carrollton"),
                "name": "CyrusOne Dallas III Data Center",
                "address": "1649 W Frankford Rd",
                "city": "Carrollton",
                "zip": "75007",
                "sector": "Data Center",
                "roof": 118_000,
                "eff_catch": 108_000,
                "usable_fp": 88_000,
                "score": 82.0,
                "raw": 83.0,
                "phys": 36.0,
                "econ": 28.0,
                "strat": 18.0,
                "wrai": 79.0,
                "genome": "Cooling-Driven Reuse Giant",
                "conf": 0.91,
                "lon": -96.8903,
                "lat": 32.9537,
                "owner": "CyrusOne LLC",
                "parent": "CyrusOne Inc.",
                "ticker": "CONE",
                "cik": "0001591698",
                "ct": True,
                "ctcf": 0.91,
                "ct_count": 4,
                "ct_type": "Cross-Flow",
                "ct_arr": "Clustered, rooftop center",
                "esg_mentions": 8,
                "leed": False,
                "drought": "D2",
                "rain": 33.8,
            },
            {
                "id": uuid.uuid5(NS, "amazon-ftw6"),
                "name": "Amazon FTW6 Fulfillment",
                "address": "700 Westport Pkwy",
                "city": "Fort Worth",
                "zip": "76177",
                "sector": "Logistics",
                "roof": 295_000,
                "eff_catch": 268_000,
                "usable_fp": 220_000,
                "score": 91.0,
                "raw": 92.0,
                "phys": 38.0,
                "econ": 32.0,
                "strat": 21.0,
                "wrai": 88.0,
                "genome": "ESG Mandate Accelerator",
                "conf": 0.9,
                "lon": -97.3474,
                "lat": 32.7714,
                "owner": "Amazon.com, Inc.",
                "parent": "Amazon.com, Inc.",
                "ticker": "AMZN",
                "cik": "0001018724",
                "ct": True,
                "ctcf": 0.88,
                "ct_count": 3,
                "ct_type": "Induced-Draft Rectangular",
                "ct_arr": "Distributed, east wing",
                "esg_mentions": 12,
                "leed": False,
                "drought": "D2",
                "rain": 34.0,
            },
            {
                "id": uuid.uuid5(NS, "tx-health-bedford"),
                "name": "Texas Health Presbyterian",
                "address": "1600 Hospital Pkwy",
                "city": "Bedford",
                "zip": "76022",
                "sector": "Hospital",
                "roof": 108_000,
                "eff_catch": 96_000,
                "usable_fp": 78_000,
                "score": 74.0,
                "raw": 75.0,
                "phys": 28.0,
                "econ": 27.0,
                "strat": 20.0,
                "wrai": 71.0,
                "genome": "Hidden High-ROI Candidate",
                "conf": 0.82,
                "lon": -97.1431,
                "lat": 32.8440,
                "owner": "Texas Health Resources",
                "parent": "Texas Health Resources",
                "ticker": "",
                "cik": "",
                "ct": False,
                "ctcf": 0.0,
                "ct_count": 0,
                "ct_type": "",
                "ct_arr": "",
                "esg_mentions": 2,
                "leed": True,
                "drought": "D1",
                "rain": 35.1,
            },
            {
                "id": uuid.uuid5(NS, "alliance-speedway"),
                "name": "Alliance Manufacturing Complex",
                "address": "3545 Lone Star Cir",
                "city": "Fort Worth",
                "zip": "76177",
                "sector": "Manufacturing",
                "roof": 165_000,
                "eff_catch": 148_000,
                "usable_fp": 120_000,
                "score": 69.0,
                "raw": 70.0,
                "phys": 30.0,
                "econ": 24.0,
                "strat": 16.0,
                "wrai": 66.0,
                "genome": "Flood-Resilience Priority",
                "conf": 0.78,
                "lon": -97.3614,
                "lat": 32.8192,
                "owner": "Alliance Manufacturing, Inc.",
                "parent": "Alliance Manufacturing, Inc.",
                "ticker": "TRK",
                "cik": "0001099736",
                "ct": True,
                "ctcf": 0.72,
                "ct_count": 1,
                "ct_type": "Forced-Draft",
                "ct_arr": "Single unit, SW corner",
                "esg_mentions": 1,
                "leed": False,
                "drought": "D2",
                "rain": 33.5,
            },
        ]

        raw_u, mask_u, roof_u = _placeholders()
        all_building_ids: list[uuid.UUID] = []

        for p in primaries:
            poly, pt = _rect(p["lon"], p["lat"])
            b = Building(
                id=p["id"],
                polygon=WKTElement(poly, srid=4326),
                centroid=WKTElement(pt, srid=4326),
                state="TX",
                city=p["city"],
                address=p["address"],
                zip=p["zip"],
                sector=p["sector"],
                roof_sqft=p["roof"],
                effective_catchment_sqft=p["eff_catch"],
                usable_footprint_sqft=p["usable_fp"],
                area_confidence=0.9,
                name=p["name"],
            )
            session.add(b)
            all_building_ids.append(p["id"])

            ct_count = p["ct_count"]
            ct_tier = _compute_ct_demand_tier(p["ct"], ct_count)
            cooling_gal = _est_cooling_consumption(ct_count, p["roof"])

            session.add(
                CVResult(
                    building_id=p["id"],
                    ct_detected=p["ct"],
                    ct_confidence=p["ctcf"] if p["ct"] else None,
                    ct_count=ct_count,
                    ct_type=p["ct_type"],
                    ct_arrangement=p["ct_arr"],
                    ct_demand_tier=ct_tier,
                    est_cooling_consumption_gal_yr=cooling_gal,
                    ct_boxes=[
                        {
                            "x": 10 + i * 30,
                            "y": 20,
                            "w": 80,
                            "h": 60,
                            "confidence": round(p["ctcf"] - i * 0.03, 2),
                            "label": p["ct_type"],
                        }
                        for i in range(ct_count)
                    ]
                    if p["ct"]
                    else [],
                    roof_mask_url=roof_u,
                    roof_confidence=0.88,
                    effective_mask_url=roof_u,
                    usable_mask_url=roof_u,
                    imagery_source="NAIP",
                    analysis_date=datetime.now(timezone.utc).date(),
                    raw_chip_url=raw_u,
                    masked_chip_url=mask_u,
                )
            )
            session.add(
                ClimateData(
                    building_id=p["id"],
                    annual_rain_inches=p["rain"],
                    drought_score=int(p["drought"][1]) if p["drought"] != "None" else 0,
                    drought_label=p["drought"],
                    flood_zone="X" if p["sector"] != "Manufacturing" else "AE",
                    fema_class="X",
                    fema_flood_risk=0.15 if p["sector"] != "Manufacturing" else 0.35,
                )
            )
            session.add(
                FinancialData(
                    building_id=p["id"],
                    city_id="dallas_tx",
                    water_rate_per_kgal=4.5,
                    sewer_rate_per_kgal=5.1,
                    stormwater_fee_annual=3200.0,
                    stormwater_eru_rate=12.0,
                    utility_source="DFW composite",
                )
            )
            session.add(
                CorporateData(
                    building_id=p["id"],
                    owner_name=p["owner"],
                    sec_cik=p["cik"] or None,
                    esg_score=7.2,
                    water_mentions=p["esg_mentions"],
                    filing_year=2025,
                    leed_certified=p["leed"],
                    leed_level="Gold" if p["leed"] else None,
                    esg_accelerator=p["esg_mentions"] > 5,
                    ticker=p["ticker"] or None,
                    corporate_parent=p["parent"],
                )
            )
            session.add(
                ViabilityScore(
                    building_id=p["id"],
                    final_score=p["score"],
                    score_raw=p["raw"],
                    physical_score=p["phys"],
                    economic_score=p["econ"],
                    strategic_score=p["strat"],
                    wrai=p["wrai"],
                    genome_archetype=p["genome"],
                    confidence_composite=p["conf"],
                )
            )

        # --- DFW Bulk Buildings ---
        tx_cities = [
            ("Dallas", "75201"),
            ("Fort Worth", "76102"),
            ("Plano", "75074"),
            ("Irving", "75038"),
            ("Garland", "75040"),
            ("Arlington", "76010"),
            ("Carrollton", "75006"),
            ("Mesquite", "75149"),
            ("Richardson", "75080"),
            ("McKinney", "75069"),
        ]
        sectors = ["Data Center", "Logistics", "Manufacturing", "Hospital", "University"]
        for i in range(50):
            bid = uuid.uuid4()
            all_building_ids.append(bid)
            city, z = tx_cities[i % len(tx_cities)]
            lon = -97.0 + random.random() * 0.5
            lat = 32.6 + random.random() * 0.35
            poly, pt = _rect(lon, lat, d=0.002)
            roof = random.randint(80_000, 350_000)
            eff_catch = int(roof * (0.85 + random.random() * 0.10))
            usable_fp = int(eff_catch * (0.70 + random.random() * 0.15))

            b = Building(
                id=bid,
                polygon=WKTElement(poly, srid=4326),
                centroid=WKTElement(pt, srid=4326),
                state="TX",
                city=city,
                address=f"{1000 + i} Industrial Blvd",
                zip=z,
                sector=sectors[i % len(sectors)],
                roof_sqft=roof,
                effective_catchment_sqft=eff_catch,
                usable_footprint_sqft=usable_fp,
                area_confidence=0.75 + random.random() * 0.2,
                name=f"DFW Industrial Site {i + 1}",
            )
            session.add(b)

            ct = random.random() > 0.4
            ct_count = random.randint(1, 4) if ct else 0
            ct_tier = _compute_ct_demand_tier(ct, ct_count)
            cooling_gal = _est_cooling_consumption(ct_count, roof)

            session.add(
                CVResult(
                    building_id=bid,
                    ct_detected=ct,
                    ct_confidence=0.75 + random.random() * 0.2 if ct else None,
                    ct_count=ct_count,
                    ct_type=random.choice(CT_TYPES) if ct else None,
                    ct_arrangement=random.choice(CT_ARRANGEMENTS) if ct else None,
                    ct_demand_tier=ct_tier,
                    est_cooling_consumption_gal_yr=cooling_gal,
                    ct_boxes=[],
                    roof_mask_url=roof_u,
                    roof_confidence=0.8,
                    effective_mask_url=roof_u,
                    usable_mask_url=roof_u,
                    imagery_source="Sentinel-2",
                    analysis_date=datetime.now(timezone.utc).date(),
                    raw_chip_url=raw_u,
                    masked_chip_url=mask_u,
                )
            )
            ds = random.randint(0, 3)
            dl = ["None", "D0", "D1", "D2", "D3", "D4"][ds]
            session.add(
                ClimateData(
                    building_id=bid,
                    annual_rain_inches=32.0 + random.random() * 4,
                    drought_score=ds,
                    drought_label=dl,
                    flood_zone=random.choice(["X", "AE", "AO"]),
                    fema_class="A",
                    fema_flood_risk=random.random(),
                )
            )
            session.add(
                FinancialData(
                    building_id=bid,
                    city_id="dallas_tx",
                    water_rate_per_kgal=4.4 + random.random(),
                    sewer_rate_per_kgal=5.0 + random.random(),
                    stormwater_fee_annual=800 + random.random() * 4000,
                    stormwater_eru_rate=10.0,
                    utility_source="Municipal",
                )
            )
            session.add(
                CorporateData(
                    building_id=bid,
                    owner_name=random.choice(
                        ["REIT Holdings LLC", "Industrial Partners", "LogiCorp USA",
                         "Prologis, L.P.", "Amazon.com, Inc."]
                    ),
                    esg_score=random.random() * 10,
                    water_mentions=random.randint(0, 8),
                    filing_year=2025,
                    leed_certified=random.random() > 0.85,
                    leed_level=random.choice(["Gold", "Silver", None]),
                    esg_accelerator=random.random() > 0.7,
                    corporate_parent=random.choice(
                        ["REIT Holdings", "Industrial Partners", "LogiCorp USA", "Prologis Inc.", "Amazon.com, Inc."]
                    ),
                )
            )
            phys = 20 + random.random() * 18
            econ = 18 + random.random() * 15
            strat = 12 + random.random() * 12
            raw = phys + econ + strat
            conf = 0.7 + random.random() * 0.25
            final = raw * (0.6 + 0.4 * conf)
            wrai_val = min(100, strat * 3 + random.random() * 10)
            session.add(
                ViabilityScore(
                    building_id=bid,
                    final_score=min(100, final),
                    score_raw=raw,
                    physical_score=phys,
                    economic_score=econ,
                    strategic_score=strat,
                    wrai=wrai_val,
                    genome_archetype=random.choice([
                        "Storm-Value Titan",
                        "Hidden High-ROI Candidate",
                        "ESG Mandate Accelerator",
                        "Cooling-Driven Reuse Giant",
                        "Flood-Resilience Priority",
                    ]),
                    confidence_composite=conf,
                )
            )

        # --- Pennsylvania Buildings ---
        pa_city = ("Philadelphia", "19107")
        for j in range(10):
            bid = uuid.uuid4()
            all_building_ids.append(bid)
            lon = -75.15 + random.random() * 0.08
            lat = 39.95 + random.random() * 0.06
            poly, pt = _rect(lon, lat, d=0.002)
            roof = random.randint(90_000, 280_000)
            eff_catch = int(roof * 0.88)
            usable_fp = int(eff_catch * 0.75)
            b = Building(
                id=bid,
                polygon=WKTElement(poly, srid=4326),
                centroid=WKTElement(pt, srid=4326),
                state="PA",
                city=pa_city[0],
                address=f"{200 + j} Market St",
                zip=pa_city[1],
                sector=random.choice(sectors),
                roof_sqft=roof,
                effective_catchment_sqft=eff_catch,
                usable_footprint_sqft=usable_fp,
                area_confidence=0.82,
                name=f"Philadelphia Commercial {j + 1}",
            )
            session.add(b)
            ct_count = random.randint(1, 2)
            session.add(
                CVResult(
                    building_id=bid,
                    ct_detected=True,
                    ct_confidence=0.8,
                    ct_count=ct_count,
                    ct_type=random.choice(CT_TYPES),
                    ct_arrangement=random.choice(CT_ARRANGEMENTS),
                    ct_demand_tier=_compute_ct_demand_tier(True, ct_count),
                    est_cooling_consumption_gal_yr=_est_cooling_consumption(ct_count, roof),
                    ct_boxes=[],
                    roof_mask_url=roof_u,
                    roof_confidence=0.85,
                    effective_mask_url=roof_u,
                    usable_mask_url=roof_u,
                    imagery_source="NAIP",
                    raw_chip_url=raw_u,
                    masked_chip_url=mask_u,
                )
            )
            session.add(
                ClimateData(
                    building_id=bid,
                    annual_rain_inches=41.0,
                    drought_score=1,
                    drought_label="D1",
                    flood_zone="AE",
                    fema_class="AE",
                    fema_flood_risk=0.45,
                )
            )
            session.add(
                FinancialData(
                    building_id=bid,
                    city_id="philadelphia_pa",
                    water_rate_per_kgal=5.2,
                    sewer_rate_per_kgal=6.1,
                    stormwater_fee_annual=4500.0,
                    stormwater_eru_rate=15.0,
                    utility_source="PWD",
                )
            )
            session.add(
                CorporateData(
                    building_id=bid,
                    owner_name="Philly Industrial REIT",
                    ticker="PIR",
                    esg_score=5.0,
                    water_mentions=2,
                    filing_year=2025,
                    leed_certified=False,
                    corporate_parent="Philly Industrial REIT",
                )
            )
            fs = 45 + random.random() * 35
            session.add(
                ViabilityScore(
                    building_id=bid,
                    final_score=fs,
                    score_raw=fs + 1,
                    physical_score=22.0,
                    economic_score=24.0,
                    strategic_score=15.0,
                    wrai=55.0,
                    genome_archetype="Hidden High-ROI Candidate",
                    confidence_composite=0.8,
                )
            )

        await session.flush()

        # --- Alert Events ---
        amazon_id = uuid.uuid5(NS, "amazon-ftw6")
        prologis_id = uuid.uuid5(NS, "prologis-burleson")
        cyrus_id = uuid.uuid5(NS, "cyrusone-carrollton")

        alerts_data = [
            ("drought", "TX", "Dallas", [amazon_id, prologis_id], 6.2, "Dallas County elevated to D2 drought — 14 buildings re-ranked ↑", "USDM"),
            ("rate", "TX", "Austin", [], 4.1, "Austin water rate increased 7.2% effective March 2026 — ROI recalculated for 8 sites", "Austin Water"),
            ("ordinance", "TX", "Fort Worth", [cyrus_id], 5.8, "Texas commercial stormwater credit program approved — 3 new qualifiers", "TCEQ"),
            ("sec", "TX", "Fort Worth", [amazon_id], 3.4, "Amazon 10-K cites water scarcity as material risk in Item 1A", "SEC EDGAR"),
            ("incentive", "TX", "Fort Worth", [], 2.9, "Fort Worth rebate program extended through 2027 — $50K additional per project", "City of Fort Worth"),
            ("drought", "TX", "Tarrant County", all_building_ids[:5], 5.1, "Tarrant County irrigation restrictions expanded to commercial sector", "TWDB"),
            ("rate", "TX", "Dallas", [], 3.0, "Dallas water board approved 4.1% sewer surcharge effective Q3 2026", "DWU"),
            ("ordinance", "TX", "Plano", [], 4.5, "Plano stormwater ordinance update favors on-site capture systems", "Plano GIS"),
            ("sec", "TX", "Irving", [cyrus_id], 2.2, "CyrusOne discloses cooling water dependency as operational risk in 10-K", "SEC EDGAR"),
            ("incentive", "TX", "Arlington", [], 3.1, "Arlington green infrastructure pilot grants now open — up to $75K", "City of Arlington"),
            ("drought", "TX", "Collin County", [], 5.5, "Collin County escalated to D1 — ROI models refreshed for 22 buildings", "USDM"),
            ("rate", "PA", "Philadelphia", [], 2.4, "Philadelphia stormwater fee schedule revision published — 12% increase", "PWD"),
            ("ordinance", "TX", "Garland", [], 2.8, "Garland industrial reuse guidance clarified for >80K sqft facilities", "City of Garland"),
            ("sec", "TX", "Mesquite", [], 1.9, "Logistics REIT adds water stewardship KPI to annual sustainability report", "SEC EDGAR"),
            ("incentive", "TX", "Richardson", [], 2.2, "Richardson sustainability rebate window opens — $30K max per site", "City of Richardson"),
            ("drought", "TX", "Dallas", [prologis_id], 4.4, "Trinity River basin stress watch issued — agricultural allocations reduced", "NWS"),
            ("rate", "TX", "McKinney", [], 1.7, "McKinney wholesale water pass-through adjusted +3.8%", "NTMWD"),
            ("ordinance", "TX", "DFW", all_building_ids[10:14], 6.0, "Regional haze plan tightens industrial water reporting for DFW metro", "TCEQ"),
            ("incentive", "TX", "Dallas", [amazon_id], 3.5, "LEED Water credit now qualifies for enhanced Dallas ICI rebate tier", "USGBC"),
            ("drought", "TX", "Denton County", [], 4.8, "Denton County enters D2 — third consecutive month of deficit", "USDM"),
        ]
        for t, st, city, bids, delta, desc, src in alerts_data:
            session.add(
                AlertEvent(
                    type=t,
                    state=st,
                    city=city,
                    building_ids=bids or None,
                    score_delta=delta,
                    description=desc,
                    source=src,
                    event_timestamp=datetime.now(timezone.utc) - timedelta(days=random.randint(1, 60)),
                )
            )

        # --- Automation History ---
        runs_data = [
            (7, 65, 3, 3, "completed"),
            (3, 65, 1, 1, "completed"),
            (1, 65, 2, 2, "completed"),
        ]
        for days_ago, scanned, crossings, dispatched, status in runs_data:
            run_at = datetime.now(timezone.utc).replace(hour=6, minute=0, second=0) - timedelta(days=days_ago)
            run = AutomationRun(
                user_id=rep_id,
                run_at=run_at,
                buildings_scanned=scanned,
                crossings_count=crossings,
                reports_dispatched=dispatched,
                status=status,
                completed_at=run_at + timedelta(minutes=12),
            )
            session.add(run)
            await session.flush()

            report_buildings = random.sample([amazon_id, prologis_id, cyrus_id], min(dispatched, 3))
            for rb in report_buildings:
                ar = AutomationReport(
                    run_id=run.id,
                    building_id=rb,
                    score_at_trigger=float(random.randint(80, 92)),
                    sonar_raw_json={
                        "summary": "Live web synthesis via Perplexity Sonar",
                        "sources": ["county_records", "sec_edgar", "linkedin", "local_news"],
                        "confidence": "high",
                    },
                    ownership_data={
                        "chain": [
                            {"entity": "Building OpCo LLC", "type": "Operating Company", "confidence": "high"},
                            {"entity": "Parent REIT Holdings", "type": "Corporate Parent", "confidence": "high"},
                        ],
                        "legal_owner": "OpCo LLC",
                        "corporate_parent": "Parent REIT Holdings",
                        "business_type": "Industrial REIT — Logistics",
                    },
                    contact_data={
                        "name": "Sarah Chen",
                        "title": "VP of Facilities",
                        "email": "s.chen@example.com",
                        "linkedin": "https://linkedin.com/in/sarachen",
                        "company": "Parent REIT Holdings",
                        "confidence": "medium",
                    },
                    outreach_scripts={
                        "cold_email": {
                            "subject": "Water resilience opportunity at your DFW facility",
                            "body": (
                                "Hi Sarah,\n\nI'm reaching out because your facility at [address] "
                                "sits in a D2 drought zone with an estimated 2.8M gallons of annual "
                                "capture potential. With the Dallas ICI rebate program offering up to "
                                "$100K and Texas sales tax exemption on the equipment, the payback "
                                "period is under 4 years.\n\nWould you be open to a 15-minute call "
                                "to discuss how Grundfos RainUSE could reduce your water costs?\n\n"
                                "Best,\n[Rep Name]\nGrundfos"
                            ),
                        },
                        "linkedin": (
                            "Hi Sarah — noticed your facility in DFW. With D2 drought conditions "
                            "and $100K in available rebates, commercial rainwater reuse is seeing "
                            "sub-4-year paybacks in your area. Would love to share what we're seeing."
                        ),
                        "phone": (
                            "Opening: Reference DFW drought conditions and rising water costs. "
                            "Key stat: 2.8M gallons annual capture potential at their roof size. "
                            "Incentive hook: Dallas ICI rebate up to $100K plus Texas sales tax "
                            "exemption. Ask: 15-minute site assessment discussion."
                        ),
                    },
                    routed_to_rep_id=rep_id,
                )
                session.add(ar)
                await session.flush()
                session.add(RepNotification(report_id=ar.id, rep_id=rep_id))

        # --- Login Debrief ---
        session.add(
            LoginDebrief(
                user_id=rep_id,
                script_text=(
                    "Good morning. Since your last session, two buildings in the DFW territory "
                    "crossed your threshold of 80. The top new prospect is a 295,000 square-foot "
                    "logistics facility near Fort Worth with an estimated 5.4 million gallons of "
                    "annual capture potential and an active D2 drought condition. Your automation "
                    "report is ready in the inbox. The DFW water market outlook has strengthened — "
                    "three new stormwater ordinances passed last month across Tarrant and Collin "
                    "counties. Dallas ICI rebates are fully funded through 2027 at up to $100,000 "
                    "per project. Recommend prioritizing cooling-tower-positive sites above 150K "
                    "square feet before Q2 rate cases finalize."
                ),
                elevenlabs_audio_url="https://example.com/rainuse/debrief-placeholder.mp3",
            )
        )

        await session.commit()
        print(
            "Seed complete: 5 anchor + 50 DFW + 10 PA buildings, "
            "20 alerts, 3 automation runs, reference case, adapters."
        )


def main() -> None:
    import sys
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(seed())


if __name__ == "__main__":
    main()
