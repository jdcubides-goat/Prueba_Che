"""
Clasificación AI con chunking paralelo.
Compatible con Python 3.11+ (sin backslashes dentro de f-strings).
Soporta hasta 500 productos procesados en lotes de 20 en paralelo.
"""
import json
import asyncio
import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services.openai_service import call_gpt
from services.data_service import get_catalog_summary

router = APIRouter(prefix="/api/classify", tags=["Clasificación AI"])
logger = logging.getLogger(__name__)

CHUNK_SIZE = 20
MAX_TOTAL  = 500

SYSTEM_PROMPT = (
    "Eres el motor de clasificación de productos del catálogo ecommerce de Chedraui México. "
    "Tu tarea: asignar categoría web, marca validada y tipo de producto a cada SKU. "
    "REGLAS ESTRICTAS: "
    "Usa ÚNICAMENTE los IDs de las listas cerradas proporcionadas. "
    "Si una marca no está en la lista usa 'NUEVA_MARCA' como marca_validada y '' como marca_id. "
    "Elige siempre la categoría más específica disponible. "
    "El campo confianza va de 0.0 a 1.0. "
    "Responde exclusivamente con JSON válido, sin texto adicional."
)


def _build_product_line(index: int, p: dict) -> str:
    """Una línea por producto. Función separada para evitar backslash en f-string."""
    nombre    = p.get("nombre_proveedor", "")
    contenido = p.get("contenido", "")
    marca     = p.get("marca_raw", "")
    return f'{index}: "{nombre}" | contenido: {contenido} | marca raw: {marca}'


def _build_chunk_prompt(chunk: list[dict], catalog: dict, offset: int) -> str:
    """Construye el prompt para un chunk sin backslashes en f-strings."""
    cats_str   = json.dumps(catalog["categorias"], ensure_ascii=False)
    marcas_str = json.dumps(catalog["marcas"],     ensure_ascii=False)
    tipos_str  = json.dumps(catalog["tipos"],      ensure_ascii=False)

    lineas = [_build_product_line(offset + i, p) for i, p in enumerate(chunk)]
    prods_str = "\n".join(lineas)

    end_idx = offset + len(chunk) - 1

    return (
        f"Listas cerradas Chedraui (usa SOLO estos IDs):\n"
        f"CATEGORÍAS:    {cats_str}\n"
        f"MARCAS ACTIVAS:{marcas_str}\n"
        f"TIPOS:         {tipos_str}\n\n"
        f"Clasifica estos {len(chunk)} productos (índices {offset} a {end_idx}):\n"
        + prods_str
        + "\n\nResponde con este JSON:\n"
        + '{"resultados": [{'
        + f'"indice": {offset}, '
        + '"categoria_id": "CAT-XXXX", '
        + '"categoria_path": "Departamento > Clase > Subclase", '
        + '"marca_id": "BRD-XXX", '
        + '"marca_validada": "Nombre normalizado", '
        + '"tipo_id": "TYP-XXX", '
        + '"tipo_nombre": "Nombre del tipo", '
        + '"confianza": 0.95}]}'
    )


async def _classify_chunk(chunk: list[dict], catalog: dict, offset: int) -> list[dict]:
    """Procesa un chunk. Si falla devuelve resultados vacíos para ese lote."""
    try:
        prompt = _build_chunk_prompt(chunk, catalog, offset)
        result = await call_gpt(SYSTEM_PROMPT, prompt, max_tokens=2000)
        return result.get("resultados", [])
    except Exception as e:
        logger.warning("Chunk %d-%d fallido: %s", offset, offset + len(chunk), e)
        return [{"indice": offset + i} for i in range(len(chunk))]


class ClasificarRequest(BaseModel):
    productos: list[dict]


@router.post("/", summary="Clasificar con OpenAI — chunking paralelo hasta 500 productos")
async def clasificar(request: ClasificarRequest):
    if not request.productos:
        raise HTTPException(400, "La lista de productos está vacía")
    if len(request.productos) > MAX_TOTAL:
        raise HTTPException(400, f"Máximo {MAX_TOTAL} productos por llamada")

    productos = request.productos
    catalog   = get_catalog_summary()

    # Dividir en chunks de CHUNK_SIZE
    chunks = [
        (productos[i:i + CHUNK_SIZE], i)
        for i in range(0, len(productos), CHUNK_SIZE)
    ]

    logger.info("Clasificando %d productos en %d chunks paralelos", len(productos), len(chunks))

    # Ejecutar todos en paralelo
    chunk_results = await asyncio.gather(*[
        _classify_chunk(chunk, catalog, offset)
        for chunk, offset in chunks
    ])

    # Aplanar resultados
    all_results = [r for chunk_r in chunk_results for r in chunk_r]

    # Merge por índice
    productos_clasificados = []
    for i, producto in enumerate(productos):
        clasificacion = next((r for r in all_results if r.get("indice") == i), {})
        productos_clasificados.append({**producto, **clasificacion})

    new_brands = sum(1 for p in productos_clasificados if p.get("marca_validada") == "NUEVA_MARCA")

    return {
        "ok":            True,
        "total":         len(productos_clasificados),
        "chunks":        len(chunks),
        "marcas_nuevas": new_brands,
        "productos":     productos_clasificados,
    }