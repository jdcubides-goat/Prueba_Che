"""
Generación de contenido ecommerce.
Compatible con Python 3.11+ (sin backslashes dentro de f-strings).
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services.openai_service import call_gpt

router = APIRouter(prefix="/api/content", tags=["Generación de contenido"])

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
    """Construye una línea de producto para el prompt. Función separada = sin backslash en f-string."""
    marca    = p.get("marca_validada") or p.get("marca_raw", "")
    tipo     = p.get("tipo_nombre", "")
    contenido = p.get("contenido", "")
    desc     = p.get("desc_raw", "")
    nombre   = p.get("nombre_proveedor", "")
    return f'{i}: "{nombre}" | marca: {marca} | tipo: {tipo} | contenido: {contenido} | desc: "{desc}"'


def _build_beneficios_placeholder(n: int) -> str:
    return str(["beneficio " + str(i + 1) for i in range(n)])


def _build_keywords_placeholder(n: int) -> str:
    return str(["keyword" + str(i + 1) for i in range(n)])


@router.post("/", summary="Generar contenido ecommerce con OpenAI")
async def generar_contenido(request: GenerarContenidoRequest):
    if not request.productos:
        raise HTTPException(400, "La lista de productos está vacía")
    if len(request.productos) > 50:
        raise HTTPException(400, "Máximo 50 productos por llamada (usa chunking para más)")

    cfg    = request.config
    tono   = TONO_MAP.get(cfg.tono, TONO_MAP["confianza"])
    idioma = "Español de México" if cfg.idioma == "es-MX" else "Español de España"

    system_prompt = (
        "Eres el generador de contenido ecommerce de Chedraui México. "
        f"Idioma: {idioma}. Tono: {tono}. "
        f"REGLAS: nombre_ecommerce máximo {cfg.max_nombre} chars (Tipo + Marca + Contenido). "
        f"desc_corta máximo {cfg.max_desc_corta} chars. "
        f"desc_larga entre 150 y {cfg.max_desc_larga} chars. "
        f"beneficios: exactamente {cfg.num_beneficios} items, máximo 50 chars cada uno. "
        f"keywords: exactamente {cfg.num_keywords} strings. "
        "medidas: unidad de medida del contenido neto. "
        "Responde exclusivamente con JSON válido, sin texto adicional."
    )

    # Construir lista de productos sin backslash en f-string
    lineas_productos = [_build_product_line(i, p) for i, p in enumerate(request.productos)]
    productos_str    = "\n".join(lineas_productos)

    beneficios_ejemplo = _build_beneficios_placeholder(cfg.num_beneficios)
    keywords_ejemplo   = _build_keywords_placeholder(cfg.num_keywords)

    user_prompt = (
        f"Genera contenido para {len(request.productos)} productos de Chedraui:\n"
        + productos_str
        + "\n\nResponde con este JSON:\n"
        + '{"resultados": [{'
        + f'"indice": 0, "nombre_ecommerce": "máximo {cfg.max_nombre} chars", '
        + f'"desc_corta": "máximo {cfg.max_desc_corta} chars", '
        + f'"desc_larga": "150-{cfg.max_desc_larga} chars", '
        + f'"beneficios": {beneficios_ejemplo}, '
        + f'"keywords": {keywords_ejemplo}, '
        + '"medidas": "unidad"}]}'
    )

    result     = await call_gpt(system_prompt, user_prompt, max_tokens=4000)
    resultados = result.get("resultados", [])

    productos_con_contenido = []
    for i, producto in enumerate(request.productos):
        contenido = next((r for r in resultados if r.get("indice") == i), {})
        nombre    = contenido.get("nombre_ecommerce", "")
        if len(nombre) > cfg.max_nombre:
            contenido["nombre_ecommerce"] = nombre[:cfg.max_nombre - 3] + "..."
        productos_con_contenido.append({**producto, **contenido})

    return {
        "ok":       True,
        "total":    len(productos_con_contenido),
        "config":   cfg.model_dump(),
        "productos": productos_con_contenido,
    }