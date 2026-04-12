"""Dealroom cached memo — PHASE_08."""

from pydantic import BaseModel


class DealroomMemoResponse(BaseModel):
    memo: str
    mode: str
    boardroom_verdict: str | None = None


class DealroomSendRequest(BaseModel):
    recipient_email: str
    recipient_name: str = ""


class DealroomSendResponse(BaseModel):
    success: bool
    message: str
