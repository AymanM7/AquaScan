"""State battle verdict — PHASE_09."""

from pydantic import BaseModel, Field


class StateVerdictRequest(BaseModel):
    state_a: str = Field(..., min_length=2, max_length=2)
    state_b: str = Field(..., min_length=2, max_length=2)


class StateVerdictResponse(BaseModel):
    verdict: str
