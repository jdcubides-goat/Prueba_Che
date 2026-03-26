from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # OpenAI
    openai_api_key: str
    openai_model: str = "gpt-4o"
    openai_max_tokens: int = 2000

    # Servidor
    port: int = 8000
    host: str = "0.0.0.0"

    # CORS
    frontend_url: str = "http://localhost:5173"

    # Entorno
    environment: str = "development"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

    @property
    def is_production(self) -> bool:
        return self.environment == "production"


@lru_cache()
def get_settings() -> Settings:
    """
    Devuelve una instancia única de Settings (singleton).
    lru_cache evita leer el .env en cada request.
    """
    return Settings()
