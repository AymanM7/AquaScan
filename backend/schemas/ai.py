from typing import Literal

from pydantic import BaseModel


class MemoRequest(BaseModel):
    mode: Literal["Sales", "Engineering", "Executive"]


class RunNowRequest(BaseModel):
    user_id: str
    demo_mode: bool = False


class DebriefGenerateRequest(BaseModel):
    user_id: str
