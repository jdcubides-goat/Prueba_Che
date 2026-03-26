import { useState, useCallback } from 'react'
import { parseFile, parseText, classify, generateContent, validate } from '../utils/api'

export const STAGE_STATUS = {
  IDLE:    'idle',
  RUNNING: 'running',
  DONE:    'done',
  ERROR:   'error',
}

const INITIAL_STAGES = [
  { id:'parse',    name:'Ingesta y parseo',        meta:'Leyendo archivo del proveedor' },
  { id:'classify', name:'Clasificación AI',         meta:'Categoría · Marca · Tipo de producto' },
  { id:'content',  name:'Generación de contenido',  meta:'Nombre · Descripciones · Keywords · Beneficios' },
  { id:'validate', name:'Validación y export',      meta:'Coherencia · Formato Stibo Step' },
]

const makeStages = () => INITIAL_STAGES.map(s => ({
  ...s,
  status:    STAGE_STATUS.IDLE,
  logs:      [],
  startTime: null,
  endTime:   null,
}))

export default function usePipeline() {
  const [stages,   setStages]   = useState(makeStages())
  const [products, setProducts] = useState([])
  const [progress, setProgress] = useState(0)
  const [running,  setRunning]  = useState(false)
  const [done,     setDone]     = useState(false)
  const [error,    setError]    = useState(null)
  const [config,   setConfig]   = useState(null)

  const updateStage = useCallback((id, patch) =>
    setStages(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s))
  , [])

  const addLog = useCallback((id, type, msg) =>
    setStages(prev => prev.map(s =>
      s.id === id ? { ...s, logs: [...s.logs, { type, msg }] } : s
    ))
  , [])

  const reset = useCallback(() => {
    setStages(makeStages())
    setProducts([])
    setProgress(0)
    setRunning(false)
    setDone(false)
    setError(null)
    setConfig(null)
  }, [])

  const run = useCallback(async ({ file, text, config: cfg }) => {
    if (running) return
    reset()
    setRunning(true)
    setConfig(cfg)

    const startStage = (id) => updateStage(id, { status: STAGE_STATUS.RUNNING, startTime: Date.now() })
    const doneStage  = (id) => updateStage(id, { status: STAGE_STATUS.DONE, endTime: Date.now() })
    const errorStage = (id) => updateStage(id, { status: STAGE_STATUS.ERROR, endTime: Date.now() })

    try {
      // ── STAGE 1: PARSE ──────────────────────────────────────────
      startStage('parse')
      addLog('parse', 'info', 'Detectando formato de entrada...')

      let parseResult
      if (file) {
        addLog('parse', 'info', `Archivo: ${file.name} (${(file.size/1024).toFixed(1)} KB)`)
        parseResult = await parseFile(file)
      } else {
        addLog('parse', 'info', 'Procesando texto libre...')
        parseResult = await parseText(text)
      }

      const { productos: parsed, stats } = parseResult
      addLog('parse', 'data', `${stats.total} productos detectados`)
      if (stats.sin_info > 0)
        addLog('parse', 'warn', `${stats.sin_info} sin información del proveedor`)
      addLog('parse', 'ok', 'Estructura normalizada correctamente')
      doneStage('parse')
      setProgress(20)

      // ── STAGE 2: CLASSIFY ───────────────────────────────────────
      startStage('classify')
      addLog('classify', 'info', 'Cargando listas cerradas Chedraui...')
      addLog('classify', 'data', `52 categorías · 55 marcas · 75 tipos de producto`)
      addLog('classify', 'info', `Enviando ${parsed.length} SKUs a GPT-4o-mini...`)

      const classResult  = await classify(parsed)
      const classified   = classResult.productos
      const newBrands    = classified.filter(p => p.marca_validada === 'NUEVA_MARCA').length

      addLog('classify', 'ok', `Clasificación completada: ${classified.length} SKUs`)
      if (newBrands > 0)
        addLog('classify', 'warn', `${newBrands} marcas nuevas — requieren alta en Chedraui`)
      doneStage('classify')
      setProgress(48)

      // ── STAGE 3: CONTENT ────────────────────────────────────────
      startStage('content')
      addLog('content', 'info', `Generando nombres (máx ${cfg.max_nombre} chars)...`)
      addLog('content', 'info', `${cfg.num_beneficios} beneficios · ${cfg.num_keywords} keywords · tono: ${cfg.tono}`)

      const contentResult  = await generateContent(classified, cfg)
      const withContent    = contentResult.productos
      const over           = withContent.filter(p => (p.nombre_ecommerce||'').length > cfg.max_nombre).length

      addLog('content', 'ok', `Contenido generado para ${withContent.length} productos`)
      if (over > 0)
        addLog('content', 'warn', `${over} nombres truncados a ${cfg.max_nombre} chars`)
      doneStage('content')
      setProgress(76)

      // ── STAGE 4: VALIDATE ───────────────────────────────────────
      startStage('validate')
      addLog('validate', 'info', 'Verificando coherencia de atributos...')
      addLog('validate', 'info', 'Construyendo filas para Stibo Step...')

      const validateResult = await validate(withContent)
      const { resumen, productos: validated } = validateResult

      addLog('validate', 'ok',   `Aprobados: ${resumen.aprobados}`)
      if (resumen.advertencias > 0)
        addLog('validate', 'warn', `Con advertencias: ${resumen.advertencias}`)
      if (resumen.errores > 0)
        addLog('validate', 'err',  `Con errores: ${resumen.errores}`)
      addLog('validate', 'ok', 'CSV para Stibo Step listo')
      doneStage('validate')
      setProgress(100)

      setProducts(validated)
      setDone(true)

    } catch (err) {
      setError(err.message)
      setStages(prev => prev.map(s =>
        s.status === STAGE_STATUS.RUNNING ? { ...s, status: STAGE_STATUS.ERROR, endTime: Date.now() } : s
      ))
    } finally {
      setRunning(false)
    }
  }, [running, reset, updateStage, addLog])

  return { stages, products, progress, running, done, error, config, run, reset }
}
