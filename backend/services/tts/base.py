from abc import ABC, abstractmethod


class BaseTTSService(ABC):
    @abstractmethod
    async def synthesize(self, text: str, voice_settings: dict) -> bytes:
        """Synthesize speech and return MP3 bytes."""
        pass
