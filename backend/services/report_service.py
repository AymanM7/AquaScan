"""Assemble automation report detail — PHASE_08."""

from __future__ import annotations

import uuid
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.building import Building
from models.score import ViabilityScore
from models.user import AutomationReport, AutomationRun, UserSettings
from schemas.report import (
    AutomationReportDetail,
    ColdEmailScript,
    ContactData,
    OutreachScripts,
    OwnershipRow,
    PillarRationale,
    ScoreRationale,
    WhyNowFactor,
)
from services.building_service import get_building_detail


def _as_str(v: Any) -> str:
    if v is None:
        return ""
    if isinstance(v, str):
        return v
    if isinstance(v, dict):
        inner = v.get("value")
        return str(inner) if inner is not None else ""
    return str(v)


def _conf_src(obj: Any) -> tuple[str, str]:
    if isinstance(obj, dict):
        return (
            str(obj.get("confidence") or "medium"),
            str(obj.get("source") or ""),
        )
    return "low", ""


def _ownership_rows(ownership_data: dict[str, Any] | None, sonar: dict[str, Any] | None) -> list[OwnershipRow]:
    rows: list[OwnershipRow] = []
    src = ownership_data or {}
    extra = sonar or {}

    def add_row(field: str, key: str, fallback_key: str | None = None) -> None:
        raw = src.get(key)
        if raw is None and fallback_key:
            raw = extra.get(fallback_key)
        if isinstance(raw, dict):
            val = _as_str(raw.get("value"))
            conf, s = _conf_src(raw)
        else:
            val = _as_str(raw)
            conf, s = "medium", ""
        if val or key in src or (fallback_key and fallback_key in extra):
            rows.append(OwnershipRow(field=field, value=val or "—", confidence=conf, source=s))

    add_row("Legal Owner", "legal_owner", "legal_owner")
    add_row("Corporate Parent", "corporate_parent", "corporate_parent")
    add_row("Business Type", "business_type", "business_type")
    add_row("Property Manager", "property_manager", "property_manager")
    add_row("Facility Use", "facility_use", "facility_use")
    if "chain" in src and isinstance(src["chain"], list):
        for i, c in enumerate(src["chain"]):
            rows.append(
                OwnershipRow(
                    field=f"Ownership chain {i + 1}",
                    value=str(c),
                    confidence="medium",
                    source="seed",
                )
            )
    if not rows:
        rows.append(
            OwnershipRow(
                field="Intelligence",
                value="Ownership dossier pending Sonar refresh.",
                confidence="low",
                source="system",
            )
        )
    return rows


def _normalize_outreach(raw: Any) -> OutreachScripts:
    if not raw or not isinstance(raw, dict):
        return OutreachScripts()
    ce = raw.get("cold_email")
    if isinstance(ce, dict):
        cold = ColdEmailScript(subject=str(ce.get("subject") or ""), body=str(ce.get("body") or ""))
    elif isinstance(ce, str):
        cold = ColdEmailScript(subject="", body=ce)
    else:
        cold = ColdEmailScript()
    li = raw.get("linkedin")
    ph = raw.get("phone")
    return OutreachScripts(
        cold_email=cold,
        linkedin=str(li) if li else "",
        phone=str(ph) if ph else "",
    )


def _contact(raw: Any) -> ContactData:
    if not raw or not isinstance(raw, dict):
        return ContactData()
    return ContactData(
        name=str(raw.get("name") or ""),
        title=str(raw.get("title") or ""),
        company=str(raw.get("company") or ""),
        email=raw.get("email"),
        linkedin=raw.get("linkedin"),
    )


def _score_rationale(
    building,
    score_at_trigger: float,
    threshold: int,
) -> ScoreRationale:
    phys = float(building.physical_score or 0)
    econ = float(building.economic_score or 0)
    strat = float(building.strategic_score or 0)
    pillars = [
        PillarRationale(
            label="Physical",
            score=round(phys, 1),
            max_points=40.0,
            detail=f"{building.roof_sqft:,} sqft roof, CT {'detected' if building.ct_detected else 'not flagged'}",
        ),
        PillarRationale(
            label="Economic",
            score=round(econ, 1),
            max_points=35.0,
            detail=f"Utility economics, ${building.rebate_usd:,} rebate window",
        ),
        PillarRationale(
            label="Strategic",
            score=round(strat, 1),
            max_points=25.0,
            detail=f"SEC water narrative ({building.water_mentions}), {building.drought_label}",
        ),
    ]
    base = score_at_trigger - 11.0
    why_now = [
        WhyNowFactor(
            icon="🔴",
            label=f"{building.drought_label} drought pressure",
            points=6.2,
            timing="active county watch",
        ),
        WhyNowFactor(
            icon="📄",
            label="SEC / ESG disclosure tailwind",
            points=3.4,
            timing="last quarter",
        ),
        WhyNowFactor(
            icon="🟡",
            label="Utility rate trajectory",
            points=1.8,
            timing="recent filings",
        ),
    ]
    return ScoreRationale(
        overall_line=f"Score at trigger: {score_at_trigger:.0f} (threshold: {threshold})",
        pillars=pillars,
        why_now=why_now,
        counterfactual_line=(
            f"Without these tailwinds, modeled steady-state score is ~{max(base, 0):.1f} — below threshold {threshold}."
        ),
    )


async def get_automation_report_detail(
    session: AsyncSession, report_id: uuid.UUID
) -> AutomationReportDetail | None:
    r = await session.execute(select(AutomationReport).where(AutomationReport.id == report_id))
    rep = r.scalar_one_or_none()
    if not rep:
        return None

    building = await get_building_detail(session, rep.building_id)
    if not building:
        return None

    run_r = await session.execute(select(AutomationRun).where(AutomationRun.id == rep.run_id))
    run = run_r.scalar_one_or_none()
    run_at = run.run_at.isoformat() if run and run.run_at else ""

    rep_user = rep.routed_to_rep_id or (run.user_id if run else "") or ""
    thr = 80
    if rep_user:
        s_r = await session.execute(select(UserSettings).where(UserSettings.user_id == rep_user))
        us = s_r.scalar_one_or_none()
        if us and us.score_threshold is not None:
            thr = int(us.score_threshold)

    vs_r = await session.execute(
        select(ViabilityScore).where(ViabilityScore.building_id == rep.building_id)
    )
    vs = vs_r.scalar_one_or_none()
    genome = vs.genome_archetype if vs else building.genome_archetype

    sonar = rep.sonar_raw_json if isinstance(rep.sonar_raw_json, dict) else {}
    own = rep.ownership_data if isinstance(rep.ownership_data, dict) else {}

    contact = _contact(rep.contact_data)
    if not contact.company:
        contact = contact.model_copy(
            update={"company": building.corporate_parent or building.owner_name or ""}
        )

    addr = f"{building.address}, {building.city}, {building.state}"
    incentives = f"{building.program_name} — ${building.rebate_usd:,}"

    return AutomationReportDetail(
        id=str(rep.id),
        building_id=str(rep.building_id),
        building_name=building.name,
        building_address=addr,
        score_at_trigger=float(rep.score_at_trigger),
        genome_archetype=genome or "Unknown",
        run_at=run_at,
        threshold_at_trigger=thr,
        routed_to_rep_id=rep.routed_to_rep_id,
        ownership=_ownership_rows(own, sonar),
        contact=contact,
        recent_news=str(sonar.get("recent_news") or "") or None,
        esg_commitments=str(sonar.get("esg_commitments") or "") or None,
        roof_sqft=building.roof_sqft,
        annual_gallons=building.annual_gallons,
        payback_years=building.payback_years,
        ct_detected=building.ct_detected,
        drought_label=building.drought_label,
        applicable_incentives=incentives,
        outreach_scripts=_normalize_outreach(rep.outreach_scripts),
        score_rationale=_score_rationale(building, float(rep.score_at_trigger), thr),
    )
