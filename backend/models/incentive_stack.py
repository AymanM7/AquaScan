import uuid

from sqlalchemy import Column, DateTime, Float, ForeignKey, func
from sqlalchemy.dialects.postgresql import JSONB, UUID

from database import Base


class IncentiveStack(Base):
    __tablename__ = "incentive_stacks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    building_id = Column(UUID(as_uuid=True), ForeignKey("buildings.id"))
    applicable_programs = Column(JSONB, nullable=False, default=list)
    combined_estimate_usd = Column(Float, default=0)
    stack_generated_at = Column(DateTime(timezone=True), server_default=func.now())
