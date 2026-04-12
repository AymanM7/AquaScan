"""Texas Incentive Intelligence Engine — verified programs per spec §incentives."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

ADAPTERS_DIR = Path(__file__).resolve().parent / "data"

# Grundfos CBS Brookshire reference case (verified)
TEXAS_REFERENCE_CASE = {
    "project_name": "Grundfos CBS Brookshire",
    "project_value_usd": 43_900_000,
    "abatement_pct": 60,
    "abatement_years": 10,
    "county_tax_rate": 0.00556187,
    "annual_savings_usd": 146_500,
    "total_savings_usd": 1_460_000,
    "description": (
        "Grundfos CBS Brookshire expansion: ~$1.46M in county tax savings over "
        "10 years via 60% Chapter 312 abatement on a $43.9M project."
    ),
}


def load_adapter(city_id: str) -> dict:
    path = ADAPTERS_DIR / f"{city_id}.json"
    if not path.exists():
        return load_adapter("generic")
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def compute_incentive_value(adapter: dict, roof_sqft: int, capex: float) -> dict:
    """Compute total incentive value from adapter programs."""
    programs = adapter.get("programs") or []
    total_rebate = sum(int(p.get("rebate_usd") or 0) for p in programs)

    sales_tax_pct = float(adapter.get("sales_tax_pct") or 8.25) / 100
    sales_tax_savings = capex * sales_tax_pct if adapter.get("sales_tax_exempt") else 0.0
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


def build_incentive_stack(
    adapter: dict,
    roof_sqft: int,
    capex: float,
    sector: str = "",
    state: str = "",
) -> list[dict[str, Any]]:
    """Build the per-building incentive stack with eligibility status per program."""
    programs = adapter.get("programs") or []
    stack: list[dict[str, Any]] = []

    for prog in programs:
        ptype = prog.get("type", "Utility Rebate")
        name = prog.get("name", "")
        source_url = prog.get("source_url", "")

        # Determine value and eligibility
        if ptype == "Utility Rebate":
            rebate = prog.get("rebate_usd", 0)
            if prog.get("open_ended"):
                value_str = "Custom — Request Quote"
                eligibility = "case_by_case"
            else:
                value_str = f"Up to ${rebate:,.0f}" if rebate else "Contact provider"
                eligibility = "confirmed"
        elif ptype == "Tax Exemption":
            pct = prog.get("pct", 0)
            if pct:
                value_usd = capex * (pct / 100)
                value_str = f"{pct}% of system CAPEX (~${value_usd:,.0f})"
                eligibility = "confirmed"
            else:
                value_str = "0%–100% of assessed value (case-by-case)"
                eligibility = "case_by_case"
        elif ptype == "Tax Abatement":
            ref = prog.get("reference_case", {})
            if ref:
                value_str = (
                    f"{ref.get('abatement_pct', 60)}% for {ref.get('years', 10)} years "
                    f"(~${ref.get('annual_savings', 0):,.0f}/yr precedent)"
                )
            else:
                value_str = "County-dependent"
            # Industrial/manufacturing more likely eligible
            eligibility = "likely" if sector in ("Manufacturing", "Logistics") else "case_by_case"
        elif ptype == "State Grant":
            tiers = prog.get("tiers", {})
            per_job = prog.get("per_job_range", "")
            if tiers:
                max_val = max(tiers.values())
                value_str = f"Up to ${max_val:,.0f} (tier-dependent)"
            elif per_job:
                value_str = f"{per_job} per qualified job"
            else:
                value_str = "Varies"
            eligibility = "likely" if sector in ("Manufacturing", "Data Center") else "case_by_case"
        elif ptype == "Mandate":
            threshold = prog.get("mandate_threshold_sqft", 0)
            if roof_sqft >= threshold:
                value_str = f"Mandatory for buildings >{threshold:,} sqft"
                eligibility = "confirmed"
            else:
                value_str = f"Applies to buildings >{threshold:,} sqft"
                eligibility = "not_applicable"
        else:
            value_str = prog.get("description", "")
            eligibility = "case_by_case"

        stack.append({
            "program_name": name,
            "type": ptype,
            "value": value_str,
            "eligibility": eligibility,
            "source_url": source_url,
            "description": prog.get("description", ""),
        })

    return stack


def compute_combined_incentive_estimate(
    adapter: dict,
    roof_sqft: int,
    capex: float,
) -> float:
    """Compute the combined dollar estimate for all applicable programs."""
    inv = compute_incentive_value(adapter, roof_sqft, capex)
    return float(inv.get("total_incentive_estimate") or 0)


def get_texas_reference_case() -> dict[str, Any]:
    """Return the Grundfos CBS Brookshire reference case."""
    return dict(TEXAS_REFERENCE_CASE)
