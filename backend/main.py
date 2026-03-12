from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.routes import health, translate, settings

app = FastAPI(
    title="LangBridge API",
    version="1.0.0",
    description="Real-time emotional video translation backend",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(translate.router)
app.include_router(settings.router, prefix="/api")
