"""Application settings — extend env-backed configuration (Phases 06–07)."""

from pydantic_settings import BaseSettings, SettingsConfigDict


class AppSettings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env",),
        extra="ignore",
    )

    ANTHROPIC_API_KEY: str | None = None
    GEMINI_API_KEY: str | None = None
    PERPLEXITY_API_KEY: str | None = None
    ELEVENLABS_API_KEY: str | None = None
    ELEVENLABS_VOICE_ID: str | None = None

    S3_ENDPOINT_URL: str | None = None
    S3_BUCKET_NAME: str | None = None
    AWS_ACCESS_KEY_ID: str | None = None
    AWS_SECRET_ACCESS_KEY: str | None = None

    CELERY_BROKER_URL: str = "redis://localhost:6379/0"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/1"


app_settings = AppSettings()
