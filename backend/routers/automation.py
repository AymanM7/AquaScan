from typing import Annotated, Any

from celery.result import AsyncResult
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from celery_app import celery_app as celery_worker_app
from database import get_db
from models.building import Building
from models.score import ViabilityScore
from models.user import AutomationReport, AutomationRun
from schemas.ai import RunNowRequest
from tasks.scan_territory import run_territory_scan

router = APIRouter()


def _run_result(task_id: str) -> AsyncResult:
    return AsyncResult(task_id, app=celery_worker_app)


@router.get("/automation/runs")
async def get_automation_runs(
    user_id: Annotated[str, Query()],
    session: Annotated[AsyncSession, Depends(get_db)],
):
    r = await session.execute(
        select(AutomationRun)
        .where(AutomationRun.user_id == user_id)
        .order_by(AutomationRun.run_at.desc())
        .limit(20)
    )
    rows = r.scalars().all()
    return {
        "data": [
            {
                "id": str(x.id),
                "user_id": x.user_id,
                "run_at": x.run_at.isoformat() if x.run_at else None,
                "buildings_scanned": x.buildings_scanned,
                "crossings_count": x.crossings_count,
                "reports_dispatched": x.reports_dispatched,
                "status": x.status,
                "error_message": x.error_message,
                "completed_at": x.completed_at.isoformat() if x.completed_at else None,
            }
            for x in rows
        ]
    }


@router.get("/automation/reports")
async def get_automation_reports(
    user_id: Annotated[str, Query()],
    session: Annotated[AsyncSession, Depends(get_db)],
    min_score: float | None = None,
    genome: str | None = None,
):
    stmt = (
        select(AutomationReport, Building, ViabilityScore, AutomationRun)
        .join(Building, Building.id == AutomationReport.building_id)
        .join(ViabilityScore, ViabilityScore.building_id == Building.id)
        .join(AutomationRun, AutomationRun.id == AutomationReport.run_id)
        .where(AutomationRun.user_id == user_id)
        .order_by(AutomationReport.created_at.desc())
    )
    if min_score is not None:
        stmt = stmt.where(ViabilityScore.final_score >= min_score)
    if genome:
        stmt = stmt.where(ViabilityScore.genome_archetype == genome)
    r = await session.execute(stmt)
    out: list[dict[str, Any]] = []
    for rep, b, vs, run in r.all():
        out.append(
            {
                "id": str(rep.id),
                "run_id": str(rep.run_id),
                "run_at": run.run_at.isoformat() if run.run_at else None,
                "building_id": str(rep.building_id),
                "building_name": b.name,
                "building_address": f"{b.address}, {b.city}, {b.state}",
                "score_at_trigger": rep.score_at_trigger,
                "threshold": None,
                "genome_archetype": vs.genome_archetype,
                "contact_data": rep.contact_data,
                "ownership_data": rep.ownership_data,
            }
        )
    return {"data": out}


@router.post("/automation/run-now")
async def trigger_run_now(body: RunNowRequest):
    task = run_territory_scan.apply_async(
        args=[body.user_id],
        kwargs={"demo_mode": body.demo_mode},
    )
    return {"task_id": task.id}


@router.get("/automation/run-status/{task_id}")
async def get_run_status(task_id: str):
    res = _run_result(task_id)
    info = res.info if isinstance(res.info, dict) else {}
    return {
        "status": res.status,
        "progress": info,
        "result": res.result if res.ready() else None,
    }
