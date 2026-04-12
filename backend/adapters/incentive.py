"""Incentive adapter JSON loader — PHASE_02 §6."""

from __future__ import annotations

import json
from pathlib import Path

ADAPTERS_DIR = Path(__file__).resolve().parent / "data"


def load_adapter(city_id: str) -> dict:
    path = ADAPTERS_DIR / f"{city_id}.json"
    if not path.exists():
        return load_adapter("generic")
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def compute_incentive_value(adapter: dict, roof_sqft: int, capex: float) -> dict:
    programs = adapter.get("programs") or []
    total_rebate = sum(int(p.get("rebate_usd") or 0) for p in programs)

    sales_tax_savings = capex * 0.0825 if adapter.get("sales_tax_exempt") else 0.0
    property_tax_savings = capex * 0.015 * 10 if adapter.get("property_tax_exempt") else 0.0
    grant = min(float(adapter.get("green_infra_grant_max") or 0), capex * 0.3)

    return {
        "rebate_usd": total_rebate,
        "sales_tax_savings": sales_tax_savings,
        "property_tax_savings_est": property_tax_savings,
        "grant_eligible": grant,
        "total_incentive_estimate": total_rebate
        + sales_tax_savings
        + property_tax_savings
        + grant,
        "sales_tax_exempt": bool(adapter.get("sales_tax_exempt", False)),
        "property_tax_exempt": bool(adapter.get("property_tax_exempt", False)),
        "stormwater_credit_pct": float(adapter.get("stormwater_credit_pct", 0) or 0),
        "program_name": (programs[0].get("name") if programs else "") or "",
    }
