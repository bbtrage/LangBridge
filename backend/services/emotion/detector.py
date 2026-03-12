from transformers import pipeline as hf_pipeline

from utils.logger import get_logger

logger = get_logger(__name__)


class EmotionDetector:
    """
    Detects emotion from English text using
    j-hartmann/emotion-english-distilroberta-base and maps the result to
    ElevenLabs voice settings for emotional TTS output.
    """

    EMOTION_TO_ELEVENLABS: dict[str, dict[str, float]] = {
        "anger":    {"stability": 0.3, "similarity_boost": 0.8, "style": 0.9},
        "joy":      {"stability": 0.5, "similarity_boost": 0.7, "style": 0.7},
        "sadness":  {"stability": 0.8, "similarity_boost": 0.6, "style": 0.4},
        "fear":     {"stability": 0.2, "similarity_boost": 0.9, "style": 0.8},
        "surprise": {"stability": 0.3, "similarity_boost": 0.8, "style": 0.8},
        "disgust":  {"stability": 0.4, "similarity_boost": 0.7, "style": 0.6},
        "neutral":  {"stability": 0.7, "similarity_boost": 0.5, "style": 0.0},
    }

    # Map model labels → our canonical labels
    _LABEL_MAP: dict[str, str] = {
        "anger":    "anger",
        "joy":      "joy",
        "sadness":  "sadness",
        "fear":     "fear",
        "surprise": "surprise",
        "disgust":  "disgust",
        "neutral":  "neutral",
        # Alternative spellings used by some model checkpoints
        "happy":    "joy",
        "sad":      "sadness",
        "angry":    "anger",
        "fearful":  "fear",
        "surprised": "surprise",
        "disgusted": "disgust",
    }

    def __init__(self) -> None:
        logger.info("[Emotion] Loading emotion classifier on CPU…")
        self._classifier = hf_pipeline(
            "text-classification",
            model="j-hartmann/emotion-english-distilroberta-base",
            device=-1,  # CPU
            top_k=1,
        )
        logger.info("[Emotion] Classifier loaded")

    def detect(self, text: str) -> tuple[str, float, dict[str, float]]:
        """
        Detect emotion in *text* and return:
            (emotion_label, confidence, elevenlabs_voice_settings)
        """
        try:
            results = self._classifier(text)
            # top_k=1 returns a list-of-lists: [[{"label": ..., "score": ...}]]
            top = results[0][0] if isinstance(results[0], list) else results[0]
            raw_label: str = top["label"].lower()
            confidence: float = float(top["score"])

            label = self._LABEL_MAP.get(raw_label, "neutral")
            voice_settings = self.EMOTION_TO_ELEVENLABS.get(
                label, self.EMOTION_TO_ELEVENLABS["neutral"]
            )
            return label, confidence, voice_settings
        except Exception as exc:
            logger.error(f"[Emotion] Detection error: {exc}")
            return "neutral", 1.0, self.EMOTION_TO_ELEVENLABS["neutral"]
