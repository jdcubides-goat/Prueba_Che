"""
Modelos de datos del proyecto.
Pydantic valida automáticamente que los datos sean del tipo correcto.
Si un campo no cumple → FastAPI devuelve un error 422 claro y descriptivo.
"""
from pydantic import BaseModel, Field
from typing import Optional


# ── Producto base (lo que llega del proveedor) ────────────────────────

class ProductoEntrada(BaseModel):
    upc: str = Field(..., description="Código de barras UPC/EAN")
    nombre_proveedor: str = Field(..., description="Nombre tal como lo mandó el proveedor")
    marca_raw: str = Field(default="", description="Marca sin validar")
    contenido: str = Field(default="", description="Contenido neto: 1 L, 500 g, etc.")
    desc_raw: str = Field(default="", description="Descripción que mandó el proveedor")


# ── Resultado de clasificación AI ────────────────────────────────────

class ClasificacionAI(BaseModel):
    categoria_id: str = Field(default="", description="ID de la categoría web Chedraui")
    categoria_path: str = Field(default="", description="Departamento > Clase > Subclase")
    marca_id: str = Field(default="", description="ID de la marca en lista cerrada")
    marca_validada: str = Field(default="", description="Nombre normalizado de la marca")
    tipo_id: str = Field(default="", description="ID del tipo de producto")
    tipo_nombre: str = Field(default="", description="Nombre del tipo de producto")
    confianza: float = Field(default=0.0, ge=0.0, le=1.0, description="Nivel de confianza 0-1")


# ── Resultado de generación de contenido AI ───────────────────────────

class ContenidoAI(BaseModel):
    nombre_ecommerce: str = Field(
        default="",
        max_length=75,
        description="Nombre final para ecommerce, máximo 75 chars"
    )
    desc_corta: str = Field(default="", description="80-120 chars")
    desc_larga: str = Field(default="", description="180-250 chars")
    beneficios: list[str] = Field(default_factory=list, description="Lista de 3 beneficios")
    keywords: list[str] = Field(default_factory=list, description="5-7 palabras clave SEO")
    medidas: str = Field(default="", description="Unidad de medida del contenido")


# ── Validación ────────────────────────────────────────────────────────

class ResultadoValidacion(BaseModel):
    estado: str = Field(description="aprobado | advertencia | error")
    errores: list[str] = Field(default_factory=list)
    advertencias: list[str] = Field(default_factory=list)


# ── Fila Stibo Step (output final) ────────────────────────────────────

class FilaStibo(BaseModel):
    SKU: str = ""
    UPC: str = ""
    ID_CATEGORIA: str = ""
    CATEGORIA_WEB: str = ""
    TIPO_PRODUCTO_ID: str = ""
    TIPO_PRODUCTO: str = ""
    MARCA_ID: str = ""
    MARCA: str = ""
    NOMBRE_ECOMMERCE: str = ""
    DESC_CORTA: str = ""
    DESC_LARGA: str = ""
    BENEFICIOS: str = ""
    KEYWORDS: str = ""
    MEDIDAS: str = ""
    CONFIANZA_AI: str = ""


# ── Producto completo (une todos los estados del pipeline) ────────────

class ProductoCompleto(ProductoEntrada):
    sku: str = Field(default="", description="SKU interno")
    estado_ficha: str = Field(default="vacio", description="completo | parcial | vacio")
    en_stibo: bool = Field(default=False)

    # Se llenan durante el pipeline
    clasificacion: Optional[ClasificacionAI] = None
    contenido_ai: Optional[ContenidoAI] = None
    validacion: Optional[ResultadoValidacion] = None
    stibo_row: Optional[FilaStibo] = None


# ── Requests / Responses de los endpoints ────────────────────────────

class ClasificarRequest(BaseModel):
    productos: list[ProductoEntrada]


class GenerarContenidoRequest(BaseModel):
    productos: list[dict]  # productos ya con clasificación


class ValidarRequest(BaseModel):
    productos: list[dict]


class ResumenStats(BaseModel):
    total: int
    completos: int
    parciales: int
    vacios: int
    en_stibo: int
    pendientes: int
    pct_completo: int
