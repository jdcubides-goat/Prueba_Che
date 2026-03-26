import { useState } from 'react'

const DEFAULT_CONFIG = {
  num_beneficios:    3,
  max_nombre:        75,
  max_desc_corta:    120,
  max_desc_larga:    250,
  num_keywords:      6,
  tono:              'confianza',   // confianza | formal | tecnico
  idioma:            'es-MX',
}

export default function PipelineConfig({ config, onChange }) {
  const [open, setOpen] = useState(false)

  const set = (key, val) => onChange({ ...config, [key]: val })

  const Row = ({ label, children }) => (
    <div style={{
      display:'flex', alignItems:'center', justifyContent:'space-between',
      padding:'10px 0', borderBottom:'1px solid var(--border)',
    }}>
      <span style={{ fontSize:13, color:'var(--tx-muted)' }}>{label}</span>
      {children}
    </div>
  )

  const NumInput = ({ val, min, max, step=1, onChange: onCh }) => (
    <div style={{ display:'flex', alignItems:'center', gap:6 }}>
      <button
        onClick={() => onCh(Math.max(min, val - step))}
        style={{
          width:26, height:26, borderRadius:6,
          background:'var(--surf)', border:'1px solid var(--border-lt)',
          color:'var(--tx)', cursor:'pointer', fontSize:14, lineHeight:1,
        }}
      >−</button>
      <span style={{
        width:36, textAlign:'center',
        fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:15,
        color:'var(--ch-teal)',
      }}>
        {val}
      </span>
      <button
        onClick={() => onCh(Math.min(max, val + step))}
        style={{
          width:26, height:26, borderRadius:6,
          background:'var(--surf)', border:'1px solid var(--border-lt)',
          color:'var(--tx)', cursor:'pointer', fontSize:14, lineHeight:1,
        }}
      >+</button>
    </div>
  )

  const Select = ({ val, options, onCh }) => (
    <select
      value={val}
      onChange={e => onCh(e.target.value)}
      style={{
        background:'var(--surf)', border:'1px solid var(--border-lt)',
        color:'var(--tx)', borderRadius:6, padding:'4px 10px', fontSize:12,
        cursor:'pointer', outline:'none',
      }}
    >
      {options.map(o => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  )

  return (
    <div>
      {/* Toggle button */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between',
          padding:'8px 12px', marginBottom:open?0:8,
          background:'var(--surf)', border:'1px solid var(--border-lt)',
          borderRadius: open ? '8px 8px 0 0' : 8,
          color:'var(--tx-muted)', fontSize:12, cursor:'pointer',
          transition:'border-radius .2s',
        }}
      >
        <span style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{
            width:16, height:16, borderRadius:3,
            background:'var(--ch-navy)', border:'1px solid var(--ch-teal)',
            display:'inline-flex', alignItems:'center', justifyContent:'center',
            fontSize:9, color:'var(--ch-teal-lt)', fontWeight:800,
          }}>CF</span>
          Configurar pipeline
        </span>
        <span style={{ fontSize:10, color:'var(--tx-dim)' }}>{open ? '▲' : '▼'}</span>
      </button>

      {/* Panel */}
      {open && (
        <div style={{
          background:'var(--card)', border:'1px solid var(--border-lt)',
          borderTop:'none', borderRadius:'0 0 8px 8px',
          padding:'4px 14px 14px', marginBottom:8,
        }}>
          <Row label="Número de beneficios">
            <NumInput val={config.num_beneficios} min={1} max={7}
              onChange={v => set('num_beneficios', v)} />
          </Row>
          <Row label="Nombre ecommerce (chars)">
            <NumInput val={config.max_nombre} min={40} max={100} step={5}
              onChange={v => set('max_nombre', v)} />
          </Row>
          <Row label="Descripción corta (chars)">
            <NumInput val={config.max_desc_corta} min={60} max={200} step={10}
              onChange={v => set('max_desc_corta', v)} />
          </Row>
          <Row label="Descripción larga (chars)">
            <NumInput val={config.max_desc_larga} min={100} max={500} step={25}
              onChange={v => set('max_desc_larga', v)} />
          </Row>
          <Row label="Número de keywords">
            <NumInput val={config.num_keywords} min={3} max={12}
              onChange={v => set('num_keywords', v)} />
          </Row>
          <Row label="Tono del contenido">
            <Select val={config.tono}
              options={[
                { value:'confianza', label:'Confianza (tuteo)' },
                { value:'formal',    label:'Formal (usted)' },
                { value:'tecnico',   label:'Técnico / descriptivo' },
              ]}
              onCh={v => set('tono', v)} />
          </Row>
          <Row label="Idioma">
            <Select val={config.idioma}
              options={[
                { value:'es-MX', label:'Español México' },
                { value:'es-ES', label:'Español España' },
              ]}
              onCh={v => set('idioma', v)} />
          </Row>

          <button
            onClick={() => onChange({ ...DEFAULT_CONFIG })}
            style={{
              marginTop:10, fontSize:11, color:'var(--tx-muted)',
              background:'none', border:'none', cursor:'pointer',
              textDecoration:'underline',
            }}
          >
            Restablecer valores por defecto
          </button>
        </div>
      )}
    </div>
  )
}

export { DEFAULT_CONFIG }
