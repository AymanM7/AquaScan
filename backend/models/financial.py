import uuid

from sqlalchemy import Column, DateTime, Float, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import UUID

from database import Base


class FinancialData(Base):
    __tablename__ = "financial_data"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    building_id = Column(UUID(as_uuid=True), ForeignKey("buildings.id"))
    city_id = Column(String(50))
    water_rate_per_kgal = Column(Float)
    sewer_rate_per_kgal = Column(Float)
    stormwater_fee_annual = Column(Float)
    stormwater_eru_rate = Column(Float)
    utility_source = Column(Text)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
