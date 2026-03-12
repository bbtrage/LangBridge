from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from api.middleware.auth import require_api_key
from config import settings

router = APIRouter(tags=["settings"])


class SettingsResponse(BaseModel):
    target_language: str
    elevenlabs_voice_id: str
    log_level: str
    max_sessions: int


class SettingsUpdate(BaseModel):
    target_language: str | None = None
    elevenlabs_voice_id: str | None = None


@router.get("/settings", response_model=SettingsResponse)
async def get_settings(_: None = Depends(require_api_key)) -> SettingsResponse:
    return SettingsResponse(
        target_language=settings.TARGET_LANGUAGE,
        elevenlabs_voice_id=settings.ELEVENLABS_VOICE_ID,
        log_level=settings.LOG_LEVEL,
        max_sessions=settings.MAX_SESSIONS,
    )


@router.patch("/settings")
async def update_settings(
    body: SettingsUpdate,
    _: None = Depends(require_api_key),
) -> dict:
    if body.target_language is not None:
        if body.target_language not in ("en", "hi"):
            raise HTTPException(
                status_code=400,
                detail="Supported languages: 'en', 'hi'",
            )
        settings.TARGET_LANGUAGE = body.target_language  # type: ignore[assignment]
    if body.elevenlabs_voice_id is not None:
        settings.ELEVENLABS_VOICE_ID = body.elevenlabs_voice_id  # type: ignore[assignment]
    return {"status": "updated"}
