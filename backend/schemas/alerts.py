from pydantic import BaseModel, ConfigDict


class AlertEventSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    type: str
    state: str | None
    city: str | None
    building_ids: list[str]
    score_delta: float | None
    description: str | None
    source: str | None
    event_timestamp: str


class AlertListResponse(BaseModel):
    data: list[AlertEventSchema]
    count: int
    filters_applied: dict
