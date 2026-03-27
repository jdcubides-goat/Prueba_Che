"""
Generación de contenido ecommerce con chunking paralelo.
Soporta hasta 500 productos. Compatible con Python 3.11+.
"""
import asyncio
import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services.openai_service import call_gpt

router = APIRouter(prefix="/api/content", tags=["Generación de contenido"])
logger = logging.getLogger(__name__)

CHUNK_SIZE = 15   # productos por llamada — conservador para tokens de salida
MAX_TOTAL  = 500

TONO_MAP = {
    "confianza": "tuteo, cercano, beneficio directo al cliente mexicano",
    "formal":    "usted, respetuoso, profesional",
    "tecnico":   "descriptivo, técnico, orientado a especificaciones",
}


class PipelineConfig(BaseModel):
    num_beneficios: int = 3
    max_nombre:     int = 75
    max_desc_corta: int = 120
    max_desc_larga: int = 250
    num_keywords:   int = 6
    tono:           str = "confianza"
    idioma:         str = "es-MX"


class GenerarContenidoRequest(BaseModel):
    productos: list[dict]
    config:    PipelineConfig = PipelineConfig()


def _build_product_line(i: int, p: dict) -> str:
    marca     = p.get("marca_validada") or p.get("marca_raw", "")
    tipo      = p.get("tipo_nombre", "")
    contenido = p.get("contenido", "")
    desc      = p.get("desc_raw", "")
    nombre    = p.get("nombre_proveedor", "")
    return (
        str(i) + ': "' + nombre + '" | marca: ' + marca
        + ' | tipo: ' + tipo + ' | contenido: ' + contenido
        + ' | desc: "' + desc + '"'
    )


def _build_beneficios_example(n: int) -> str:
    items = ["beneficio " + str(i + 1) for i in range(n)]
    return str(items)


def _build_keywords_example(n: int) -> str:
    items = ["keyword" + str(i + 1) for i in range(n)]
    return str(items)


async def _content_chunk(chunk: list[dict], cfg: PipelineConfig, offset: int) -> list[dict]:
    """Genera contenido para un chunk. Devuelve lista vacía si falla."""
    tono   = TONO_MAP.get(cfg.tono, TONO_MAP["confianza"])
    idioma = "Español de México" if cfg.idioma == "es-MX" else "Español de España"

    system_prompt = (
        "Eres el generador de contenido ecommerce de Chedraui México. "
        "Idioma: " + idioma + ". Tono: " + tono + ". "
        "REGLAS: "
        "nombre_ecommerce maximo " + str(cfg.max_nombre) + " chars (Tipo + Marca + Contenido). "
        "desc_corta maximo " + str(cfg.max_desc_corta) + " chars. "
        "desc_larga entre 150 y " + str(cfg.max_desc_larga) + " chars. "
        "beneficios: exactamente " + str(cfg.num_beneficios) + " items, maximo 50 chars cada uno. "
        "keywords: exactamente " + str(cfg.num_keywords) + " strings. "
        "medidas: unidad de medida del contenido neto. "
        "Responde exclusivamente con JSON valido, sin texto adicional."
    )

    lineas     = [_build_product_line(offset + i, p) for i, p in enumerate(chunk)]
    prods_str  = "\n".join(lineas)
    end_idx    = offset + len(chunk) - 1
    bens_ex    = _build_beneficios_example(cfg.num_beneficios)
    keys_ex    = _build_keywords_example(cfg.num_keywords)

    user_prompt = (
        "Genera contenido para " + str(len(chunk)) + " productos de Chedraui "
        + "(indices " + str(offset) + " a " + str(end_idx) + "):\n"
        + prods_str
        + "\n\nResponde con este JSON:\n"
        + '{"resultados": [{'
        + '"indice": ' + str(offset) + ', '
        + '"nombre_ecommerce": "maximo ' + str(cfg.max_nombre) + ' chars", '
        + '"desc_corta": "maximo ' + str(cfg.max_desc_corta) + ' chars", '
        + '"desc_larga": "150-' + str(cfg.max_desc_larga) + ' chars", '
        + '"beneficios": ' + bens_ex + ', '
        + '"keywords": ' + keys_ex + ', '
        + '"medidas": "unidad"}]}'
    )

    try:
        result = await call_gpt(system_prompt, user_prompt, max_tokens=4000)
        return result.get("resultados", [])
    except Exception as e:
        logger.warning("Chunk contenido %d-%d fallido: %s", offset, end_idx, e)
        return [{"indice": offset + i} for i in range(len(chunk))]


@router.post("/", summary="Generar contenido ecommerce — chunking paralelo hasta 500 productos")
async def generar_contenido(request: GenerarContenidoRequest):
    if not request.productos:
        raise HTTPException(400, "La lista de productos esta vacia")
    if len(request.productos) > MAX_TOTAL:
        raise HTTPException(400, "Maximo " + str(MAX_TOTAL) + " productos por llamada")

    productos = request.productos
    cfg       = request.config

    # Dividir en chunks
    chunks = [
        (productos[i:i + CHUNK_SIZE], i)
        for i in range(0, len(productos), CHUNK_SIZE)
    ]

    logger.info("Generando contenido para %d productos en %d chunks paralelos", len(productos), len(chunks))

    # Ejecutar todos en paralelo
    chunk_results = await asyncio.gather(*[
        _content_chunk(chunk, cfg, offset)
        for chunk, offset in chunks
    ])

    # Aplanar resultados
    all_results = [r for cr in chunk_results for r in cr]

    # Merge por índice y aplicar límite de chars
    productos_con_contenido = []
    for i, producto in enumerate(productos):
        contenido = next((r for r in all_results if r.get("indice") == i), {})
        nombre    = contenido.get("nombre_ecommerce", "")
        if len(nombre) > cfg.max_nombre:
            contenido["nombre_ecommerce"] = nombre[:cfg.max_nombre - 3] + "..."
        productos_con_contenido.append({**producto, **contenido})

    return {
        "ok":       True,
        "total":    len(productos_con_contenido),
        "chunks":   len(chunks),
        "config":   cfg.model_dump(),
        "productos": productos_con_contenido,
    }