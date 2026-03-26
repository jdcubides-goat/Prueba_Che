import { useEffect, useState } from 'react'
import { getStats } from '../utils/api'

export default function StatsBanner() {
  const [stats, setStats] = useState(null)

  useEffect(() => { getStats().then(setStats).catch(() => {}) }, [])

  if (!stats) return (
    <div style={{
      height:44, background:'var(--surf)', borderBottom:'1px solid var(--border)',
      display:'flex', alignItems:'center', padding:'0 24px',
      fontSize:12, color:'var(--tx-muted)',
    }}>
      Cargando catálogo...
    </div>
  )

  const items = [
    { label:'Total SKUs',    value:stats.total,       color:'var(--tx)' },
    { label:'Completos',     value:stats.completos,   color:'#22C55E'   },
    { label:'Parciales',     value:stats.parciales,   color:'var(--ch-teal)' },
    { label:'Sin info',      value:stats.vacios,      color:'var(--ch-red)' },
    { label:'En Stibo',      value:stats.en_stibo,    color:'var(--ch-teal-lt)' },
    { label:'Pendientes',    value:stats.pendientes,  color:'#D4A000'   },
    { label:'% Completado',  value:`${stats.pct_completo}%`, color:'var(--ch-navy) '},
  ]

  return (
    <div style={{
      display:'flex', alignItems:'center',
      background:'var(--surf)', borderBottom:'1px solid var(--border)',
      overflowX:'auto', flexShrink:0,
    }}>
      {items.map((item, i) => (
        <div key={i} style={{
          display:'flex', flexDirection:'column', alignItems:'center',
          padding:'8px 20px', borderRight:'1px solid var(--border)',
          flexShrink:0, minWidth:90,
        }}>
          <span style={{
            fontFamily:'Syne,sans-serif', fontWeight:800,
            fontSize:22, lineHeight:1, color:item.color,
          }}>
            {item.value}
          </span>
          <span style={{
            fontSize:9, textTransform:'uppercase', letterSpacing:'.08em',
            color:'var(--tx-muted)', marginTop:4, whiteSpace:'nowrap',
          }}>
            {item.label}
          </span>
        </div>
      ))}

      {/* Chedraui brand strip */}
      <div style={{ marginLeft:'auto', padding:'0 20px', flexShrink:0 }}>
        <div style={{ display:'flex', gap:4 }}>
          {['#FF183A','#003E71','#00959C','#6ECDCF'].map(c => (
            <div key={c} style={{ width:8, height:8, borderRadius:2, background:c }} />
          ))}
        </div>
        <span style={{ fontSize:9, color:'var(--tx-dim)', display:'block', marginTop:4 }}>
          Chedraui · Seed Data
        </span>
      </div>
    </div>
  )
}
