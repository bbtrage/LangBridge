import base64
import json

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from api.middleware.rate_limit import check_rate_limit, clear_session
from core.session_manager import session_manager
from utils.logger import get_logger

router = APIRouter()
logger = get_logger(__name__)


@router.websocket("/ws/translate/{session_id}")
async def websocket_translate(websocket: WebSocket, session_id: str) -> None:
    await websocket.accept()
    logger.info("WebSocket connected", extra={"session_id": session_id})

    pipeline: TranslationPipeline = await session_manager.create_session(session_id)

    try:
        while True:
            message = await websocket.receive_text()
            data = json.loads(message)

            msg_type = data.get("type")

            if msg_type == "ping":
                await websocket.send_text(json.dumps({"type": "pong"}))
                continue

            if msg_type == "audio_chunk":
                if not check_rate_limit(session_id):
                    await websocket.send_text(
                        json.dumps({"type": "error", "message": "Rate limit exceeded"})
                    )
                    continue
                audio_b64: str = data.get("audio", "")
                if not audio_b64:
                    continue

                audio_bytes = base64.b64decode(audio_b64)

                result = await pipeline.process(audio_bytes, session_id)

                if result is not None:
                    await websocket.send_text(json.dumps(result))

    except WebSocketDisconnect:
        logger.info("WebSocket disconnected", extra={"session_id": session_id})
    except Exception as exc:
        logger.error(
            "WebSocket error",
            extra={"session_id": session_id, "error": str(exc)},
        )
        try:
            await websocket.send_text(
                json.dumps({"type": "error", "message": str(exc)})
            )
        except Exception:
            pass
    finally:
        await session_manager.remove_session(session_id)
        clear_session(session_id)
