"""ElevenLabs TTS — PHASE_06 (S3 optional)."""

from __future__ import annotations

import base64
import logging
import time

import httpx

from config import app_settings

logger = logging.getLogger(__name__)

ELEVENLABS_BASE = "https://api.elevenlabs.io/v1"


async def generate_debrief_audio(script: str, voice_id: str, user_id: str) -> str:
    if not app_settings.ELEVENLABS_API_KEY:
        return "https://example.com/rainuse/debrief-placeholder.mp3"

    vid = voice_id or app_settings.ELEVENLABS_VOICE_ID or "21m00Tcm4TlvDq8ikWAM"

    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{ELEVENLABS_BASE}/text-to-speech/{vid}",
            headers={
                "xi-api-key": app_settings.ELEVENLABS_API_KEY,
                "Content-Type": "application/json",
                "Accept": "audio/mpeg",
            },
            json={
                "text": script,
                "model_id": "eleven_multilingual_v2",
                "voice_settings": {
                    "stability": 0.65,
                    "similarity_boost": 0.80,
                    "style": 0.15,
                    "use_speaker_boost": True,
                },
            },
            timeout=60.0,
        )
        response.raise_for_status()
        audio_bytes = response.content

    if (
        app_settings.S3_BUCKET_NAME
        and app_settings.AWS_ACCESS_KEY_ID
        and app_settings.S3_ENDPOINT_URL
    ):
        try:
            import boto3

            s3 = boto3.client(
                "s3",
                endpoint_url=app_settings.S3_ENDPOINT_URL,
                aws_access_key_id=app_settings.AWS_ACCESS_KEY_ID,
                aws_secret_access_key=app_settings.AWS_SECRET_ACCESS_KEY,
            )
            key = f"debriefs/{user_id}/{int(time.time())}.mp3"
            s3.put_object(
                Bucket=app_settings.S3_BUCKET_NAME,
                Key=key,
                Body=audio_bytes,
                ContentType="audio/mpeg",
                ACL="public-read",
            )
            base = app_settings.S3_ENDPOINT_URL.rstrip("/")
            return f"{base}/{app_settings.S3_BUCKET_NAME}/{key}"
        except Exception as e:
            logger.exception("S3 upload failed: %s", e)

    b64 = base64.standard_b64encode(audio_bytes).decode("ascii")
    return f"data:audio/mpeg;base64,{b64}"
