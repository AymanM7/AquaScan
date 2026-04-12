from typing import Annotated
import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
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
