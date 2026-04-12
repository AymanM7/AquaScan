import uuid

from sqlalchemy import Boolean, Column, Date, Float, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID

from database import Base


class CVResult(Base):
    __tablename__ = "cv_results"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    building_id = Column(UUID(as_uuid=True), ForeignKey("buildings.id"))
    ct_detected = Column(Boolean, default=False)
    ct_confidence = Column(Float)
    ct_boxes = Column(JSONB)
    roof_mask_url = Column(Text)
    roof_confidence = Column(Float)
    imagery_source = Column(String(50))
    analysis_date = Column(Date)
    raw_chip_url = Column(Text)
    masked_chip_url = Column(Text)
    gemini_analysis_text = Column(Text)
