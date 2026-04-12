from pydantic import BaseModel, ConfigDict

from schemas.building import BuildingSummary


class PortfolioView(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    owner_name: str
    corporate_parent: str
    ticker: str
    building_count: int
    combined_roof_sqft: int
    combined_annual_gallons: float
    combined_potential_savings_usd: float
    first_domino_building_id: str
    first_domino_narrative: str
    buildings: list[BuildingSummary]
