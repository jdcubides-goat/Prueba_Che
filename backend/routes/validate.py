"""
Endpoint de validación y exportación a Stibo Step.
Verifica coherencia de los campos generados por AI
y construye el CSV listo para carga masiva en el MDM.
"""
import csv
import io
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from services.data_service import get_category_by_id, get_type_by_id

router = APIRouter(prefix="/api/validate", tags=["Validación y export Stibo"])

STIBO_COLUMNS = [
    "SKU", "UPC", "ID_CATEGORIA", "CATEGORIA_WEB",
    "TIPO_PRODUCTO_ID", "TIPO_PRODUCTO", "MARCA_ID", "MARCA",
    "NOMBRE_ECOMMERCE", "DESC_CORTA", "DESC_LARGA",
    "BENEFICIOS", "KEYWORDS", "MEDIDAS", "CONFIANZA_AI",
]


def _validar_producto(p: dict) -> dict:
    errores = []
    advertencias = []

    # Nombre ecommerce
    nombre = p.get("nombre_ecommerce", "")
    if not nombre:
        errores.append("Falta nombre_ecommerce")
    elif len(nombre) > 75:
        errores.append(f"Nombre excede 75 chars ({len(nombre)})")
    elif len(nombre) < 10:
        advertencias.append("Nombre muy corto — revisar")

    # Categoría
    cat_id = p.get("categoria_id", "")
    if not cat_id:
        errores.append("Falta categoria_id")
    elif not get_category_by_id(cat_id):
        errores.append(f"categoria_id inválido: {cat_id}")

    # Marca
    if not p.get("marca_validada"):
        advertencias.append("Marca sin validar contra lista cerrada")
    elif p.get("marca_validada") == "NUEVA_MARCA":
        advertencias.append("Marca nueva — requiere alta en Chedraui antes de publicar")

    # Tipo de producto
    if not p.get("tipo_id"):
        advertencias.append("Falta tipo_id — filtros ecommerce incompletos")

    # Contenido AI
    if not p.get("desc_corta"):
        advertencias.append("Falta descripción corta")
    if not p.get("desc_larga"):
        advertencias.append("Falta descripción larga")

    keywords = p.get("keywords", [])
    if not keywords or len(keywords) < 3:
        advertencias.append("Menos de 3 keywords — SEO débil")

    estado = (
        "error"       if errores
        else "advertencia" if advertencias
        else "aprobado"
    )

    return {"estado": estado, "errores": errores, "advertencias": advertencias}


def _build_stibo_row(p: dict) -> dict:
    beneficios = p.get("beneficios", [])
    keywords   = p.get("keywords", [])
    confianza  = p.get("confianza")

    return {
        "SKU":              p.get("sku") or p.get("upc", ""),
        "UPC":              p.get("upc", ""),
        "ID_CATEGORIA":     p.get("categoria_id", ""),
        "CATEGORIA_WEB":    p.get("categoria_path", ""),
        "TIPO_PRODUCTO_ID": p.get("tipo_id", ""),
        "TIPO_PRODUCTO":    p.get("tipo_nombre", ""),
        "MARCA_ID":         p.get("marca_id", ""),
        "MARCA":            p.get("marca_validada") or p.get("marca_raw", ""),
        "NOMBRE_ECOMMERCE": p.get("nombre_ecommerce", ""),
        "DESC_CORTA":       p.get("desc_corta", ""),
        "DESC_LARGA":       p.get("desc_larga", ""),
        "BENEFICIOS":       " | ".join(beneficios) if isinstance(beneficios, list) else beneficios,
        "KEYWORDS":         ", ".join(keywords) if isinstance(keywords, list) else keywords,
        "MEDIDAS":          p.get("medidas") or p.get("contenido", ""),
        "CONFIANZA_AI":     f"{round(confianza * 100)}%" if confianza else "",
    }


class ValidarRequest(BaseModel):
    productos: list[dict]


@router.post("/", summary="Validar productos y generar filas Stibo")
def validar(request: ValidarRequest):
    if not request.productos:
        raise HTTPException(400, "La lista de productos está vacía")

    resultados = []
    for p in request.productos:
        validacion = _validar_producto(p)
        stibo_row  = _build_stibo_row(p)
        resultados.append({**p, "validacion": validacion, "stibo_row": stibo_row})

    resumen = {
        "total":        len(resultados),
        "aprobados":    sum(1 for r in resultados if r["validacion"]["estado"] == "aprobado"),
        "advertencias": sum(1 for r in resultados if r["validacion"]["estado"] == "advertencia"),
        "errores":      sum(1 for r in resultados if r["validacion"]["estado"] == "error"),
    }

    return {"ok": True, "resumen": resumen, "productos": resultados}


@router.post("/export-csv", summary="Descargar CSV listo para Stibo Step")
def export_csv(request: ValidarRequest):
    if not request.productos:
        raise HTTPException(400, "La lista de productos está vacía")

    output = io.StringIO()
    # BOM UTF-8 para que Excel en español lo abra correctamente
    output.write("\ufeff")

    writer = csv.DictWriter(
        output,
        fieldnames=STIBO_COLUMNS,
        extrasaction="ignore",
        lineterminator="\n",
    )
    writer.writeheader()

    for p in request.productos:
        writer.writerow(_build_stibo_row(p))

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": "attachment; filename=chedraui_stibo_export.csv"},
    )
