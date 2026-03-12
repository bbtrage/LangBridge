import asyncio
import time
from dataclasses import dataclass, field
from typing import Optional

from config import settings
from utils.logger import get_logger

logger = get_logger(__name__)

_SESSION_TIMEOUT_SECONDS: int = 300  # 5 minutes


@dataclass
class SessionMeta:
    session_id: str
    created_at: float = field(default_factory=time.time)
    last_active: float = field(default_factory=time.time)
    chunks_processed: int = 0
    total_latency_ms: int = 0
    pipeline: object = None  # TranslationPipeline (avoid circular import)


class SessionManager:
    """Manages per-session TranslationPipeline instances and metadata."""

    def __init__(self) -> None:
        self._sessions: dict[str, SessionMeta] = {}
        self._lock = asyncio.Lock()

    async def create_session(self, session_id: str) -> object:
        """
        Create a new session with its own pipeline.
        Returns the TranslationPipeline instance.
        Raises ValueError if the server is at capacity.
        """
        # Lazy import to avoid circular dependency
        from core.pipeline import TranslationPipeline
        from services.emotion.detector import EmotionDetector
        from services.stt.groq_whisper import GroqWhisperSTT
        from services.translation.google_translate import GoogleTranslationService
        from services.tts.elevenlabs_tts import ElevenLabsTTSService

        async with self._lock:
            if len(self._sessions) >= settings.MAX_SESSIONS:
                raise ValueError(
                    f"Server at capacity ({settings.MAX_SESSIONS} sessions)"
                )

            stt = GroqWhisperSTT(api_key=settings.GROQ_API_KEY)
            translation = GoogleTranslationService()
            emotion = EmotionDetector()
            tts = ElevenLabsTTSService(
                api_key=settings.ELEVENLABS_API_KEY,
                voice_id=settings.ELEVENLABS_VOICE_ID,
            )
            pipeline = TranslationPipeline(
                stt_service=stt,
                translation_service=translation,
                emotion_service=emotion,
                tts_service=tts,
            )
            meta = SessionMeta(session_id=session_id, pipeline=pipeline)
            self._sessions[session_id] = meta

        logger.info(
            "Session created",
            extra={"session_id": session_id, "total_sessions": len(self._sessions)},
        )
        return pipeline

    async def remove_session(self, session_id: str) -> None:
        async with self._lock:
            self._sessions.pop(session_id, None)
        logger.info("Session removed", extra={"session_id": session_id})

    async def get_session_meta(self, session_id: str) -> Optional[SessionMeta]:
        return self._sessions.get(session_id)

    async def cleanup_inactive(self) -> None:
        """Remove sessions that have been inactive for longer than the timeout."""
        now = time.time()
        async with self._lock:
            stale = [
                sid
                for sid, meta in self._sessions.items()
                if now - meta.last_active > _SESSION_TIMEOUT_SECONDS
            ]
            for sid in stale:
                del self._sessions[sid]
                logger.info("Cleaned up inactive session", extra={"session_id": sid})


# Singleton
session_manager = SessionManager()
