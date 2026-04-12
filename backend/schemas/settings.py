from pydantic import BaseModel, ConfigDict


class UserSettingsSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user_id: str
    territory: str
    cadence: str
    score_threshold: int
    onboarding_complete: bool
    rep_zip: str | None
    notification_email: bool
    voice_model: str


class SaveSettingsRequest(BaseModel):
    territory: str
    cadence: str
    score_threshold: int
    onboarding_complete: bool
    rep_zip: str | None = None
    notification_email: bool | None = None
    voice_model: str | None = None
