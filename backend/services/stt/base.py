from abc import ABC, abstractmethod


class BaseSTTService(ABC):
    @abstractmethod
    async def transcribe(self, audio_bytes: bytes, language: str = "ja") -> str:
        """Transcribe audio bytes and return the recognised text."""
        pass
