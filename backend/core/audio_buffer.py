import io
import struct
import wave

import numpy as np

from utils.logger import get_logger

logger = get_logger(__name__)

# Energy-based VAD settings
_SILENCE_RMS_THRESHOLD: float = 200.0  # RMS units for 16-bit PCM
_SILENCE_DURATION_SAMPLES: int = 8000  # 8000 samples = 0.5s at 16kHz
_MAX_BUFFER_SAMPLES: int = 240000  # 15s at 16kHz


class AudioBuffer:
    """
    Accumulates PCM audio chunks and detects end-of-utterance via
    a simple energy-based VAD (RMS threshold + silence gap).
    """

    def __init__(self) -> None:
        self._samples: list[bytes] = []
        self._total_samples: int = 0
        self._silent_samples: int = 0

    def add_chunk(self, pcm_bytes: bytes) -> None:
        """Add a raw PCM chunk (16-bit, 16kHz, mono) to the buffer."""
        self._samples.append(pcm_bytes)
        num_samples = len(pcm_bytes) // 2  # 16-bit = 2 bytes per sample
        self._total_samples += num_samples

        rms = _calculate_rms_energy(pcm_bytes)
        if rms < _SILENCE_RMS_THRESHOLD:
            self._silent_samples += num_samples
        else:
            self._silent_samples = 0

    def is_utterance_complete(self) -> bool:
        """
        Returns True when:
        - A silence gap of >= 500ms has been detected after some speech, OR
        - The buffer has reached the maximum duration (15s).
        """
        if self._total_samples == 0:
            return False

        if self._total_samples >= _MAX_BUFFER_SAMPLES:
            logger.info("Max buffer duration reached — force flushing")
            return True

        if self._silent_samples >= _SILENCE_DURATION_SAMPLES:
            speech_samples = self._total_samples - self._silent_samples
            if speech_samples > 1600:  # At least 100ms of speech
                return True

        return False

    def flush(self) -> bytes:
        """Return buffered audio as WAV bytes and reset the buffer."""
        raw_pcm = b"".join(self._samples)
        self._samples = []
        self._total_samples = 0
        self._silent_samples = 0
        return pcm_to_wav(raw_pcm)

    def reset(self) -> None:
        """Discard buffered audio."""
        self._samples = []
        self._total_samples = 0
        self._silent_samples = 0


def pcm_to_wav(pcm_bytes: bytes, sample_rate: int = 16000, channels: int = 1) -> bytes:
    """Convert raw 16-bit PCM bytes to WAV format bytes."""
    buffer = io.BytesIO()
    with wave.open(buffer, "wb") as wf:
        wf.setnchannels(channels)
        wf.setsampwidth(2)  # 16-bit
        wf.setframerate(sample_rate)
        wf.writeframes(pcm_bytes)
    return buffer.getvalue()


def _calculate_rms_energy(pcm_bytes: bytes) -> float:
    """Calculate the RMS energy of a 16-bit PCM byte string."""
    num_samples = len(pcm_bytes) // 2
    if num_samples == 0:
        return 0.0
    samples = struct.unpack(f"<{num_samples}h", pcm_bytes[:num_samples * 2])
    arr = np.array(samples, dtype=np.float64)
    return float(np.sqrt(np.mean(np.square(arr))))
