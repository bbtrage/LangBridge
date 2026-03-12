import base64
import io
import struct
import wave

import numpy as np


def pcm_to_wav(
    pcm_bytes: bytes,
    sample_rate: int = 16000,
    channels: int = 1,
) -> bytes:
    """Convert raw 16-bit PCM bytes to a WAV-formatted byte string."""
    buffer = io.BytesIO()
    with wave.open(buffer, "wb") as wf:
        wf.setnchannels(channels)
        wf.setsampwidth(2)  # 16-bit
        wf.setframerate(sample_rate)
        wf.writeframes(pcm_bytes)
    return buffer.getvalue()


def base64_encode_audio(audio_bytes: bytes) -> str:
    """Base64-encode audio bytes to a UTF-8 string."""
    return base64.b64encode(audio_bytes).decode("utf-8")


def calculate_rms_energy(pcm_bytes: bytes) -> float:
    """
    Calculate the root-mean-square energy of a 16-bit little-endian PCM
    byte string.
    """
    num_samples = len(pcm_bytes) // 2
    if num_samples == 0:
        return 0.0
    samples = struct.unpack(f"<{num_samples}h", pcm_bytes[: num_samples * 2])
    arr = np.array(samples, dtype=np.float64)
    return float(np.sqrt(np.mean(np.square(arr))))
