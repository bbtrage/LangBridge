import asyncio

from elevenlabs import AsyncElevenLabs, VoiceSettings

from services.tts.base import BaseTTSService
from utils.logger import get_logger

logger = get_logger(__name__)

_RETRY_DELAY_SECONDS = 1.0
_MAX_RETRIES = 3


class ElevenLabsTTSService(BaseTTSService):
    """
    Text-to-speech using ElevenLabs Multilingual V2.
    Accepts voice_settings dict with stability, similarity_boost, style keys
    to apply emotion-appropriate voice characteristics.
    """

    def __init__(self, api_key: str, voice_id: str) -> None:
        self._client = AsyncElevenLabs(api_key=api_key)
        self._voice_id = voice_id

    async def synthesize(self, text: str, voice_settings: dict) -> bytes:
        """
        Synthesize *text* with the given voice_settings and return MP3 bytes.
        Retries up to _MAX_RETRIES times on rate-limit errors.
        """
        for attempt in range(1, _MAX_RETRIES + 1):
            try:
                return await self._synthesize_once(text, voice_settings)
            except Exception as exc:
                err_str = str(exc).lower()
                if "rate" in err_str and attempt < _MAX_RETRIES:
                    logger.warning(
                        f"[TTS] Rate-limited (attempt {attempt}/{_MAX_RETRIES}), "
                        f"retrying in {_RETRY_DELAY_SECONDS}s…"
                    )
                    await asyncio.sleep(_RETRY_DELAY_SECONDS)
                else:
                    logger.error(f"[TTS] Error on attempt {attempt}: {exc}")
                    raise

        return b""

    async def _synthesize_once(self, text: str, voice_settings: dict) -> bytes:
        settings = VoiceSettings(
            stability=float(voice_settings.get("stability", 0.7)),
            similarity_boost=float(voice_settings.get("similarity_boost", 0.5)),
            style=float(voice_settings.get("style", 0.0)),
            use_speaker_boost=True,
        )

        audio_chunks: list[bytes] = []
        async for chunk in await self._client.text_to_speech.convert(
            voice_id=self._voice_id,
            text=text,
            model_id="eleven_multilingual_v2",
            voice_settings=settings,
        ):
            if chunk:
                audio_chunks.append(chunk)

        return b"".join(audio_chunks)
