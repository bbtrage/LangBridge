from fastapi import Header, HTTPException, status

from config import settings


async def require_api_key(x_api_key: str = Header(default="")) -> None:
    """Dependency that validates X-API-Key header for protected HTTP routes."""
    configured_key = settings.API_KEY
    if configured_key and x_api_key != configured_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing API key",
        )
