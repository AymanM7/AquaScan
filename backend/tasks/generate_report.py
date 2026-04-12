"""Automation report generation — PHASE_07."""

from __future__ import annotations

import asyncio
import uuid

from celery_app import celery_app
from database import AsyncSessionLocal
from models.user import AutomationReport
from services.building_service import get_building_detail
from services.claude_service import generate_outreach_scripts_sync


@celery_app.task(name="tasks.generate_report.generate_automation_report")
def generate_automation_report(
    run_id, user_id, building_id, score_at_trigger, sonar_data
):
    return asyncio.run(
        _generate_report_async(run_id, user_id, building_id, score_at_trigger, sonar_data)
    )


async def _generate_report_async(run_id, user_id, building_id, score_at_trigger, sonar_data):
    async with AsyncSessionLocal() as db:
        building = await get_building_detail(db, uuid.UUID(str(building_id)))
        if not building:
            return None
        contact = (sonar_data or {}).get("decision_maker") or {}
        try:
            outreach = generate_outreach_scripts_sync(building, contact)
        except Exception:
            outreach = {
                "cold_email": {"subject": "Demo", "body": "Automation outreach (demo fallback)."},
                "linkedin": "Demo linkedin script.",
                "phone": "Demo phone script.",
            }

        report = AutomationReport(
            run_id=uuid.UUID(str(run_id)),
            building_id=uuid.UUID(str(building_id)),
            score_at_trigger=float(score_at_trigger),
            sonar_raw_json=sonar_data,
            ownership_data={
                "legal_owner": (sonar_data or {}).get("legal_owner"),
                "corporate_parent": (sonar_data or {}).get("corporate_parent"),
                "business_type": (sonar_data or {}).get("business_type"),
                "property_manager": (sonar_data or {}).get("property_manager"),
                "facility_use": (sonar_data or {}).get("facility_use"),
            },
            contact_data=contact,
            outreach_scripts=outreach,
        )
        db.add(report)
        await db.commit()
        await db.refresh(report)

        from tasks.route_to_rep import route_to_rep

        route_to_rep.delay(str(report.id), user_id, str(building_id))
        return str(report.id)
