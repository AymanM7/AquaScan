import uuid

from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String, func
from sqlalchemy.dialects.postgresql import UUID

from database import Base


class ClimateData(Base):
    __tablename__ = "climate_data"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    building_id = Column(UUID(as_uuid=True), ForeignKey("buildings.id"))
    annual_rain_inches = Column(Float)
    drought_score = Column(Integer)
    drought_label = Column(String(10))
    flood_zone = Column(String(10))
    fema_class = Column(String(50))
    fema_flood_risk = Column(Float)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
