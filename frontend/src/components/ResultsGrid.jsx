function CharBar({ value, max }) {
  const pct   = Math.min(100, Math.round((value / max) * 100))
  const color = value > max ? 'var(--ch-red)' : value > max * 0.88 ? '#D4A000' : 'var(--ch-teal)'
  return (
    <div style={{ marginTop:6 }}>
      <div style={{ height:2, background:'var(--border)', borderRadius:1, overflow:'hidden' }}>
        <div style={{ height:'100%', borderRadius:1, background:color, width:`${pct}%`, transition:'width .5s' }} />
      </div>
      <p style={{ fontSize:10, color:'var(--tx-muted)', marginTop:3 }}>{value}/{max} chars</p>
    </div>
  )
}

function SrcTag({ src }) {
  const s = {
    ai:   { label:'AI',            bg:'rgba(0,149,156,.1)',   color:'var(--ch-teal-lt)',  border:'rgba(110,205,207,.2)' },
    list: { label:'Lista cerrada', bg:'rgba(0,62,113,.15)',   color:'#6B9FD4',            border:'rgba(0,62,113,.35)' },
    prv:  { label:'Proveedor',     bg:'rgba(255,183,0,.08)',  color:'#C49000',            border:'rgba(255,183,0,.2)' },
  }[src] || {}
  return (
    <span style={{
      fontSize:9, padding:'1px 6px', borderRadius:3, fontWeight:600,
      textTransform:'uppercase', letterSpacing:'.06em',
      background:s.bg, color:s.color, border:`1px solid ${s.border}`, marginLeft:4,
    }}>
      {s.label}
    </span>
  )
}

function Field({ label, src, children, span = 1 }) {
  return (
    <div style={{
      padding:'12px 14px',
      borderBottom:'1px solid var(--border)',
      borderRight:'1px solid var(--border)',
      gridColumn: span > 1 ? `span ${span}` : undefined,
    }}>
      <p style={{
        fontSize:9, textTransform:'uppercase', letterSpacing:'.1em',
        color:'var(--tx-muted)', marginBottom:6,
        display:'flex', alignItems:'center', flexWrap:'wrap', gap:4,
      }}>
        {label}
        {src && <SrcTag src={src} />}
      </p>
      {children}
    </div>
  )
}

function StatusBadge({ estado }) {
  const s = {
    aprobado:    { label:'Aprobado',    bg:'rgba(34,197,94,.1)',  color:'#22C55E', border:'rgba(34,197,94,.25)' },
    advertencia: { label:'Advertencia', bg:'rgba(212,160,0,.1)', color:'#D4A000', border:'rgba(212,160,0,.25)' },
    error:       { label:'Error',       bg:'rgba(255,24,58,.1)', color:'var(--ch-red)', border:'rgba(255,24,58,.25)' },
  }[estado] || {}
  return (
    <span style={{
      fontSize:10, padding:'2px 8px', borderRadius:4, fontWeight:600,
      textTransform:'uppercase', letterSpacing:'.06em',
      background:s.bg, color:s.color, border:`1px solid ${s.border}`,
    }}>
      {s.label}
    </span>
  )
}

function ProductCard({ product, maxNombre }) {
  const { upc, nombre_proveedor, marca_raw, validacion = {}, stibo_row = {} } = product
  const nombre = stibo_row.NOMBRE_ECOMMERCE || ''

  return (
    <div className="card animate-fade-up" style={{ overflow:'hidden' }}>

      {/* Header */}
      <div style={{
        display:'flex', alignItems:'center', gap:10,
        padding:'10px 14px',
        background:'var(--surf)', borderBottom:'1px solid var(--border)',
      }}>
        <code style={{
          fontSize:11, color:'#6B9FD4',
          background:'rgba(0,62,113,.15)', border:'1px solid rgba(0,62,113,.3)',
          padding:'2px 8px', borderRadius:4, fontFamily:'JetBrains Mono,monospace',
        }}>
          {upc}
        </code>
        <span style={{ fontSize:13, color:'var(--tx-muted)', flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
          {nombre_proveedor}
        </span>
        <StatusBadge estado={validacion.estado} />
      </div>

      {/* Fields */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr' }}>

        <Field label="Categoría web" src="list">
          <p style={{ fontSize:12, lineHeight:1.5, color:'var(--tx)' }}>
            {stibo_row.CATEGORIA_WEB || '—'}
          </p>
          <code style={{ fontSize:10, color:'#6B9FD4', marginTop:4, display:'block', fontFamily:'JetBrains Mono,monospace' }}>
            {stibo_row.ID_CATEGORIA}
          </code>
        </Field>

        <Field label="Marca validada" src="list">
          <p style={{ fontSize:13, color:'var(--tx)', fontWeight:500 }}>
            {stibo_row.MARCA || marca_raw || '—'}
          </p>
          <code style={{ fontSize:10, color:'var(--tx-muted)', fontFamily:'JetBrains Mono,monospace' }}>
            {stibo_row.MARCA_ID}
          </code>
        </Field>

        <Field label="Tipo de producto" src="list">
          <p style={{ fontSize:13, color:'var(--tx)' }}>{stibo_row.TIPO_PRODUCTO || '—'}</p>
        </Field>

        <Field label={`Nombre ecommerce (máx ${maxNombre} chars)`} src="ai" span={3}>
          <p style={{ fontSize:13, fontFamily:'JetBrains Mono,monospace', color:'var(--tx)', lineHeight:1.5 }}>
            {nombre || '—'}
          </p>
          {nombre && <CharBar value={nombre.length} max={maxNombre} />}
        </Field>

        <Field label="Descripción corta" src="ai" span={2}>
          <p style={{ fontSize:12, color:'var(--tx-muted)', lineHeight:1.6 }}>
            {stibo_row.DESC_CORTA || '—'}
          </p>
        </Field>

        <Field label="Keywords SEO" src="ai">
          <div style={{ display:'flex', flexWrap:'wrap', gap:4, marginTop:2 }}>
            {(stibo_row.KEYWORDS || '').split(',').filter(Boolean).map((kw, i) => (
              <span key={i} style={{
                fontSize:10, padding:'2px 7px', borderRadius:3,
                background:'rgba(0,62,113,.2)', color:'#6B9FD4',
                border:'1px solid rgba(0,62,113,.35)',
              }}>
                {kw.trim()}
              </span>
            ))}
          </div>
        </Field>

        <Field label="Descripción larga" src="ai" span={2}>
          <p style={{ fontSize:12, color:'var(--tx-muted)', lineHeight:1.6 }}>
            {stibo_row.DESC_LARGA || '—'}
          </p>
        </Field>

        <Field label="Beneficios" src="ai">
          <div style={{ display:'flex', flexDirection:'column', gap:5, marginTop:2 }}>
            {(stibo_row.BENEFICIOS || '').split('|').filter(Boolean).map((b, i) => (
              <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:8, fontSize:12, color:'var(--tx)' }}>
                <span style={{
                  width:14, height:14, borderRadius:3, flexShrink:0, marginTop:1,
                  background:'rgba(0,149,156,.15)', border:'1px solid var(--ch-teal)',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:8, color:'var(--ch-teal)', fontWeight:800,
                }}>OK</span>
                {b.trim()}
              </div>
            ))}
          </div>
        </Field>

      </div>

      {/* Warnings/errors */}
      {(validacion.errores?.length > 0 || validacion.advertencias?.length > 0) && (
        <div style={{
          padding:'8px 14px', borderTop:'1px solid var(--border)',
          display:'flex', flexWrap:'wrap', gap:6,
        }}>
          {validacion.errores?.map((e, i) => (
            <span key={i} style={{
              fontSize:11, padding:'2px 8px', borderRadius:4,
              background:'rgba(255,24,58,.1)', color:'var(--ch-red)',
              border:'1px solid rgba(255,24,58,.2)',
            }}>{e}</span>
          ))}
          {validacion.advertencias?.map((w, i) => (
            <span key={i} style={{
              fontSize:11, padding:'2px 8px', borderRadius:4,
              background:'rgba(212,160,0,.08)', color:'#D4A000',
              border:'1px solid rgba(212,160,0,.2)',
            }}>{w}</span>
          ))}
        </div>
      )}
    </div>
  )
}

export default function ResultsGrid({ products, config = {} }) {
  const maxNombre = config.max_nombre || 75

  if (!products.length) return (
    <div style={{
      display:'flex', flexDirection:'column', alignItems:'center',
      justifyContent:'center', height:'100%', gap:12, color:'var(--tx-dim)',
    }}>
      <div style={{
        width:48, height:48, borderRadius:10,
        background:'var(--card)', border:'1px solid var(--border)',
        display:'flex', alignItems:'center', justifyContent:'center',
      }}>
        <div style={{ width:20, height:20, borderRadius:3, border:'1px solid var(--border-lt)' }} />
      </div>
      <p style={{ fontSize:14, textAlign:'center', lineHeight:1.7 }}>
        Los resultados aparecerán aquí<br/>después de procesar
      </p>
    </div>
  )

  const aprobados    = products.filter(p => p.validacion?.estado === 'aprobado').length
  const advertencias = products.filter(p => p.validacion?.estado === 'advertencia').length
  const errores      = products.filter(p => p.validacion?.estado === 'error').length

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', overflow:'hidden' }}>

      {/* Summary */}
      <div style={{
        display:'flex', alignItems:'center', gap:16,
        padding:'10px 20px', borderBottom:'1px solid var(--border)',
        flexShrink:0, fontSize:13,
      }}>
        <span style={{ color:'var(--tx-muted)' }}>{products.length} productos procesados</span>
        <div style={{ display:'flex', gap:14, marginLeft:'auto', fontSize:12 }}>
          <span style={{ color:'#22C55E' }}>{aprobados} aprobados</span>
          {advertencias > 0 && <span style={{ color:'#D4A000' }}>{advertencias} advertencias</span>}
          {errores > 0      && <span style={{ color:'var(--ch-red)' }}>{errores} errores</span>}
        </div>
      </div>

      {/* Cards */}
      <div style={{ flex:1, overflowY:'auto', padding:'16px 20px', display:'flex', flexDirection:'column', gap:16 }}>
        {products.map((p, i) => (
          <ProductCard key={p.upc || i} product={p} maxNombre={maxNombre} />
        ))}
      </div>
    </div>
  )
}
