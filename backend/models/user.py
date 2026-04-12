import uuid

from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID

from database import Base


class UserSettings(Base):
    __tablename__ = "user_settings"

    user_id = Column(String(200), primary_key=True)
    territory = Column(String(50), default="DFW")
    cadence = Column(String(20), default="weekly")
    score_threshold = Column(Integer, default=75)
    onboarding_complete = Column(Boolean, default=False)
    rep_zip = Column(String(10))
    notification_email = Column(Boolean, default=True)
    voice_model = Column(String(50), default="rachel")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class AutomationRun(Base):
    __tablename__ = "automation_runs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(String(200), ForeignKey("user_settings.user_id"))
    run_at = Column(DateTime(timezone=True), server_default=func.now())
    buildings_scanned = Column(Integer)
    crossings_count = Column(Integer)
    reports_dispatched = Column(Integer)
    status = Column(String(20), default="pending")
    error_message = Column(Text)
    completed_at = Column(DateTime(timezone=True))


class AutomationReport(Base):
    __tablename__ = "automation_reports"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    run_id = Column(UUID(as_uuid=True), ForeignKey("automation_runs.id"))
    building_id = Column(UUID(as_uuid=True), ForeignKey("buildings.id"))
    score_at_trigger = Column(Float, nullable=False)
    sonar_raw_json = Column(JSONB)
    ownership_data = Column(JSONB)
    contact_data = Column(JSONB)
    outreach_scripts = Column(JSONB)
    routed_to_rep_id = Column(String(200))
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class RepNotification(Base):
    __tablename__ = "rep_notifications"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    report_id = Column(UUID(as_uuid=True), ForeignKey("automation_reports.id"))
    rep_id = Column(String(200))
    read_at = Column(DateTime(timezone=True))
    actioned_at = Column(DateTime(timezone=True))
    action_type = Column(String(50))
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class LoginDebrief(Base):
    __tablename__ = "login_debriefs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(String(200), ForeignKey("user_settings.user_id"))
    generated_at = Column(DateTime(timezone=True), server_default=func.now())
    script_text = Column(Text, nullable=False)
    elevenlabs_audio_url = Column(Text)
    played_at = Column(DateTime(timezone=True))
