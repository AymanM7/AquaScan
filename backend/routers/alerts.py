from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models.alert import AlertEvent
from schemas.alerts import AlertEventSchema, AlertListResponse

router = APIRouter()


@router.get("/alerts", response_model=AlertListResponse)
async def api_alerts(
    session: Annotated[AsyncSession, Depends(get_db)],
    state: str | None = None,
    event_type: str | None = Query(None, alias="type"),
    limit: int = Query(20, ge=1, le=200),
):
    filters_applied: dict = {}
    stmt = select(AlertEvent).order_by(desc(AlertEvent.event_timestamp)).limit(limit)
    if state:
        stmt = stmt.where(AlertEvent.state == state.upper())
        filters_applied["state"] = state.upper()
    if event_type:
        stmt = stmt.where(AlertEvent.type == event_type)
        filters_applied["type"] = event_type

    r = await session.execute(stmt)
    rows = r.scalars().all()
    data = [
        AlertEventSchema(
            id=str(a.id),
            type=a.type,
            state=a.state,
            city=a.city,
            building_ids=[str(x) for x in (a.building_ids or [])],
            score_delta=a.score_delta,
            description=a.description,
            source=a.source,
            event_timestamp=a.event_timestamp.isoformat() if a.event_timestamp else "",
        )
        for a in rows
    ]
    return AlertListResponse(data=data, count=len(data), filters_applied=filters_applied)
