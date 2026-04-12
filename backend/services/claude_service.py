"""Claude integration — PHASE_06."""

from __future__ import annotations

import json
import logging
from typing import Any

import anthropic
from fastapi.responses import StreamingResponse

from config import app_settings
from schemas.building import BuildingDetail

logger = logging.getLogger(__name__)

MODEL = "claude-3-5-sonnet-20241022"


def _client() -> anthropic.Anthropic:
    key = app_settings.ANTHROPIC_API_KEY or ""
    return anthropic.Anthropic(api_key=key)


def build_deal_memo_prompt(building: BuildingDetail, mode: str) -> str:
    annual_cost = (
        (building.water_rate_per_kgal + building.sewer_rate_per_kgal)
        * building.annual_gallons
        / 1000
    )
    base_context = f"""
Building: {building.name}
Address: {building.address}, {building.city}, {building.state}
Roof Area: {building.roof_sqft:,} square feet
Cooling Towers: {'Detected at ' + str(round((building.ct_confidence or 0) * 100)) + '% confidence' if building.ct_detected else 'Not detected'}
Annual Rain Capture: {building.annual_gallons:,.0f} gallons
Estimated Payback: {building.payback_years:.1f} years
IRR: {building.irr_pct:.1f}%
Owner: {building.owner_name}
Corporate Parent: {building.corporate_parent}
SEC Water Mentions: {building.water_mentions} mentions in recent 10-K
LEED Status: {building.leed_level if building.leed_certified else 'Not certified'}
Drought Condition: {building.drought_label}
Available Incentives: ${building.rebate_usd:,} rebate, {building.program_name}
Tax Exemptions: {'Sales tax exempt' if building.sales_tax_exempt else ''} {'Property tax exempt' if building.property_tax_exempt else ''}
Annual Water+Sewer Cost (current): ${annual_cost:,.0f}
Viability Score: {building.final_score:.0f}/100
WRAI: {building.wrai:.0f}/100 ({building.wrai_badge})
Genome Archetype: {building.genome_archetype}
"""
    mode_prompts = {
        "Sales": f"""
{base_context}

Write a 280-320 word prospect brief for a Grundfos sales representative to send to a facilities director or procurement manager at {building.owner_name}.

The brief must:
- Open with the most compelling urgency signal (drought condition, SEC water risk mention, or rate trajectory)
- Reference the building's specific roof area and annual capture potential in concrete gallons
- Mention the payback period and key incentive program by name
- Include the parent company's own SEC language about water risk (paraphrase as: "your own annual report cites...")
- Close with a specific, low-commitment next step (15-minute call, site walk)
- Sound human, confident, and data-grounded — not generic

Do NOT use generic phrases like "sustainable future" or "world-class solution". Ground every sentence in this building's actual numbers.
""",
        "Engineering": f"""
{base_context}

Write a 280-320 word technical brief for a facilities engineer or chief engineer at {building.owner_name}.

The brief must:
- Lead with the physical fit assessment (roof area, material type assumptions, cooling tower integration opportunity)
- Describe the Grundfos RainUSE Nexus system in terms of: collection surface, first-flush diversion, storage tank sizing (approximate), pump specifications, and end-use integration points
- Reference the annual capture volume and how it maps to typical building water end uses (cooling makeup water, irrigation, flushing)
- Note any integration complexity considerations based on detected building features
- Describe the commissioning and monitoring approach
- Be specific and technical — this reader knows mechanical systems

Do NOT include financial details beyond CAPEX range estimate.
""",
        "Executive": f"""
{base_context}

Write a 280-320 word C-suite brief for a CFO or VP of Sustainability at {building.corporate_parent}.

The brief must:
- Frame water reuse as a strategic resilience investment, not a cost-cutting measure
- Reference the company's own ESG commitments and SEC water-risk disclosures directly
- Quantify the financial case: NPV, IRR, payback, and stormwater fee avoidance
- Connect to industry peer pressure (name competitors that have already adopted water reuse)
- Address the regulatory trajectory: current incentives, upcoming mandates, penalty exposure
- Close with enterprise framing: if this building is successful, how many others in the portfolio qualify?
- Sound like a peer executive conversation, not a vendor pitch

Tone: Strategic. Measured. Credible. Board-ready.
""",
    }
    return mode_prompts.get(mode, mode_prompts["Sales"])


def stream_deal_memo(building: BuildingDetail, mode: str) -> StreamingResponse:
    if not app_settings.ANTHROPIC_API_KEY:
        raise RuntimeError("ANTHROPIC_API_KEY missing")

    prompt = build_deal_memo_prompt(building, mode)
    client = _client()

    def generate():
        try:
            with client.messages.stream(
                model=MODEL,
                max_tokens=500,
                messages=[{"role": "user", "content": prompt}],
            ) as stream:
                for text in stream.text_stream:
                    yield f"data: {text}\n\n"
            yield "data: [DONE]\n\n"
        except anthropic.APIError as e:
            logger.exception("Claude API error")
            yield f"data: [ERROR] {e}\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")


BOARDROOM_SYSTEM_PROMPT = """
You are simulating a realistic internal stakeholder debate at a Fortune 500 company evaluating whether to purchase a Grundfos RainUSE Nexus water reuse system for a specific building.

Return ONLY a valid JSON array. No prose before or after. No markdown code blocks.

Format:
[
  {"persona": "CFO", "text": "..."},
  {"persona": "ESG_Officer", "text": "..."},
  {"persona": "Facilities_VP", "text": "..."},
  {"persona": "Risk_Manager", "text": "..."},
  {"persona": "Moderator", "verdict": "...", "confidence": 78}
]

Personas:
- CFO: Skeptical of capital allocation. Focuses on payback period, competing priorities, CapEx cycle timing.
- ESG_Officer: Enthusiastic. Cites company's own 10-K water risk language.
- Facilities_VP: Pragmatic. Concerned about installation disruption, maintenance burden.
- Risk_Manager: Cites drought exposure, regulatory trend, Legionella risk from cooling towers.
- Moderator: Synthesizes all perspectives. Delivers a final verdict sentence and confidence score (0-100).

Each turn must reference the ACTUAL data from the building provided.
"""


def build_boardroom_prompt(building: BuildingDetail) -> str:
    capex = int(building.roof_sqft * 0.018)
    ct_line = (
        "2 detected at 84% confidence — cooling makeup water integration opportunity"
        if building.ct_detected
        else "none detected"
    )
    return f"""
Debate whether to purchase a Grundfos RainUSE Nexus system for this building:

Building: {building.name}, {building.city} {building.state}
Roof: {building.roof_sqft:,} sqft | Annual capture: {building.annual_gallons:,.0f} gallons
Payback: {building.payback_years:.1f} years | IRR: {building.irr_pct:.1f}% | System CAPEX: ~${capex:,}
Cooling towers: {ct_line}
Drought: {building.drought_label} active in county
Owner's SEC 10-K water mentions: {building.water_mentions} ({"HIGH — flagged as ESG Accelerator prospect" if building.esg_accelerator else "moderate"})
Available incentive: {building.program_name} — ${building.rebate_usd:,} rebate, {'sales + property tax exemptions' if building.sales_tax_exempt else ''}
LEED status: {building.leed_level if building.leed_certified else 'not certified'}

Generate a realistic, specific debate. 8-12 turns. Moderator delivers final verdict.
"""


def generate_boardroom(building: BuildingDetail) -> dict[str, Any]:
    if not app_settings.ANTHROPIC_API_KEY:
        raise RuntimeError("ANTHROPIC_API_KEY missing")
    client = _client()
    response = client.messages.create(
        model=MODEL,
        max_tokens=1200,
        system=BOARDROOM_SYSTEM_PROMPT,
        messages=[{"role": "user", "content": build_boardroom_prompt(building)}],
    )
    text = response.content[0].text.strip()
    if text.startswith("```"):
        text = text[text.find("[") : text.rfind("]") + 1]
    dialogue = json.loads(text)
    return {"dialogue": dialogue}


def generate_debrief_script_sync(user_id: str, territory_data: dict[str, Any]) -> str:
    if not app_settings.ANTHROPIC_API_KEY:
        raise RuntimeError("ANTHROPIC_API_KEY missing")
    prompt = f"""
Write a 45-60 second intelligence debrief script (approximately 120-140 words) for a Grundfos sales representative logging in to their RainUSE Nexus dashboard.

Speak as a warm, professional intelligence system — not a robot. First person ("Since your last session...").

Data for the script:
- Territory: {territory_data['territory']}
- New buildings that crossed threshold since last login: {territory_data['new_crossings']}
- Top new prospect: {territory_data['top_building_name']}, {territory_data['top_building_city']}, Score {territory_data['top_score']}, {territory_data['top_gallons_m']:.1f}M gallons/year
- Active drought condition: {territory_data['drought_label']} ({territory_data['drought_description']})
- Recent market event: {territory_data['latest_event']}
- Automation reports ready: {territory_data['reports_pending']}

The script must feel like a personalized morning briefing. Start with the most important thing first. End with an actionable suggestion. Do NOT say "Grundfos" — the system is speaking to a Grundfos employee.

Return ONLY the script text. No labels, no stage directions.
"""
    client = _client()
    response = client.messages.create(
        model=MODEL,
        max_tokens=200,
        messages=[{"role": "user", "content": prompt}],
    )
    return response.content[0].text.strip()


def generate_outreach_scripts_sync(building: BuildingDetail, contact: dict[str, Any]) -> dict[str, Any]:
    if not app_settings.ANTHROPIC_API_KEY:
        raise RuntimeError("ANTHROPIC_API_KEY missing")
    base = f"""
Building: {building.name}, {building.city}
Owner: {building.owner_name} / {building.corporate_parent}
Contact: {contact.get('name', 'Facilities Director')}, {contact.get('title', 'Facilities Director')}
Key data: {building.roof_sqft:,} sqft roof, {building.annual_gallons:,.0f} gal/yr potential, {building.payback_years:.1f}yr payback
Drought: {building.drought_label} | Incentive: {building.program_name} ${building.rebate_usd:,}
SEC water mentions: {building.water_mentions}
"""
    scripts_prompt = f"""
{base}

Generate three outreach scripts for a Grundfos sales rep. Return as JSON only:

{{
  "cold_email": {{
    "subject": "...",
    "body": "... (4 paragraphs, ~200 words)"
  }},
  "linkedin": "... (3 sentences, connection request, ~60 words)",
  "phone": "... (90-second phone opener with key talking points, ~200 words, includes likely objections)"
}}

All three scripts must reference the building by name and specific data points.

Return ONLY the JSON object.
"""
    client = _client()
    response = client.messages.create(
        model=MODEL,
        max_tokens=800,
        messages=[{"role": "user", "content": scripts_prompt}],
    )
    text = response.content[0].text.strip()
    if text.startswith("```"):
        text = text[text.find("{") : text.rfind("}") + 1]
    return json.loads(text)
