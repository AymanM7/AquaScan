from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.user import UserSettings


async def get_user_settings(session: AsyncSession, user_id: str) -> UserSettings | None:
    r = await session.execute(select(UserSettings).where(UserSettings.user_id == user_id))
    return r.scalar_one_or_none()
