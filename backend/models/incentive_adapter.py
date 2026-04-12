from sqlalchemy import Boolean, Column, Float, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB

from database import Base


class IncentiveAdapter(Base):
    __tablename__ = "incentive_adapters"

    city_id = Column(String(50), primary_key=True)
    city_name = Column(String(100))
    state = Column(String(2))
    rebate_usd = Column(Integer)
    mandate_threshold_sqft = Column(Integer)
    sales_tax_exempt = Column(Boolean)
    property_tax_exempt = Column(Boolean)
    stormwater_credit_pct = Column(Float)
    green_infra_grant_max = Column(Integer)
    program_name = Column(Text)
    description = Column(Text)
    adapter_json = Column(JSONB)
