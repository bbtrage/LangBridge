import asyncio
import io

import groq

from services.stt.base import BaseSTTService
from utils.logger import get_logger

logger = get_logger(__name__)

_MAX_RETRIES = 3
_RETRY_DELAY_SECONDS = 1.0


class GroqWhisperSTT(BaseSTTService):
    """
    Speech-to-text using the Groq Whisper Large V3 API.
    Converts audio bytes (WAV) to text with retry logic.
    """

    def __init__(self, api_key: str) -> None:
        self._client = groq.AsyncGroq(api_key=api_key)

    async def transcribe(self, audio_bytes: bytes, language: str = "ja") -> str:
        """
        Transcribe WAV audio bytes using Whisper Large V3 on Groq.
        Returns the transcribed text string.
        """
        for attempt in range(1, _MAX_RETRIES + 1):
            try:
                return await self._transcribe_once(audio_bytes, language)
            except groq.RateLimitError as exc:
                logger.warning(
                    f"[STT] Rate-limited (attempt {attempt}/{_MAX_RETRIES}): {exc}"
                )
                if attempt < _MAX_RETRIES:
                    await asyncio.sleep(_RETRY_DELAY_SECONDS * attempt)
            except groq.APIError as exc:
                logger.error(
                    f"[STT] API error (attempt {attempt}/{_MAX_RETRIES}): {exc}"
                )
                if attempt < _MAX_RETRIES:
                    await asyncio.sleep(_RETRY_DELAY_SECONDS * attempt)
                else:
                    raise

        return ""

    async def _transcribe_once(self, audio_bytes: bytes, language: str) -> str:
        file_tuple = ("audio.wav", io.BytesIO(audio_bytes), "audio/wav")
        response = await self._client.audio.transcriptions.create(
            file=file_tuple,
            model="whisper-large-v3",
            language=language,
            response_format="text",
        )
        # response is a plain string when response_format="text"
        text = response if isinstance(response, str) else str(response)
        return text.strip()
