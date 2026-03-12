import time
from typing import Optional

from config import settings
from core.audio_buffer import AudioBuffer
from services.emotion.detector import EmotionDetector
from services.stt.groq_whisper import GroqWhisperSTT
from services.translation.google_translate import GoogleTranslationService
from services.tts.elevenlabs_tts import ElevenLabsTTSService
from utils.audio import base64_encode_audio
from utils.logger import get_logger

logger = get_logger(__name__)


class TranslationPipeline:
    """
    Orchestrates the full translation pipeline:
      Audio chunk → VAD → STT → Translation → Emotion → TTS → Result
    """

    def __init__(
        self,
        stt_service: GroqWhisperSTT,
        translation_service: GoogleTranslationService,
        emotion_service: EmotionDetector,
        tts_service: ElevenLabsTTSService,
    ) -> None:
        self._stt = stt_service
        self._translation = translation_service
        self._emotion = emotion_service
        self._tts = tts_service
        self._buffer = AudioBuffer()

    async def process(
        self, audio_chunk: bytes, session_id: str
    ) -> Optional[dict]:
        """
        Add an audio chunk to the buffer.  When VAD detects end-of-utterance,
        run the full pipeline and return a result dict.  Otherwise return None.
        """
        self._buffer.add_chunk(audio_chunk)

        if not self._buffer.is_utterance_complete():
            return None

        wav_bytes = self._buffer.flush()
        start_ts = time.time()

        # ── 1. STT ──────────────────────────────────────────────────────────
        t0 = time.time()
        try:
            original_text = await self._stt.transcribe(wav_bytes, language="ja")
        except Exception as exc:
            logger.error("[STT] Failed", extra={"session_id": session_id, "error": str(exc)})
            return None

        if not original_text.strip():
            return None

        logger.info(
            f"[STT] Transcribed in {int((time.time() - t0) * 1000)}ms: {original_text!r}",
            extra={"session_id": session_id},
        )

        # ── 2. Translation ───────────────────────────────────────────────────
        t0 = time.time()
        try:
            translated_text = await self._translation.translate(
                original_text, source_lang="ja", target_lang=settings.TARGET_LANGUAGE
            )
        except Exception as exc:
            logger.error("[Translation] Failed", extra={"session_id": session_id, "error": str(exc)})
            translated_text = original_text  # fallback

        logger.info(
            f"[Translation] Translated in {int((time.time() - t0) * 1000)}ms: {translated_text!r}",
            extra={"session_id": session_id},
        )

        # ── 3. Emotion detection ─────────────────────────────────────────────
        t0 = time.time()
        try:
            emotion_label, emotion_confidence, voice_settings = self._emotion.detect(
                translated_text
            )
        except Exception as exc:
            logger.error("[Emotion] Failed", extra={"session_id": session_id, "error": str(exc)})
            emotion_label = "neutral"
            emotion_confidence = 1.0
            voice_settings = EmotionDetector.EMOTION_TO_ELEVENLABS["neutral"]

        logger.info(
            f"[Emotion] Detected in {int((time.time() - t0) * 1000)}ms: "
            f"{emotion_label} ({emotion_confidence:.2f})",
            extra={"session_id": session_id},
        )

        # ── 4. TTS ───────────────────────────────────────────────────────────
        t0 = time.time()
        try:
            audio_bytes = await self._tts.synthesize(translated_text, voice_settings)
        except Exception as exc:
            logger.error("[TTS] Failed", extra={"session_id": session_id, "error": str(exc)})
            return None

        logger.info(
            f"[TTS] Synthesized in {int((time.time() - t0) * 1000)}ms",
            extra={"session_id": session_id},
        )

        total_latency_ms = int((time.time() - start_ts) * 1000)

        return {
            "type": "translation_result",
            "original_text": original_text,
            "translated_text": translated_text,
            "emotion": emotion_label,
            "emotion_confidence": round(emotion_confidence, 4),
            "audio": base64_encode_audio(audio_bytes),
            "latency_ms": total_latency_ms,
            "timestamp": time.time(),
        }
