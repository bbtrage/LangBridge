import asyncio
from functools import lru_cache

from deep_translator import GoogleTranslator

from services.translation.base import BaseTranslationService
from utils.logger import get_logger

logger = get_logger(__name__)


@lru_cache(maxsize=100)
def _cached_translate(text: str, source_lang: str, target_lang: str) -> str:
    """Synchronous translation call with LRU cache (maxsize=100)."""
    translator = GoogleTranslator(source=source_lang, target=target_lang)
    return translator.translate(text)


class GoogleTranslationService(BaseTranslationService):
    """
    Translation service using deep-translator (GoogleTranslator).
    Results are cached (LRU, maxsize=100) to avoid redundant API calls.
    """

    async def translate(
        self, text: str, source_lang: str = "ja", target_lang: str = "en"
    ) -> str:
        """
        Translate text asynchronously.
        Runs the synchronous deep-translator call in a thread executor to avoid
        blocking the event loop.
        """
        try:
            loop = asyncio.get_event_loop()
            translated = await loop.run_in_executor(
                None, _cached_translate, text, source_lang, target_lang
            )
            return translated
        except Exception as exc:
            logger.error(f"[Translation] Error: {exc}")
            raise
