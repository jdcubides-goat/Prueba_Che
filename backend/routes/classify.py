"""
Clasificación AI con chunking paralelo.
Divide los productos en lotes de 20 y los procesa simultáneamente
con asyncio.gather — esto permite 200+ productos a la misma velocidad que 20.
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

CHUNK_SIZE = 20   # productos por llamada a GPT — óptimo para tokens de salida
MAX_TOTAL  = 500  # límite real del endpoint

SYSTEM_PROMPT = """Eres el motor de clasificación de productos del catálogo ecommerce de Chedraui México.
Tu tarea: asignar categoría web, marca validada y tipo de producto a cada SKU.

REGLAS ESTRICTAS:
- Usa ÚNICAMENTE los IDs que aparecen en las listas cerradas proporcionadas.
- Si una marca no está en la lista → usa "NUEVA_MARCA" como marca_validada y "" como marca_id.
- Elige siempre la categoría más específica disponible.
- El campo "confianza" va de 0.0 a 1.0.
- Responde exclusivamente con JSON válido, sin texto adicional."""


def _build_prompt(chunk: list[dict], catalog: dict, offset: int) -> str:
    """Construye el prompt para un chunk. offset = índice del primer producto en el chunk."""
    return f"""
Listas cerradas Chedraui (usa SOLO estos IDs):
CATEGORÍAS:    {json.dumps(catalog['categorias'], ensure_ascii=False)}
MARCAS ACTIVAS:{json.dumps(catalog['marcas'],     ensure_ascii=False)}
TIPOS:         {json.dumps(catalog['tipos'],      ensure_ascii=False)}

Clasifica estos {len(chunk)} productos (índices globales {offset} a {offset + len(chunk) - 1}):
{chr(10).join(
    f'{offset + i}: "{p.get("nombre_proveedor","")}" | contenido: {p.get("contenido","")} | marca raw: {p.get("marca_raw","")}'
    for i, p in enumerate(chunk)
)}

Responde con este JSON:
{{
  "resultados": [
    {{
      "indice": {offset},
      "categoria_id": "CAT-XXXX",
      "categoria_path": "Departamento > Clase > Subclase",
      "marca_id": "BRD-XXX",
      "marca_validada": "Nombre normalizado",
      "tipo_id": "TYP-XXX",
      "tipo_nombre": "Nombre del tipo",
      "confianza": 0.95
    }}
  ]
}}"""


async def _classify_chunk(chunk: list[dict], catalog: dict, offset: int) -> list[dict]:
    """Procesa un chunk y devuelve sus resultados con índices corregidos."""
    try:
        prompt = _build_prompt(chunk, catalog, offset)
        result = await call_gpt(SYSTEM_PROMPT, prompt, max_tokens=2000)
        return result.get("resultados", [])
    except Exception as e:
        logger.warning(f"Chunk {offset}-{offset+len(chunk)} falló: {e}. Usando fallback vacío.")
        # Si un chunk falla, devuelve resultados vacíos para esos índices
        return [{"indice": offset + i} for i in range(len(chunk))]


class ClasificarRequest(BaseModel):
    productos: list[dict]


@router.post("/", summary="Clasificar productos con OpenAI (chunking paralelo)")
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

    logger.info(f"Clasificando {len(productos)} productos en {len(chunks)} chunks paralelos")

    # Ejecutar todos los chunks en paralelo
    chunk_results = await asyncio.gather(*[
        _classify_chunk(chunk, catalog, offset)
        for chunk, offset in chunks
    ])

    # Aplanar todos los resultados en una lista indexada
    all_results = [r for chunk_r in chunk_results for r in chunk_r]

    # Merge clasificación → productos originales por índice
    productos_clasificados = []
    for i, producto in enumerate(productos):
        clasificacion = next(
            (r for r in all_results if r.get("indice") == i),
            {}
        )
        productos_clasificados.append({**producto, **clasificacion})

    new_brands = sum(1 for p in productos_clasificados if p.get("marca_validada") == "NUEVA_MARCA")

    return {
        "ok":          True,
        "total":       len(productos_clasificados),
        "chunks":      len(chunks),
        "marcas_nuevas": new_brands,
        "productos":   productos_clasificados,
    }