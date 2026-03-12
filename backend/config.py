from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    GROQ_API_KEY: str = ""
    ELEVENLABS_API_KEY: str = ""
    ELEVENLABS_VOICE_ID: str = "21m00Tcm4TlvDq8ikWAM"  # Rachel
    TARGET_LANGUAGE: str = "en"
    LOG_LEVEL: str = "INFO"
    MAX_SESSIONS: int = 10
    API_KEY: str = ""  # For HTTP endpoint auth

    class Config:
        env_file = ".env"


settings = Settings()
