from typing import Any

from pydantic import BaseModel, ConfigDict

from schemas.alerts import AlertEventSchema


class BuildingSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    address: str
    city: str
    state: str
    sector: str
    roof_sqft: int
    effective_catchment_sqft: int = 0
    usable_footprint_sqft: int = 0
    centroid_lat: float
    centroid_lng: float
    polygon_geojson: dict[str, Any]
    final_score: float
    wrai: float
    genome_archetype: str
    ct_detected: bool
    ct_confidence: float
    ct_count: int = 0
    ct_demand_tier: str = "None"
    annual_gallons: float
    payback_years: float
    drought_label: str


class BuildingDetail(BuildingSummary):
    area_confidence: float
    roof_confidence: float = 0.0
    drought_score: int = 0
    roof_mask_url: str | None
    raw_chip_url: str | None
    masked_chip_url: str | None
    effective_mask_url: str | None = None
    usable_mask_url: str | None = None
    ct_boxes: list[dict[str, Any]]
    ct_type: str = ""
    ct_arrangement: str = ""
    est_cooling_consumption_gal_yr: float = 0.0
    water_rate_per_kgal: float
    sewer_rate_per_kgal: float
    stormwater_fee_annual: float
    rebate_usd: int
    sales_tax_exempt: bool
    property_tax_exempt: bool
    stormwater_credit_pct: float
    program_name: str
    owner_name: str
    sec_cik: str
    esg_score: float
    water_mentions: int
    leed_certified: bool
    leed_level: str
    esg_accelerator: bool
    ticker: str
    corporate_parent: str
    annual_rain_inches: float
    flood_zone: str
    fema_flood_risk: float
    physical_score: float
    economic_score: float
    strategic_score: float
    confidence_composite: float
    alert_events: list[AlertEventSchema]
    wrai_badge: str = "Standard"
    irr_pct: float = 0.0
    annual_savings_usd: float = 0.0
    npv_20yr: float = 0.0
    stormwater_fee_avoidance: float = 0.0
    savings_curve: list[dict[str, float | int]] = []
    hydro_thesis: str = "rain_roi"
    incentive_stack: list[dict[str, Any]] = []
    combined_incentive_estimate: float = 0.0
    texas_reference_case: dict[str, Any] | None = None


class ViabilityScoreResponse(BaseModel):
    final_score: float
    score_raw: float
    physical_score: float
    economic_score: float
    strategic_score: float
    wrai: float
    genome_archetype: str
    confidence_composite: float


class HarvestOutput(BaseModel):
    annual_gallons: float
    annual_savings_usd: float
    payback_years: float
    irr_pct: float
    stormwater_fee_avoidance: float
    incentives_captured: float
    npv_20yr: float
    savings_curve: list[dict[str, float | int]]


class BuildingListResponse(BaseModel):
    data: list[BuildingSummary]
    count: int
    filters_applied: dict
