"""Sonar research task — PHASE_07."""

from __future__ import annotations

import asyncio

from celery_app import celery_app
from services.sonar_service import research_building


@celery_app.task(bind=True, name="tasks.run_sonar.run_sonar_research")
def run_sonar_research(
    self, run_id: str, user_id: str, building_data: dict, threshold: int
):
    return asyncio.run(_run_sonar_async(run_id, user_id, building_data, threshold))


async def _run_sonar_async(run_id, user_id, building_data, threshold):
    sonar_result = await research_building(
        building_name=building_data["building_name"],
        address=building_data["address"],
        city=building_data["city"],
        state=building_data["state"],
    )
    from tasks.generate_report import generate_automation_report

    generate_automation_report.delay(
        run_id,
        user_id,
        building_data["building_id"],
        building_data["score_at_trigger"],
        sonar_result,
    )
