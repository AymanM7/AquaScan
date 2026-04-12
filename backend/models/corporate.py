import uuid

from sqlalchemy import Boolean, Column, Float, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID

from database import Base


class CorporateData(Base):
    __tablename__ = "corporate_data"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    building_id = Column(UUID(as_uuid=True), ForeignKey("buildings.id"))
    owner_name = Column(Text)
    sec_cik = Column(String(20))
    esg_score = Column(Float)
    water_mentions = Column(Integer)
    filing_year = Column(Integer)
    leed_certified = Column(Boolean)
    leed_level = Column(String(20))
    esg_accelerator = Column(Boolean, default=False)
    ticker = Column(String(10))
    corporate_parent = Column(Text)
