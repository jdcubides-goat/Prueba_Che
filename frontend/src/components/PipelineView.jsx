import { useState, useEffect, useRef } from 'react'
import { STAGE_STATUS } from '../hooks/usePipeline'

const LOG_CLASS = { ok:'log-ok', info:'log-info', warn:'log-warn', data:'log-data', err:'log-err' }
const LOG_PRE   = { ok:'OK  ', info:'    ', warn:'WARN', data:'    ', err:'ERR ' }

function Timer({ running, done, startTime }) {
  const [elapsed, setElapsed] = useState(0)
  const ref = useRef()

  useEffect(() => {
    if (running && startTime) {
      ref.current = setInterval(() => {
        setElapsed(Date.now() - startTime)
      }, 100)
    } else {
      clearInterval(ref.current)
    }
    return () => clearInterval(ref.current)
  }, [running, startTime])

  if (!startTime) return null

  const ms = done ? elapsed : elapsed
  const display = ms >= 1000 ? `${(ms/1000).toFixed(1)}s` : `${ms}ms`

  return (
    <span style={{
      fontFamily:'JetBrains Mono,monospace', fontSize:11,
      color: done ? 'var(--ch-teal)' : 'var(--tx-muted)',
      marginLeft:8,
    }}>
      {display}
    </span>
  )
}

function Stage({ stage, open, onToggle }) {
  const { status, name, meta, logs, startTime, endTime } = stage

  const borderColor = {
    [STAGE_STATUS.IDLE]:    'var(--border)',
    [STAGE_STATUS.RUNNING]: 'var(--ch-teal)',
    [STAGE_STATUS.DONE]:    'rgba(0,149,156,.4)',
    [STAGE_STATUS.ERROR]:   'var(--ch-red)',
  }[status]

  const chipBg = {
    [STAGE_STATUS.IDLE]:    'var(--surf)',
    [STAGE_STATUS.RUNNING]: 'rgba(0,149,156,.1)',
    [STAGE_STATUS.DONE]:    'rgba(0,149,156,.1)',
    [STAGE_STATUS.ERROR]:   'rgba(255,24,58,.1)',
  }[status]

  const chipColor = {
    [STAGE_STATUS.IDLE]:    'var(--tx-muted)',
    [STAGE_STATUS.RUNNING]: 'var(--ch-teal)',
    [STAGE_STATUS.DONE]:    'var(--ch-teal)',
    [STAGE_STATUS.ERROR]:   'var(--ch-red)',
  }[status]

  const chipText = {
    [STAGE_STATUS.IDLE]:    'En espera',
    [STAGE_STATUS.RUNNING]: 'Procesando',
    [STAGE_STATUS.DONE]:    'Completado',
    [STAGE_STATUS.ERROR]:   'Error',
  }[status]

  const elapsed = startTime && endTime ? endTime - startTime : null

  return (
    <div style={{
      background:'var(--card)', border:`1px solid ${borderColor}`,
      borderRadius:10, overflow:'hidden', transition:'border-color .3s',
    }}>
      <div
        style={{ padding:'12px 16px', display:'flex', alignItems:'center', gap:12, cursor:'pointer' }}
        onClick={onToggle}
      >
        {/* Stage indicator block */}
        <div style={{
          width:32, height:32, borderRadius:6, flexShrink:0,
          background:'var(--surf)', border:`1px solid ${borderColor}`,
          display:'flex', alignItems:'center', justifyContent:'center',
        }}>
          {status === STAGE_STATUS.RUNNING ? (
            <span style={{
              width:14, height:14, borderRadius:'50%',
              border:'2px solid rgba(0,149,156,.2)',
              borderTopColor:'var(--ch-teal)',
              display:'inline-block',
              animation:'spin-slow 1s linear infinite',
            }} />
          ) : (
            <span style={{
              fontFamily:'Syne,sans-serif', fontWeight:800,
              fontSize:11, color: status===STAGE_STATUS.DONE ? 'var(--ch-teal)' : 'var(--tx-muted)',
            }}>
              {status===STAGE_STATUS.DONE ? 'OK' : status===STAGE_STATUS.ERROR ? 'ERR' : '—'}
            </span>
          )}
        </div>

        <div style={{ flex:1 }}>
          <p style={{ fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:13, marginBottom:2 }}>
            {name}
          </p>
          <p style={{ fontSize:11, color:'var(--tx-muted)' }}>{meta}</p>
        </div>

        {/* Timing */}
        {elapsed && (
          <span style={{
            fontFamily:'JetBrains Mono,monospace', fontSize:11,
            color:'var(--ch-teal)', marginRight:4,
          }}>
            {elapsed >= 1000 ? `${(elapsed/1000).toFixed(1)}s` : `${elapsed}ms`}
          </span>
        )}
        {status === STAGE_STATUS.RUNNING && (
          <Timer running={true} startTime={startTime} />
        )}

        {/* Status chip */}
        <span style={{
          fontSize:10, padding:'3px 10px', borderRadius:20,
          background:chipBg, color:chipColor,
          border:`1px solid ${borderColor}`, fontWeight:600,
          letterSpacing:'.05em', textTransform:'uppercase',
        }}>
          {chipText}
        </span>

        <span style={{ fontSize:10, color:'var(--tx-dim)' }}>{open ? '▲' : '▼'}</span>
      </div>

      {open && logs.length > 0 && (
        <div style={{ padding:'0 16px 14px' }}>
          <div style={{
            background:'var(--bg)', borderRadius:8,
            padding:'10px 14px', fontFamily:'JetBrains Mono,monospace',
            fontSize:11, lineHeight:1.9, maxHeight:200, overflowY:'auto',
          }}>
            {logs.map((l, i) => (
              <div key={i} className={LOG_CLASS[l.type] || 'log-data'}>
                <span style={{ opacity:.4, marginRight:8 }}>{LOG_PRE[l.type]}</span>
                {l.msg}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function PipelineView({ stages, progress, running, done, error }) {
  const [openStages, setOpenStages] = useState({})
  const toggle = id => setOpenStages(p => ({ ...p, [id]: !p[id] }))
  const hasActivity = stages.some(s => s.status !== STAGE_STATUS.IDLE)

  // Auto-open running/error stages
  useEffect(() => {
    stages.forEach(s => {
      if (s.status === STAGE_STATUS.RUNNING || s.status === STAGE_STATUS.ERROR) {
        setOpenStages(p => ({ ...p, [s.id]: true }))
      }
    })
  }, [stages])

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', overflow:'hidden' }}>

      {/* Progress bar */}
      {hasActivity && (
        <div style={{ padding:'12px 20px 8px', flexShrink:0 }}>
          <div style={{
            height:3, background:'var(--border)', borderRadius:2, overflow:'hidden',
          }}>
            <div style={{
              height:'100%', borderRadius:2,
              background:'linear-gradient(90deg, var(--ch-red), var(--ch-teal))',
              width:`${progress}%`, transition:'width .5s ease',
            }} />
          </div>
          <div style={{
            display:'flex', justifyContent:'space-between',
            marginTop:6, fontSize:11, color:'var(--tx-muted)',
          }}>
            <span>{running ? 'Ejecutando pipeline...' : done ? 'Pipeline completado' : ''}</span>
            <span style={{ fontFamily:'JetBrains Mono,monospace' }}>{progress}%</span>
          </div>
        </div>
      )}

      {/* Content */}
      <div style={{ flex:1, overflowY:'auto', padding:'12px 20px 20px' }}>

        {/* Empty state */}
        {!hasActivity && (
          <div style={{
            display:'flex', flexDirection:'column', alignItems:'center',
            justifyContent:'center', height:'100%', gap:16,
            color:'var(--tx-dim)', textAlign:'center',
          }}>
            <div style={{
              width:56, height:56, borderRadius:12,
              background:'var(--card)', border:'1px solid var(--border)',
              display:'flex', alignItems:'center', justifyContent:'center',
            }}>
              <div style={{
                width:24, height:24, borderRadius:4,
                border:'2px solid var(--border-lt)',
              }} />
            </div>
            <p style={{ fontSize:14, lineHeight:1.7 }}>
              Carga productos y presiona<br/>
              <span style={{ color:'var(--tx)' }}>Procesar con AI</span><br/>
              para ver el pipeline en acción
            </p>
          </div>
        )}

        {/* Stages */}
        {hasActivity && (
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {stages.map(s => (
              <Stage
                key={s.id}
                stage={s}
                open={openStages[s.id] ?? false}
                onToggle={() => toggle(s.id)}
              />
            ))}
          </div>
        )}

        {/* Error banner */}
        {error && (
          <div style={{
            marginTop:16, padding:16, borderRadius:10,
            background:'rgba(255,24,58,.08)', border:'1px solid rgba(255,24,58,.2)',
          }}>
            <p style={{ color:'var(--ch-red)', fontWeight:600, marginBottom:6, fontSize:13 }}>
              Error en el pipeline
            </p>
            <p style={{
              fontFamily:'JetBrains Mono,monospace', fontSize:11,
              color:'rgba(255,100,120,.7)',
            }}>
              {error}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
