import { useState } from 'react'

const COLUMNS = [
  { key:'SKU',              label:'SKU',              src:'prv'  },
  { key:'UPC',              label:'UPC',              src:'prv'  },
  { key:'ID_CATEGORIA',     label:'ID Categoría',     src:'list' },
  { key:'CATEGORIA_WEB',    label:'Categoría Web',    src:'list' },
  { key:'TIPO_PRODUCTO_ID', label:'ID Tipo',          src:'list' },
  { key:'TIPO_PRODUCTO',    label:'Tipo Producto',    src:'list' },
  { key:'MARCA_ID',         label:'ID Marca',         src:'list' },
  { key:'MARCA',            label:'Marca',            src:'prv'  },
  { key:'NOMBRE_ECOMMERCE', label:'Nombre Ecommerce', src:'ai'   },
  { key:'DESC_CORTA',       label:'Desc. Corta',      src:'ai'   },
  { key:'DESC_LARGA',       label:'Desc. Larga',      src:'ai'   },
  { key:'BENEFICIOS',       label:'Beneficios',       src:'ai'   },
  { key:'KEYWORDS',         label:'Keywords',         src:'ai'   },
  { key:'MEDIDAS',          label:'Medidas',          src:'prv'  },
]

const SRC_COLOR = {
  ai:   '#6ECDCF',
  list: '#6B9FD4',
  prv:  '#C49000',
}

// Descarga CSV con punto y coma como separador para Excel en español
function downloadAsExcelCSV(products) {
  const cols = COLUMNS.map(c => c.key)
  const rows = [cols.join(';')]  // punto y coma = Excel español abre correctamente

  products.forEach(p => {
    const row = p.stibo_row || {}
    rows.push(
      cols.map(c => {
        const val = (row[c] || '').toString().replace(/"/g, '""')
        return `"${val}"`
      }).join(';')
    )
  })

  // BOM UTF-8 + punto y coma → Excel en Mac y Windows lo abre directo sin "texto a columnas"
  const content = '\uFEFF' + rows.join('\r\n')
  const blob = new Blob([content], { type:'text/csv;charset=utf-8' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url
  a.download = `chedraui_stibo_${new Date().toISOString().slice(0,10)}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export default function StiboExport({ products }) {
  const [downloading, setDownloading] = useState(false)

  const rows = products.map(p => p.stibo_row || {})

  const handleDownload = () => {
    setDownloading(true)
    try {
      downloadAsExcelCSV(products)
    } catch(e) {
      alert('Error al exportar: ' + e.message)
    } finally {
      setTimeout(() => setDownloading(false), 800)
    }
  }

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
        <div style={{
          width:20, height:4, background:'var(--border-lt)', borderRadius:2, marginBottom:3,
        }} />
      </div>
      <p style={{ fontSize:14, textAlign:'center', lineHeight:1.7 }}>
        El archivo para Stibo Step<br/>estará listo al terminar el proceso
      </p>
    </div>
  )

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', overflow:'hidden' }}>

      {/* Toolbar */}
      <div style={{
        display:'flex', alignItems:'center', justifyContent:'space-between',
        padding:'12px 20px', borderBottom:'1px solid var(--border)', flexShrink:0,
      }}>
        <div>
          <h3 style={{ fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:16, marginBottom:3 }}>
            Export → Stibo Step MDM
          </h3>
          <p style={{ fontSize:12, color:'var(--tx-muted)' }}>
            {products.length} filas · {COLUMNS.length} columnas · CSV con punto y coma (Excel directo)
          </p>
        </div>
        <button
          onClick={handleDownload}
          disabled={downloading}
          style={{
            background: downloading ? 'var(--border-lt)' : 'var(--ch-teal)',
            color: downloading ? 'var(--tx-muted)' : 'var(--bg)',
            border:'none', borderRadius:9, padding:'10px 20px',
            fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:13,
            cursor: downloading ? 'not-allowed' : 'pointer',
            display:'flex', alignItems:'center', gap:8, transition:'all .2s',
          }}
        >
          {downloading ? (
            <>
              <span style={{
                width:14, height:14, borderRadius:'50%',
                border:'2px solid rgba(0,0,0,.2)', borderTopColor:'var(--bg)',
                display:'inline-block', animation:'spin-slow 1s linear infinite',
              }} />
              Generando...
            </>
          ) : 'Descargar CSV → Stibo'}
        </button>
      </div>

      {/* Legend */}
      <div style={{
        display:'flex', gap:20, padding:'8px 20px',
        borderBottom:'1px solid var(--border)', flexShrink:0,
      }}>
        {Object.entries({ ai:'Generado por AI', list:'Lista cerrada Chedraui', prv:'Datos del proveedor' }).map(([src, label]) => (
          <div key={src} style={{ display:'flex', alignItems:'center', gap:6, fontSize:11, color:SRC_COLOR[src] }}>
            <span style={{ width:8, height:8, borderRadius:2, background:SRC_COLOR[src] }} />
            {label}
          </div>
        ))}
        <span style={{ marginLeft:'auto', fontSize:11, color:'var(--tx-dim)' }}>
          Separador: punto y coma · BOM UTF-8 · Excel abre directo
        </span>
      </div>

      {/* Table */}
      <div style={{ flex:1, overflow:'auto' }}>
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12, minWidth:1300 }}>
          <thead>
            <tr>
              {COLUMNS.map(col => (
                <th key={col.key} style={{
                  padding:'8px 12px', textAlign:'left',
                  fontSize:9, letterSpacing:'.08em', textTransform:'uppercase',
                  color: col.key==='SKU'||col.key==='ID_CATEGORIA' ? 'var(--ch-red)' : SRC_COLOR[col.src],
                  background:'var(--surf)', borderBottom:'1px solid var(--border)',
                  borderRight:'1px solid var(--border)', whiteSpace:'nowrap',
                  position:'sticky', top:0, zIndex:1,
                }}>
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri} style={{ borderBottom:'1px solid var(--border)' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--card)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                {COLUMNS.map(col => {
                  const val = row[col.key] || ''
                  return (
                    <td key={col.key} title={val} style={{
                      padding:'9px 12px', borderRight:'1px solid var(--border)',
                      fontFamily:'JetBrains Mono,monospace', fontSize:11,
                      color: SRC_COLOR[col.src],
                      verticalAlign:'top', whiteSpace:'nowrap',
                      maxWidth:200, overflow:'hidden', textOverflow:'ellipsis',
                    }}>
                      {val || <span style={{ color:'var(--tx-dim)' }}>—</span>}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
