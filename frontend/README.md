# Chedraui Smart Onboarding Demo

Motor AI de alta de productos ecommerce · Chedraui → Stibo Step MDM

## Stack completo

| Capa | Tecnología | Deploy |
|------|-----------|--------|
| Frontend | React + Vite | Vercel (HTTPS gratis) |
| Backend  | Python + FastAPI | Railway (HTTPS gratis) |
| AI       | OpenAI GPT-4o | API key empresa |
| Datos    | JSON seed files | En el repo |

---

## Estructura del proyecto

```
chedraui-demo/
├── backend/
│   ├── main.py              ← Entrada FastAPI
│   ├── config.py            ← Lee el .env
│   ├── requirements.txt     ← Dependencias Python
│   ├── .env.example         ← Plantilla de variables
│   ├── models/
│   │   └── schemas.py       ← Modelos Pydantic
│   ├── services/
│   │   ├── openai_service.py ← Wrapper GPT-4o
│   │   └── data_service.py  ← Carga y consulta JSON
│   ├── routes/
│   │   ├── data.py          ← GET /api/data/*
│   │   ├── parse.py         ← POST /api/parse/*
│   │   ├── classify.py      ← POST /api/classify
│   │   ├── content.py       ← POST /api/content
│   │   └── validate.py      ← POST /api/validate/*
│   └── data/
│       ├── products.json    ← 68 SKUs simulados
│       ├── products.xlsx    ← Mismo dato en Excel
│       ├── products.xml     ← Mismo dato en XML
│       ├── categories.json  ← 52 categorías web
│       ├── brands.json      ← 55 marcas
│       └── types.json       ← 75 tipos de producto
└── frontend/                ← React (próximo paso)
```

---

## Setup local paso a paso

### Requisitos previos
- Python 3.11 o superior → python.org/downloads
- Node.js 20 LTS → nodejs.org (para el frontend)
- VS Code → code.visualstudio.com

### 1 · Crear el entorno virtual Python

```bash
# Desde la carpeta backend/
cd backend

# Crear el entorno virtual (solo la primera vez)
python -m venv venv

# Activarlo
# Windows:
venv\Scripts\activate
# Mac / Linux:
source venv/bin/activate

# El prompt cambia a (venv) — eso significa que está activo
```

### 2 · Instalar dependencias

```bash
# Con el venv activo:
pip install -r requirements.txt
```

### 3 · Configurar variables de entorno

```bash
# Copiar la plantilla
cp .env.example .env

# Abrir .env en VS Code y pegar tu API key de OpenAI
code .env
```

### 4 · Arrancar el servidor

```bash
# Con el venv activo:
uvicorn main:app --reload --port 8000
```

### 5 · Verificar que funciona

Abre en tu navegador:
- `http://localhost:8000/api/health` → debe responder `{"status":"ok"}`
- `http://localhost:8000/docs` → documentación Swagger interactiva ← **impresiona al cliente**
- `http://localhost:8000/api/data/stats` → KPIs del catálogo

---

## Endpoints disponibles

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET  | /api/health | Estado del servidor |
| GET  | /api/data/products | Lista productos (filtrable) |
| GET  | /api/data/categories | Categorías web |
| GET  | /api/data/brands | Marcas activas |
| GET  | /api/data/types | Tipos de producto |
| GET  | /api/data/stats | KPIs del catálogo |
| POST | /api/parse/file | Subir CSV / Excel / XML |
| POST | /api/parse/text | Pegar UPCs en texto |
| POST | /api/classify | Clasificar con GPT-4o |
| POST | /api/content | Generar contenido con GPT-4o |
| POST | /api/validate | Validar coherencia |
| POST | /api/validate/export-csv | Descargar CSV para Stibo |

---

## Deploy producción (HTTPS)

Ver guía completa en el README principal:
- **Backend → Railway**: conectar repo, seleccionar carpeta `backend/`, agregar variable `OPENAI_API_KEY`
- **Frontend → Vercel**: conectar repo, seleccionar carpeta `frontend/`, agregar variable `VITE_API_URL`

---

## Importante: el venv nunca va al repo

El archivo `.gitignore` ya excluye la carpeta `venv/`.
Cada desarrollador crea su propio entorno virtual con `python -m venv venv`.
