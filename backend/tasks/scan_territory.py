"""Territory scan — PHASE_07."""

from __future__ import annotations

import asyncio
import uuid
from datetime import datetime, timezone

from celery_app import celery_app
from database import AsyncSessionLocal
from models.user import AutomationRun
from services.building_service import get_buildings_for_territory_scan, territory_to_state
from services.scoring import compute_full_score
from services.user_service import get_user_settings


@celery_app.task(bind=True, name="tasks.scan_territory.run_territory_scan")
def run_territory_scan(self, user_id: str, demo_mode: bool = False):
    return asyncio.run(_run_territory_scan_async(self, user_id, self.request.id, demo_mode))


async def _run_territory_scan_async(task_self, user_id: str, task_id: str, demo_mode: bool):
    async with AsyncSessionLocal() as db:
        settings = await get_user_settings(db, user_id)
        threshold = int(settings.score_threshold or 75) if settings else 75
        territory = settings.territory if settings else "DFW"
        state = territory_to_state(territory)

        run = AutomationRun(
            user_id=user_id,
            status="running",
            buildings_scanned=0,
            crossings_count=0,
            reports_dispatched=0,
        )
        db.add(run)
        await db.commit()
        await db.refresh(run)

        try:
            task_self.update_state(
                state="PROGRESS",
                meta={"stage": "init", "current": 0, "total": 0, "message": "Starting territory scan"},
            )
            if demo_mode:
                run.buildings_scanned = 55
                run.crossings_count = 3
                run.reports_dispatched = 3
                run.status = "completed"
                run.completed_at = datetime.now(timezone.utc)
                await db.commit()
                from tasks.generate_debrief import generate_user_debrief

                generate_user_debrief.delay(user_id)
                return {
                    "run_id": str(run.id),
                    "buildings_scanned": 55,
                    "crossings": 3,
                    "status": "completed",
                    "demo_mode": True,
                }

            buildings = await get_buildings_for_territory_scan(db, state)
            crossings: list[dict] = []
            task_self.update_state(
                state="PROGRESS",
                meta={
                    "stage": "scoring",
                    "current": 0,
                    "total": len(buildings),
                    "message": f"Scoring {len(buildings)} buildings in {state}",
                },
            )

            for i, (b, vs) in enumerate(buildings):
                prev = float(vs.final_score or 0.0)
                new_score = await compute_full_score(b.id, db)
                new_final = float(new_score.final_score)
                if prev < float(threshold) <= new_final:
                    crossings.append(
                        {
                            "building_id": str(b.id),
                            "score_at_trigger": new_final,
                            "building_name": b.name or "",
                            "address": b.address or "",
                            "city": b.city,
                            "state": b.state,
                        }
                    )
                if i % 10 == 0:
                    await db.commit()
                    task_self.update_state(
                        state="PROGRESS",
                        meta={
                            "stage": "scoring",
                            "current": i + 1,
                            "total": len(buildings),
                            "message": "Recomputing viability scores",
                        },
                    )

            run.buildings_scanned = len(buildings)
            run.crossings_count = len(crossings)
            await db.commit()

            from tasks.run_sonar import run_sonar_research

            task_self.update_state(
                state="PROGRESS",
                meta={
                    "stage": "sonar",
                    "current": 0,
                    "total": len(crossings),
                    "message": "Dispatching Sonar research for threshold crossings",
                },
            )
            for c in crossings:
                run_sonar_research.delay(
                    str(run.id), user_id, c, threshold
                )

            run.status = "completed"
            run.reports_dispatched = len(crossings)
            run.completed_at = datetime.now(timezone.utc)
            await db.commit()

            from tasks.generate_debrief import generate_user_debrief

            generate_user_debrief.delay(user_id)

            return {
                "run_id": str(run.id),
                "buildings_scanned": len(buildings),
                "crossings": len(crossings),
                "status": "completed",
            }
        except Exception as e:
            run.status = "failed"
            run.error_message = str(e)
            await db.commit()
            raise
