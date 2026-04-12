"""Rep inbox — PHASE_08."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import case, desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models.building import Building
from models.score import ViabilityScore
from models.user import AutomationReport, AutomationRun, RepNotification, UserSettings
from schemas.inbox import InboxNotificationItem

router = APIRouter()


@router.get("/inbox")
async def api_inbox(
    rep_id: Annotated[str, Query()],
    session: Annotated[AsyncSession, Depends(get_db)],
    sort: str = Query("newest", pattern="^(newest|highest_score|unread_first)$"),
):
    stmt = (
        select(RepNotification, AutomationReport, Building, ViabilityScore, AutomationRun)
        .join(AutomationReport, AutomationReport.id == RepNotification.report_id)
        .join(Building, Building.id == AutomationReport.building_id)
        .outerjoin(ViabilityScore, ViabilityScore.building_id == Building.id)
        .join(AutomationRun, AutomationRun.id == AutomationReport.run_id)
        .where(RepNotification.rep_id == rep_id)
    )
    if sort == "highest_score":
        stmt = stmt.order_by(desc(AutomationReport.score_at_trigger))
    elif sort == "unread_first":
        stmt = stmt.order_by(
            case((RepNotification.read_at.is_(None), 0), else_=1),
            desc(RepNotification.created_at),
        )
    else:
        stmt = stmt.order_by(desc(RepNotification.created_at))

    thr_default = 80
    us_r = await session.execute(select(UserSettings).where(UserSettings.user_id == rep_id))
    us0 = us_r.scalar_one_or_none()
    if us0 and us0.score_threshold is not None:
        thr_default = int(us0.score_threshold)

    r = await session.execute(stmt)
    out: list[InboxNotificationItem] = []
    for n, rep, b, vs, run in r.all():
        contact = rep.contact_data if isinstance(rep.contact_data, dict) else {}
        thr = thr_default
        out.append(
            InboxNotificationItem(
                id=str(n.id),
                report_id=str(rep.id),
                building_name=b.name or "Building",
                building_address=f"{b.address}, {b.city}, {b.state}",
                score_at_trigger=float(rep.score_at_trigger),
                threshold=thr,
                genome_archetype=(vs.genome_archetype if vs else "Unknown") or "Unknown",
                contact_name=contact.get("name"),
                contact_title=contact.get("title"),
                contact_company=contact.get("company"),
                run_label="Weekly Scan",
                run_at=run.run_at.isoformat() if run and run.run_at else None,
                read_at=n.read_at.isoformat() if n.read_at else None,
            )
        )
    return {"data": out, "count": len(out)}


@router.post("/inbox/{notification_id}/read")
async def api_mark_read(
    notification_id: uuid.UUID,
    session: Annotated[AsyncSession, Depends(get_db)],
):
    row = await session.get(RepNotification, notification_id)
    if not row:
        raise HTTPException(status_code=404, detail="Not found")
    row.read_at = datetime.now(timezone.utc)
    await session.commit()
    return {"success": True}


@router.post("/inbox/mark-all-read")
async def api_mark_all_read(
    rep_id: Annotated[str, Query()],
    session: Annotated[AsyncSession, Depends(get_db)],
):
    r = await session.execute(select(RepNotification).where(RepNotification.rep_id == rep_id))
    now = datetime.now(timezone.utc)
    for n in r.scalars().all():
        if n.read_at is None:
            n.read_at = now
    await session.commit()
    return {"success": True}
