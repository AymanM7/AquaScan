"""Perplexity Sonar — PHASE_06."""

from __future__ import annotations

import json
import logging

import httpx

from config import app_settings

logger = logging.getLogger(__name__)

SONAR_API_URL = "https://api.perplexity.ai/chat/completions"


async def research_building(
    building_name: str, address: str, city: str, state: str
) -> dict:
    if not app_settings.PERPLEXITY_API_KEY:
        return {
            "legal_owner": {"value": None, "confidence": "low", "source": "demo"},
            "corporate_parent": {"value": None, "confidence": "low", "source": "demo"},
            "business_type": {"value": "Commercial", "confidence": "low", "source": "demo"},
            "property_manager": {"value": None, "confidence": "low", "source": "demo"},
            "facility_use": {"value": None, "confidence": "low", "source": "demo"},
            "decision_maker": {
                "name": "Facilities Director",
                "title": "VP Operations",
                "email": None,
                "linkedin": None,
                "confidence": "low",
            },
            "recent_news": None,
            "esg_commitments": None,
            "note": "PERPLEXITY_API_KEY not configured — demo stub",
        }

    prompt = f"""
Research this commercial building and return structured intelligence:

Building: {building_name}
Address: {address}, {city}, {state}

Find and return as JSON:
{{
  "legal_owner": {{ "value": "...", "confidence": "high|medium|low", "source": "..." }},
  "corporate_parent": {{ "value": "...", "confidence": "high|medium|low", "source": "..." }},
  "business_type": {{ "value": "...", "confidence": "high|medium|low", "source": "..." }},
  "property_manager": {{ "value": "...", "confidence": "high|medium|low", "source": "..." }},
  "facility_use": {{ "value": "...", "confidence": "high|medium|low", "source": "..." }},
  "decision_maker": {{
    "name": "...",
    "title": "...",
    "email": "...",
    "linkedin": "...",
    "confidence": "high|medium|low"
  }},
  "recent_news": "...",
  "esg_commitments": "..."
}}

Return ONLY the JSON object. If a field cannot be found, use null.
"""
    async with httpx.AsyncClient() as client:
        response = await client.post(
            SONAR_API_URL,
            headers={
                "Authorization": f"Bearer {app_settings.PERPLEXITY_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": "sonar",
                "messages": [
                    {
                        "role": "system",
                        "content": "You are a commercial real estate intelligence researcher. Provide only verified, factual information. Return structured JSON.",
                    },
                    {"role": "user", "content": prompt},
                ],
                "max_tokens": 800,
                "temperature": 0.1,
            },
            timeout=30.0,
        )
        response.raise_for_status()
        data = response.json()
        text = data["choices"][0]["message"]["content"].strip()
        if "```" in text:
            text = text[text.find("{") : text.rfind("}") + 1]
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            logger.warning("Sonar JSON parse failed")
            return {"error": "Parse error", "raw": text}
