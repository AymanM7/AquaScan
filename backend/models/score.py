import uuid

from sqlalchemy import Column, DateTime, Float, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import UUID

from database import Base


class ViabilityScore(Base):
    __tablename__ = "viability_scores"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    building_id = Column(UUID(as_uuid=True), ForeignKey("buildings.id"), unique=True)
    final_score = Column(Float, nullable=False)
    score_raw = Column(Float)
    physical_score = Column(Float)
    economic_score = Column(Float)
    strategic_score = Column(Float)
    wrai = Column(Float)
    genome_archetype = Column(String(100))
    confidence_composite = Column(Float)
    last_computed = Column(DateTime(timezone=True), server_default=func.now())
