"""Automation report detail — PHASE_08."""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field


class OwnershipRow(BaseModel):
    field: str
    value: str
    confidence: str = "low"
    source: str = ""


class ContactData(BaseModel):
    model_config = ConfigDict(extra="allow")

    name: str = ""
    title: str = ""
    company: str = ""
    email: str | None = None
    linkedin: str | None = None


class ColdEmailScript(BaseModel):
    subject: str = ""
    body: str = ""


class OutreachScripts(BaseModel):
    cold_email: ColdEmailScript = Field(default_factory=ColdEmailScript)
    linkedin: str = ""
    phone: str = ""


class PillarRationale(BaseModel):
    label: str
    score: float
    max_points: float
    detail: str


class WhyNowFactor(BaseModel):
    icon: str
    label: str
    points: float
    timing: str


class ScoreRationale(BaseModel):
    overall_line: str
    pillars: list[PillarRationale]
    why_now: list[WhyNowFactor]
    counterfactual_line: str


class AutomationReportDetail(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    building_id: str
    building_name: str
    building_address: str
    score_at_trigger: float
    genome_archetype: str
    run_at: str
    threshold_at_trigger: int
    routed_to_rep_id: str | None

    ownership: list[OwnershipRow]
    contact: ContactData
    recent_news: str | None = None
    esg_commitments: str | None = None

    roof_sqft: int
    annual_gallons: float
    payback_years: float
    ct_detected: bool
    drought_label: str
    applicable_incentives: str

    outreach_scripts: OutreachScripts
    score_rationale: ScoreRationale
