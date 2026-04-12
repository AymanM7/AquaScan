"""Inbox notification cards — PHASE_08."""

from pydantic import BaseModel, ConfigDict


class InboxNotificationItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    report_id: str
    building_name: str
    building_address: str
    score_at_trigger: float
    threshold: int
    genome_archetype: str
    contact_name: str | None
    contact_title: str | None
    contact_company: str | None
    run_label: str
    run_at: str | None
    read_at: str | None
