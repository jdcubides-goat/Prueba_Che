"""
Endpoints de datos seed.
Incluye descarga de muestra en CSV, JSON y Excel.
"""
import csv
import io
import json
from fastapi import APIRouter, Query
from fastapi.responses import StreamingResponse, JSONResponse
from services import data_service as ds

router = APIRouter(prefix="/api/data", tags=["Datos semilla"])
# ── Productos ─────────────────────────────────────────────────────────

@router.get("/products", summary="Lista de productos")
def get_products(
    estado:   str  | None = Query(None, description="completo | parcial | vacio"),
    en_stibo: bool | None = Query(None),
    limit:    int  | None = Query(None, ge=1, le=500),
):
    productos = ds.get_products(estado=estado, en_stibo=en_stibo, limit=limit)
    return {"total": len(productos), "productos": productos}


@router.get("/products/sample", summary="Descargar muestra de productos de prueba")
def get_sample(
    n:       int = Query(10, ge=1, le=68, description="Número de productos"),
    formato: str = Query("csv", description="csv | json | excel"),
):
    """
    Descarga los primeros N productos en el formato solicitado.
    - csv  → abre directo en Excel (punto y coma, BOM UTF-8)
    - json → útil para probar la API directamente
    """
    muestra = ds.products[:n]

    # ── JSON ──────────────────────────────────────────────────────────
    if formato == "json":
        return JSONResponse(
            content={"total": len(muestra), "productos": muestra},
            headers={"Content-Disposition": f"attachment; filename=muestra_{n}_productos.json"}
        )

    # ── CSV ───────────────────────────────────────────────────────────
    if formato in ("csv", "excel"):
        campos = ["upc", "sku", "nombre_proveedor", "marca_raw", "contenido", "desc_raw", "estado_ficha", "en_stibo"]
        output = io.StringIO()
        output.write("\uFEFF")  # BOM UTF-8 para Excel

        writer = csv.DictWriter(
            output,
            fieldnames=campos,
            extrasaction="ignore",
            delimiter=";",          # punto y coma → Excel en español abre directo
            lineterminator="\r\n",
        )
        writer.writeheader()
        for p in muestra:
            row = {k: (str(v) if v is not None else "") for k, v in p.items() if k in campos}
            writer.writerow(row)

        output.seek(0)
        filename = f"chedraui_muestra_{n}_productos.csv"
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv; charset=utf-8",
            headers={"Content-Disposition": f"attachment; filename={filename}"},
        )

    return {"error": f"Formato no soportado: {formato}. Usa: csv | json"}


# ── Categorías ────────────────────────────────────────────────────────

@router.get("/categories", summary="Categorías web Chedraui")
def get_categories():
    return {"total": len(ds.categories), "categorias": ds.categories}


@router.get("/brands", summary="Marcas del catálogo")
def get_brands(activa: bool | None = Query(None)):
    marcas = ds.brands
    if activa is not None:
        marcas = [b for b in marcas if b["activa"] == activa]
    return {"total": len(marcas), "marcas": marcas}


@router.get("/types", summary="Tipos de producto")
def get_types(categoria_id: str | None = Query(None)):
    tipos = ds.types
    if categoria_id:
        tipos = [t for t in tipos if t["categoria_id"] == categoria_id]
    return {"total": len(tipos), "tipos": tipos}


# ── Stats ─────────────────────────────────────────────────────────────

@router.get("/stats", summary="KPIs del catálogo")
def get_stats():
    return ds.get_stats()