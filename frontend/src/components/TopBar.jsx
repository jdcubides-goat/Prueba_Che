export default function TopBar({ status, companyLogo, companyName = 'PMDM Consulting' }) {
  const dot = {
    idle:    { color: 'var(--tx-dim)',  pulse: false },
    running: { color: 'var(--ch-teal)', pulse: true  },
    done:    { color: '#22C55E',        pulse: false },
    error:   { color: 'var(--ch-red)',  pulse: false },
  }[status] || { color: 'var(--tx-dim)', pulse: false }

  const statusLabel = {
    idle: 'Listo', running: 'Procesando...', done: 'Completado', error: 'Error',
  }[status] || 'Listo'

  return (
    <header style={{
      position:'fixed',top:0,left:0,right:0,zIndex:50,
      display:'flex',alignItems:'center',
      background:'var(--surf)',borderBottom:'1px solid var(--border)',
      height:52,padding:'0 24px',gap:0,
    }}>

      {/* Company identity */}
      <div style={{ display:'flex', alignItems:'center', gap:10, marginRight:20 }}>
        {companyLogo ? (
          <img src={companyLogo} alt={companyName} style={{ height:28, objectFit:'contain' }} />
        ) : (
          <div style={{
            width:34, height:34, borderRadius:7,
            background:'var(--ch-navy)', border:'2px solid var(--ch-teal)',
            display:'flex', alignItems:'center', justifyContent:'center',
            fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:13,
            color:'var(--ch-teal-lt)',
          }}>
            {companyName.slice(0,2).toUpperCase()}
          </div>
        )}
        <span style={{
          fontFamily:'Syne,sans-serif', fontWeight:800,
          fontSize:13, letterSpacing:'.06em', textTransform:'uppercase',
          color:'var(--ch-gray)',
        }}>
          {companyName}
        </span>
      </div>

      {/* Divider */}
      <div style={{ width:1, height:22, background:'var(--border)', marginRight:20 }} />

      {/* Red accent bar + product name */}
      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
        <div style={{ width:3, height:20, borderRadius:2, background:'var(--ch-red)' }} />
        <span style={{
          fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:14,
          letterSpacing:'.05em', textTransform:'uppercase', color:'var(--ch-red)',
        }}>
          Smart Onboarding
        </span>
        <span style={{ fontSize:12, color:'var(--tx-muted)' }}>
          · Chedraui ecommerce → Stibo Step MDM
        </span>
      </div>

      {/* Status */}
      <div style={{
        marginLeft:'auto', display:'flex', alignItems:'center', gap:8,
        background:'var(--card)', border:'1px solid var(--border)',
        borderRadius:20, padding:'5px 14px', fontSize:12, color:'var(--tx-muted)',
      }}>
        <span style={{
          width:7, height:7, borderRadius:'50%', background:dot.color, flexShrink:0,
          animation: dot.pulse ? 'pulse-dot 1s ease-in-out infinite' : 'none',
        }} />
        {statusLabel}
      </div>
    </header>
  )
}
