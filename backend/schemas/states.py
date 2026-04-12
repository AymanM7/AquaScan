from pydantic import BaseModel, ConfigDict

from schemas.building import BuildingSummary


class StateProfile(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    state: str
    total_buildings_over_100k: int
    total_annual_opportunity_gallons: float
    avg_viability_score: float
    top_incentive_value_usd: int
    avg_drought_score: float
    top_5_buildings: list[BuildingSummary]
    radar_scores: dict[str, float]
