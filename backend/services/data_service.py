"""
Servicio de datos.
Carga los JSON seed una sola vez al arrancar el servidor
y expone funciones de búsqueda para el resto del backend.
"""
import json
from pathlib import Path
from functools import lru_cache

DATA_DIR = Path(__file__).parent.parent / "data"


def _load(filename: str) -> list[dict]:
    with open(DATA_DIR / filename, encoding="utf-8") as f:
        return json.load(f)


# Carga al importar el módulo — una sola vez
products   = _load("products.json")
categories = _load("categories.json")
brands     = _load("brands.json")
types      = _load("types.json")


# ── Helpers de búsqueda ───────────────────────────────────────────────

def get_category_by_id(category_id: str) -> dict | None:
    return next((c for c in categories if c["id"] == category_id), None)


def get_brand_by_name(nombre: str) -> dict | None:
    nombre_lower = nombre.lower().strip()
    return next(
        (b for b in brands if b["nombre"].lower() == nombre_lower),
        None
    )


def get_type_by_id(type_id: str) -> dict | None:
    return next((t for t in types if t["id"] == type_id), None)


def get_products(
    estado: str | None = None,
    en_stibo: bool | None = None,
    limit: int | None = None,
) -> list[dict]:
    result = products.copy()
    if estado is not None:
        result = [p for p in result if p["estado_ficha"] == estado]
    if en_stibo is not None:
        result = [p for p in result if p["en_stibo"] == en_stibo]
    if limit is not None:
        result = result[:limit]
    return result


def get_catalog_summary() -> dict:
    """
    Devuelve las listas cerradas en formato compacto para inyectar
    en el prompt de OpenAI sin desperdiciar tokens.
    """
    return {
        "categorias": [
            {"id": c["id"], "path": f"{c['departamento']} > {c['clase']} > {c['subclase']}"}
            for c in categories
        ],
        "marcas": [
            {"id": b["id"], "nombre": b["nombre"]}
            for b in brands if b["activa"]
        ],
        "tipos": [
            {"id": t["id"], "nombre": t["nombre"], "cat": t["categoria_id"]}
            for t in types
        ],
    }


def get_stats() -> dict:
    total      = len(products)
    completos  = sum(1 for p in products if p["estado_ficha"] == "completo")
    parciales  = sum(1 for p in products if p["estado_ficha"] == "parcial")
    vacios     = sum(1 for p in products if p["estado_ficha"] == "vacio")
    en_stibo   = sum(1 for p in products if p["en_stibo"])

    return {
        "total":       total,
        "completos":   completos,
        "parciales":   parciales,
        "vacios":      vacios,
        "en_stibo":    en_stibo,
        "pendientes":  total - completos,
        "pct_completo": round((completos / total) * 100) if total else 0,
    }
