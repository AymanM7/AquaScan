import uuid

from sqlalchemy import Column, DateTime, Float, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import UUID

from database import Base


class TexasReferenceCase(Base):
    __tablename__ = "texas_reference_case"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_name = Column(String(200), nullable=False)
    project_value_usd = Column(Float, nullable=False)
    abatement_pct = Column(Float, nullable=False)
    abatement_years = Column(Integer, nullable=False)
    county_tax_rate = Column(Float, nullable=False)
    annual_savings_usd = Column(Float, nullable=False)
    total_savings_usd = Column(Float, nullable=False)
    description = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
