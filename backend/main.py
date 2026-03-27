"""
Chedraui Smart Onboarding — Backend
Python 3.11 compatible.
"""
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import get_settings
from routes import data, parse, classify, content, validate


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    print(f"\n  Chedraui Demo API · entorno: {settings.environment}")
    print(f"  Docs: http://localhost:{settings.port}/docs\n")
    yield
    print("\n  Servidor detenido\n")


settings = get_settings()

app = FastAPI(
    title="Chedraui Smart Onboarding API",
    description="Motor AI de alta de productos para ecommerce Chedraui",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# ── CORS ─────────────────────────────────────────────────────────────
# En producción usa FRONTEND_URL. En desarrollo permite todo.
is_dev = settings.environment == "development"

if is_dev:
    # Desarrollo local: permite cualquier origen
    allowed_origins = ["*"]
else:
    # Producción: solo el frontend de Vercel
    allowed_origins = [
        settings.frontend_url,
        settings.frontend_url.rstrip("/"),   # con y sin slash final
        "https://prueba-che.vercel.app",
        "https://prueba-o6spd0a5f-goat4.vercel.app",
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

# ── Routers ──────────────────────────────────────────────────────────
app.include_router(data.router)
app.include_router(parse.router)
app.include_router(classify.router)
app.include_router(content.router)
app.include_router(validate.router)


# ── Health check ─────────────────────────────────────────────────────
@app.get("/api/health", tags=["Sistema"])
def health():
    return {
        "status": "ok",
        "version": "1.0.0",
        "service": "Chedraui Smart Onboarding API",
        "entorno": settings.environment,
    }