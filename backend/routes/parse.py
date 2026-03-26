"""
Endpoint de parseo de archivos.
Acepta CSV, Excel (.xlsx/.xls) y XML del proveedor
y devuelve un array normalizado de productos.
"""
import io
import re
import xml.etree.ElementTree as ET
from fastapi import APIRouter, UploadFile, File, HTTPException, Body
import pandas as pd

router = APIRouter(prefix="/api/parse", tags=["Parseo de archivos"])

# Mapeo de nombres de columna del proveedor → nombres internos
FIELD_ALIASES: dict[str, list[str]] = {
    "upc":              ["upc", "codigo_upc", "barcode", "ean", "gtin", "codigo"],
    "nombre_proveedor": ["nombre_proveedor", "nombre", "product", "name", "descripcion"],
    "marca_raw":        ["marca_raw", "marca", "brand", "fabricante"],
    "contenido":        ["contenido", "contenido_neto", "peso", "peso_neto", "volume"],
    "desc_raw":         ["desc_raw", "descripcion", "description", "desc", "detalle"],
}


def _normalize_row(row: dict) -> dict:
    """Mapea las columnas del proveedor a los campos internos."""
    normalized = {field: "" for field in FIELD_ALIASES}
    for target, aliases in FIELD_ALIASES.items():
        for alias in aliases:
            match = next(
                (k for k in row if k.lower().strip() == alias),
                None
            )
            if match:
                normalized[target] = str(row[match] or "").strip()
                break
    return normalized


def _filter_empty(rows: list[dict]) -> list[dict]:
    return [r for r in rows if r.get("upc") or r.get("nombre_proveedor")]


def _parse_csv(content: bytes) -> list[dict]:
    try:
        df = pd.read_csv(io.BytesIO(content), dtype=str).fillna("")
        return _filter_empty([_normalize_row(r) for r in df.to_dict("records")])
    except Exception as e:
        raise HTTPException(400, f"Error al leer CSV: {e}")


def _parse_excel(content: bytes) -> list[dict]:
    try:
        df = pd.read_excel(io.BytesIO(content), dtype=str).fillna("")
        return _filter_empty([_normalize_row(r) for r in df.to_dict("records")])
    except Exception as e:
        raise HTTPException(400, f"Error al leer Excel: {e}")


def _parse_xml(content: bytes) -> list[dict]:
    try:
        root = ET.fromstring(content.decode("utf-8"))
        rows = []
        for item in root.findall("producto"):
            row = {child.tag: (child.text or "").strip() for child in item}
            rows.append(_normalize_row(row))
        return _filter_empty(rows)
    except ET.ParseError as e:
        raise HTTPException(400, f"Error al leer XML: {e}")


def _build_stats(productos: list[dict]) -> dict:
    return {
        "total":      len(productos),
        "con_desc":   sum(1 for p in productos if len(p.get("desc_raw", "")) > 3),
        "con_marca":  sum(1 for p in productos if len(p.get("marca_raw", "")) > 1),
        "sin_info":   sum(1 for p in productos if not p.get("desc_raw") and not p.get("marca_raw")),
    }


@router.post("/file", summary="Subir archivo CSV, Excel o XML")
async def parse_file(file: UploadFile = File(...)):
    ext = file.filename.split(".")[-1].lower() if file.filename else ""
    content = await file.read()

    if ext == "csv" or file.content_type == "text/csv":
        productos = _parse_csv(content)
        formato = "csv"
    elif ext in ("xlsx", "xls"):
        productos = _parse_excel(content)
        formato = "excel"
    elif ext == "xml":
        productos = _parse_xml(content)
        formato = "xml"
    else:
        raise HTTPException(400, f"Formato no soportado: .{ext}. Acepta: csv, xlsx, xls, xml")

    return {
        "ok": True,
        "formato": formato,
        "stats": _build_stats(productos),
        "productos": productos,
    }


@router.post("/text", summary="Pegar UPCs o nombres en texto libre")
def parse_text(body: dict = Body(...)):
    texto: str = body.get("texto", "")
    if not texto.strip():
        raise HTTPException(400, "El campo 'texto' es requerido y no puede estar vacío")

    lines = [l.strip() for l in texto.splitlines() if l.strip()]
    productos = []
    for i, line in enumerate(lines):
        is_upc = bool(re.fullmatch(r"\d{8,14}", line))
        productos.append({
            "upc":              line if is_upc else f"GEN-{i+1:05d}",
            "nombre_proveedor": f"Producto {line}" if is_upc else line,
            "marca_raw":        "",
            "contenido":        "",
            "desc_raw":         "",
        })

    return {
        "ok": True,
        "formato": "texto",
        "stats": {"total": len(productos)},
        "productos": productos,
    }
