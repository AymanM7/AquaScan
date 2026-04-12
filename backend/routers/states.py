from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from schemas.portfolio import PortfolioView
from services.state_service import build_state_profile, get_portfolio_view

router = APIRouter()


@router.get("/states/{state_a}/vs/{state_b}")
async def api_compare_states(
    state_a: str,
    state_b: str,
    session: Annotated[AsyncSession, Depends(get_db)],
) -> dict[str, Any]:
    a = state_a.upper()[:2]
    b = state_b.upper()[:2]
    if len(a) != 2 or len(b) != 2:
        raise HTTPException(status_code=422, detail="Invalid state code")
    pa = await build_state_profile(session, a)
    pb = await build_state_profile(session, b)
    return {
        a: pa.model_dump(),
        b: pb.model_dump(),
        "state_a": a,
        "state_b": b,
        "profiles": {a: pa.model_dump(), b: pb.model_dump()},
    }


@router.get("/portfolio/{owner:path}", response_model=PortfolioView)
async def api_portfolio(
    owner: str,
    session: Annotated[AsyncSession, Depends(get_db)],
):
    view = await get_portfolio_view(session, owner)
    if not view:
        raise HTTPException(status_code=404, detail={"error": "Not found", "code": "NOT_FOUND"})
    return view
