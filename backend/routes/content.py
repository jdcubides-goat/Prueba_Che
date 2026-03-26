"""
Generación de contenido ecommerce con configuración dinámica del pipeline.
El frontend envía config con: num_beneficios, max_nombre, max_desc_corta,
max_desc_larga, num_keywords, tono, idioma.
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
    num_beneficios:  int = 3
    max_nombre:      int = 75
    max_desc_corta:  int = 120
    max_desc_larga:  int = 250
    num_keywords:    int = 6
    tono:            str = "confianza"
    idioma:          str = "es-MX"

class GenerarContenidoRequest(BaseModel):
    productos: list[dict]
    config:    PipelineConfig = PipelineConfig()

@router.post("/", summary="Generar contenido ecommerce con OpenAI")
async def generar_contenido(request: GenerarContenidoRequest):
    if not request.productos:
        raise HTTPException(400, "La lista de productos está vacía")
    if len(request.productos) > 30:
        raise HTTPException(400, "Máximo 30 productos por llamada")

    cfg   = request.config
    tono  = TONO_MAP.get(cfg.tono, TONO_MAP["confianza"])
    idioma = "Español de México" if cfg.idioma == "es-MX" else "Español de España"

    system_prompt = f"""Eres el generador de contenido ecommerce de Chedraui México.
Idioma: {idioma}. Tono: {tono}.

REGLAS CRÍTICAS:
- nombre_ecommerce: MÁXIMO {cfg.max_nombre} caracteres. Fórmula: [Tipo] [Marca] [Contenido/Variante]
- desc_corta: máximo {cfg.max_desc_corta} caracteres. Un beneficio principal directo.
- desc_larga: entre 150 y {cfg.max_desc_larga} caracteres. Descripción completa para ecommerce.
- beneficios: exactamente {cfg.num_beneficios} items, máximo 50 chars cada uno.
- keywords: exactamente {cfg.num_keywords} strings para SEO y búsqueda interna.
- medidas: unidad de medida del contenido neto.
Responde exclusivamente con JSON válido, sin texto adicional."""

    user_prompt = f"""Genera contenido para {len(request.productos)} productos de Chedraui:
{chr(10).join(
    f"{i}: \"{p.get('nombre_proveedor','')}\" | "
    f"marca: {p.get('marca_validada') or p.get('marca_raw','')} | "
    f"tipo: {p.get('tipo_nombre','')} | "
    f"contenido: {p.get('contenido','')} | "
    f"desc proveedor: \"{p.get('desc_raw','')}\""
    for i, p in enumerate(request.productos)
)}

Responde con:
{{
  "resultados": [
    {{
      "indice": 0,
      "nombre_ecommerce": "máximo {cfg.max_nombre} chars",
      "desc_corta": "máximo {cfg.max_desc_corta} chars",
      "desc_larga": "150-{cfg.max_desc_larga} chars",
      "beneficios": {list(range(cfg.num_beneficios))},
      "keywords": {list(range(cfg.num_keywords))},
      "medidas": "unidad"
    }}
  ]
}}"""

    result     = await call_gpt(system_prompt, user_prompt, max_tokens=3500)
    resultados = result.get("resultados", [])

    productos_con_contenido = []
    for i, producto in enumerate(request.productos):
        contenido = next((r for r in resultados if r.get("indice") == i), {})
        # Forzar límite
        nombre = contenido.get("nombre_ecommerce", "")
        if len(nombre) > cfg.max_nombre:
            contenido["nombre_ecommerce"] = nombre[:cfg.max_nombre - 3] + "..."
        productos_con_contenido.append({**producto, **contenido})

    return {
        "ok":       True,
        "total":    len(productos_con_contenido),
        "config":   cfg.model_dump(),
        "productos": productos_con_contenido,
    }
