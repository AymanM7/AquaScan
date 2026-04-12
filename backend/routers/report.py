from typing import Annotated
import uuid

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models.user import AutomationReport, RepNotification
from schemas.report import AutomationReportDetail
from services.report_service import get_automation_report_detail

router = APIRouter()


@router.get("/report/{report_id}", response_model=AutomationReportDetail)
async def api_get_report(
    report_id: uuid.UUID,
    session: Annotated[AsyncSession, Depends(get_db)],
):
    detail = await get_automation_report_detail(session, report_id)
    if not detail:
        raise HTTPException(status_code=404, detail={"error": "Not found", "code": "NOT_FOUND"})
    return detail


class RouteRequest(BaseModel):
    rep_id: str


@router.post("/report/{report_id}/route")
async def api_route_report(
    report_id: uuid.UUID,
    body: RouteRequest,
    session: Annotated[AsyncSession, Depends(get_db)],
):
    """Route an automation report to a specific rep, creating a notification."""
    r = await session.execute(
        select(AutomationReport).where(AutomationReport.id == report_id)
    )
    report = r.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    report.routed_to_rep_id = body.rep_id

    notif = RepNotification(
        report_id=report_id,
        rep_id=body.rep_id,
    )
    session.add(notif)
    await session.commit()

    return {
        "status": "routed",
        "report_id": str(report_id),
        "rep_id": body.rep_id,
        "notification_id": str(notif.id),
    }
