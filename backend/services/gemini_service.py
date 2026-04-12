"""Gemini integration — PHASE_06."""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING

import google.generativeai as genai

from config import app_settings
from schemas.building import BuildingDetail

if TYPE_CHECKING:
    pass

logger = logging.getLogger(__name__)


def _ensure():
    if not app_settings.GEMINI_API_KEY:
        raise RuntimeError("GEMINI_API_KEY missing")
    genai.configure(api_key=app_settings.GEMINI_API_KEY)


def generate_voice_pitch_sync(building: BuildingDetail) -> str:
    _ensure()
    model = genai.GenerativeModel("gemini-2.0-flash")
    prompt = f"""
Write a 80-100 word sales pitch script that will be spoken aloud for {building.name} in {building.city}, {building.state}.

Data: {building.roof_sqft:,} sqft roof, {building.annual_gallons / 1e6:.1f} million gallons annual capture potential, {building.payback_years:.1f} year payback, ${building.rebate_usd:,} rebate available.
{'Cooling towers detected — additional cooling makeup water savings opportunity.' if building.ct_detected else ''}
{building.drought_label} drought active in the county.
Owner: {building.corporate_parent} — {building.water_mentions} water risk mentions in their 10-K.

The script will be spoken by text-to-speech. Write for the ear, not the eye.
- Short sentences. Active verbs. Specific numbers.
- Open with the building talking about itself (first person: "I am the...")
- Build to a clear call to action: "The question isn't whether this building should harvest water. The question is when."
- Sound confident, data-grounded, and urgent.

Return ONLY the script text. No labels or stage directions.
"""
    response = model.generate_content(prompt)
    return (response.text or "").strip()


def hydro_deliberation_sync(building: BuildingDetail) -> str:
    _ensure()
    model = genai.GenerativeModel("gemini-2.0-flash")
    prompt = f"""
Given this building's profile, classify the primary water opportunity thesis. Return ONLY ONE of these three strings:
- "rain_roi" — primary value is roof rainfall capture and utility savings
- "cooling_reuse" — primary value is cooling tower water recycling (building has cooling towers)
- "resilience_flood" — primary value is flood resilience and stormwater management

Building data:
- Roof: {building.roof_sqft:,} sqft
- Cooling towers: {building.ct_detected} at {building.ct_confidence:.0%} confidence
- Drought: {building.drought_label}
- Flood zone: {building.flood_zone}
- Rain: {building.annual_rain_inches}" annual
- Stormwater fee: ${building.stormwater_fee_annual:,}/yr

Return ONLY the classification string.
"""
    response = model.generate_content(prompt)
    return (response.text or "").strip().lower()
