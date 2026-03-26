"""
Wrapper de la API de OpenAI.
Centraliza la configuración del cliente, el manejo de errores
y la limpieza de respuestas JSON.
"""
import json
import logging
from openai import AsyncOpenAI
from config import get_settings

logger = logging.getLogger(__name__)


def get_client() -> AsyncOpenAI:
    """Crea el cliente OpenAI usando la API key del .env."""
    settings = get_settings()
    return AsyncOpenAI(api_key=settings.openai_api_key)


async def call_gpt(
    system_prompt: str,
    user_prompt: str,
    max_tokens: int | None = None,
) -> dict:
    """
    Llama a GPT-4o y devuelve el resultado como dict Python.

    - Usa response_format=json_object para garantizar JSON válido.
    - Temperatura 0.2: respuestas consistentes, poco creativas.
    - Maneja errores de OpenAI con mensajes descriptivos.
    """
    settings = get_settings()
    client   = get_client()

    tokens = max_tokens or settings.openai_max_tokens

    try:
        response = await client.chat.completions.create(
            model=settings.openai_model,
            max_tokens=tokens,
            temperature=0.2,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user",   "content": user_prompt},
            ],
        )

        raw = response.choices[0].message.content or ""
        # Limpia por si el modelo metió ```json ``` de todas formas
        clean = raw.replace("```json", "").replace("```", "").strip()

        return json.loads(clean)

    except json.JSONDecodeError as e:
        logger.error(f"OpenAI devolvió JSON inválido: {e}")
        raise ValueError(f"La IA devolvió una respuesta con formato incorrecto: {e}")

    except Exception as e:
        logger.error(f"Error en llamada a OpenAI: {e}")
        raise RuntimeError(f"Error comunicando con OpenAI: {e}")
