"""Route automation report to rep — PHASE_07."""

from __future__ import annotations

import asyncio
import uuid

from celery_app import celery_app
from database import AsyncSessionLocal
from models.user import AutomationReport, RepNotification


@celery_app.task(name="tasks.route_to_rep.route_to_rep")
def route_to_rep(report_id, user_id, building_id):
    return asyncio.run(_route_async(report_id, user_id, building_id))


async def _route_async(report_id, user_id, building_id):
    async with AsyncSessionLocal() as db:
        report = await db.get(AutomationReport, uuid.UUID(str(report_id)))
        if not report:
            return
        report.routed_to_rep_id = user_id
        db.add(
            RepNotification(
                report_id=uuid.UUID(str(report_id)),
                rep_id=user_id,
            )
        )
        await db.commit()
