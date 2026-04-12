import uuid

from sqlalchemy import Column, DateTime, Float, String, Text, func
from sqlalchemy.dialects.postgresql import ARRAY, UUID

from database import Base


class AlertEvent(Base):
    __tablename__ = "alert_events"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    type = Column(String(20), nullable=False)
    state = Column(String(2))
    city = Column(String(100))
    building_ids = Column(ARRAY(UUID(as_uuid=True)))
    score_delta = Column(Float)
    description = Column(Text)
    source = Column(Text)
    event_timestamp = Column(DateTime(timezone=True), server_default=func.now())
