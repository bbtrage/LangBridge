import time
from collections import defaultdict, deque
from typing import Deque

from fastapi import WebSocket

# Per-session sliding-window rate limiter
_WINDOW_SECONDS: float = 1.0
_MAX_CHUNKS_PER_SECOND: int = 10

# Maps session_id → deque of timestamps
_session_windows: dict[str, Deque[float]] = defaultdict(deque)


def check_rate_limit(session_id: str) -> bool:
    """
    Return True if the request is within rate limits, False if exceeded.
    Uses a sliding-window counter: max 10 audio chunks per second per session.
    """
    now = time.monotonic()
    window: Deque[float] = _session_windows[session_id]

    # Remove timestamps outside the window
    while window and now - window[0] > _WINDOW_SECONDS:
        window.popleft()

    if len(window) >= _MAX_CHUNKS_PER_SECOND:
        return False

    window.append(now)
    return True


def clear_session(session_id: str) -> None:
    """Remove rate-limit state for a session when it ends."""
    _session_windows.pop(session_id, None)
