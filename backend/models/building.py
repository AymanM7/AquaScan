import uuid

from geoalchemy2 import Geometry
from sqlalchemy import Column, DateTime, Float, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import UUID

from database import Base


class Building(Base):
    __tablename__ = "buildings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    polygon = Column(Geometry("POLYGON", srid=4326), nullable=False)
    centroid = Column(Geometry("POINT", srid=4326), nullable=False)
    state = Column(String(2), nullable=False, index=True)
    city = Column(String(100), nullable=False)
    address = Column(Text, nullable=False)
    zip = Column("zip", String(10))
    sector = Column(String(50))
    roof_sqft = Column(Integer, nullable=False)
    effective_catchment_sqft = Column(Integer)
    usable_footprint_sqft = Column(Integer)
    area_confidence = Column(Float)
    name = Column(String(200))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
