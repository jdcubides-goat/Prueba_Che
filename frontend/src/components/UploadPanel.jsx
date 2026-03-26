import { useState, useRef } from 'react'
import PipelineConfig, { DEFAULT_CONFIG } from './PipelineConfig'

export default function UploadPanel({ onStart, running, onReset, done }) {
  const [fmt,      setFmt]      = useState('file')
  const [file,     setFile]     = useState(null)
  const [text,     setText]     = useState('')
  const [dragging, setDragging] = useState(false)
  const [config,   setConfig]   = useState({ ...DEFAULT_CONFIG })
  const fileRef = useRef()

  const canRun = fmt === 'file' ? !!file : text.trim().length > 0

  const handleFile = (f) => {
    if (!f) return
    const ext = f.name.split('.').pop().toLowerCase()
    if (!['csv','xlsx','xls','xml'].includes(ext)) {
      alert(`Formato no soportado: .${ext}\nAcepta: CSV, Excel (.xlsx/.xls), XML`)
      return
    }
    setFile(f)
  }

  const handleDrop = (e) => {
    e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0])
  }

  const loadSample = () => {
    const rows = [
      'upc,nombre_proveedor,marca_raw,contenido,desc_raw',
      '750000010011,Leche Entera LALA 1L,LALA,1 L,Leche entera pasteurizada',
      '750000010012,Leche Deslactosada Alpura 1L,Alpura,1 L,',
      '750000030011,Coca-Cola PET 600ml,Coca-Cola,600 ml,Refresco de cola',
      '750000050021,Galletas Oreo Original 176g,Oreo,176 g,Galletas de chocolate',
      '750000060011,Shampoo Head Shoulders 375ml,Head & Shoulders,375 ml,Control caspa',
      '750000070011,Detergente Ariel Liquido 800ml,Ariel,800 ml,',
      '750000080011,Panales Huggies Talla M 36pz,Huggies,36 pzas,',
      '750000020041,Cafe Nescafe Clasico 200g,Nescafe,200 g,Cafe soluble instantaneo',
      '750000040011,Pan Blanco Grande Bimbo 680g,Bimbo,680 g,Pan de caja blanco',
      '750000090011,Salchicha de Pavo Sigma 500g,Sigma,500 g,Salchicha bajo en grasa',
    ].join('\n')
    const blob = new Blob([rows], { type: 'text/csv' })
    setFile(new File([blob], 'productos_muestra.csv', { type: 'text/csv' }))
    setFmt('file')
  }

  const S = {
    // Inline styles para no depender de clases Tailwind complejas
    header: {
      padding:'10px 16px', borderBottom:'1px solid var(--border)',
      display:'flex', alignItems:'center', justifyContent:'space-between',
    },
    label: { fontSize:10, textTransform:'uppercase', letterSpacing:'.1em', color:'var(--tx-muted)' },
    count: { fontFamily:'JetBrains Mono,monospace', fontSize:11, color:'var(--ch-teal)' },
    fmtBtn: (active) => ({
      flex:1, padding:'8px 6px', borderRadius:7,
      border:`1px solid ${active ? 'var(--ch-teal)' : 'var(--border-lt)'}`,
      background: active ? 'rgba(0,149,156,.08)' : 'transparent',
      color: active ? 'var(--ch-teal)' : 'var(--tx-muted)',
      fontSize:12, cursor:'pointer', transition:'all .15s',
    }),
    drop: (active) => ({
      margin:'0 12px 8px', borderRadius:10,
      border:`1px dashed ${active ? 'var(--ch-teal)' : 'var(--border-lt)'}`,
      background: active ? 'rgba(0,149,156,.05)' : 'var(--bg)',
      padding:20, textAlign:'center', cursor:'pointer', position:'relative',
      transition:'all .2s',
    }),
    dropIcon: {
      width:36, height:36, borderRadius:8,
      background:'var(--ch-navy)', border:'1px solid var(--border-lt)',
      display:'inline-flex', alignItems:'center', justifyContent:'center',
      marginBottom:10,
      fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:13,
      color:'var(--ch-teal-lt)',
    },
  }

  return (
    <aside style={{
      background:'var(--surf)', borderRight:'1px solid var(--border)',
      display:'flex', flexDirection:'column', height:'100%', overflow:'hidden',
    }}>
      <div style={S.header}>
        <span style={S.label}>Entrada del proveedor</span>
        <span style={S.count}>
          {fmt==='file' && file ? '1 archivo' : ''}
          {fmt==='text' && text ? `${text.split('\n').filter(Boolean).length} líneas` : ''}
        </span>
      </div>

      {/* Format toggle */}
      <div style={{ display:'flex', gap:6, padding:'10px 12px 6px' }}>
        {['file','text'].map(f => (
          <button key={f} onClick={() => setFmt(f)} style={S.fmtBtn(fmt===f)}>
            {f==='file' ? 'Archivo CSV/Excel/XML' : 'Pegar UPCs / nombres'}
          </button>
        ))}
      </div>

      {/* FILE MODE */}
      {fmt==='file' && (
        <>
          <div
            style={S.drop(dragging || !!file)}
            onClick={() => fileRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
          >
            <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls,.xml"
              style={{ display:'none' }}
              onChange={e => handleFile(e.target.files[0])} />
            <div style={S.dropIcon}>{file ? 'CSV' : 'XLS'}</div>
            {file ? (
              <>
                <p style={{ fontSize:13, color:'var(--tx)', fontWeight:500 }}>{file.name}</p>
                <p style={{ fontSize:11, color:'var(--tx-muted)', marginTop:4 }}>
                  {(file.size/1024).toFixed(1)} KB
                </p>
              </>
            ) : (
              <p style={{ fontSize:12, color:'var(--tx-muted)', lineHeight:1.6 }}>
                <span style={{ color:'var(--ch-teal)' }}>Arrastra aquí</span> o haz click
                <br/>CSV · Excel (.xlsx) · XML
              </p>
            )}
          </div>

          <button onClick={loadSample} className="btn-ghost"
            style={{ margin:'0 12px 8px', width:'calc(100% - 24px)' }}>
            Cargar 10 productos de ejemplo
          </button>
        </>
      )}

      {/* TEXT MODE */}
      {fmt==='text' && (
        <>
          <textarea
            value={text} onChange={e => setText(e.target.value)}
            placeholder={'Pega UPCs o nombres, uno por línea:\n750000010011\nLeche LALA 1L\n...'}
            style={{
              margin:'0 12px 8px', height:100,
              background:'var(--bg)', border:'1px solid var(--border-lt)',
              borderRadius:10, padding:'10px 12px',
              color:'var(--tx)', fontFamily:'JetBrains Mono,monospace', fontSize:11,
              resize:'none', outline:'none', lineHeight:1.8,
            }}
          />
          <button onClick={() => setText('750000010011\n750000030011\n750000050021\n750000070011\n750000080011')}
            className="btn-ghost" style={{ margin:'0 12px 8px', width:'calc(100% - 24px)' }}>
            Cargar UPCs de ejemplo
          </button>
        </>
      )}

      {/* Config hint */}
      {(file || text) && (
        <div style={{
          margin:'0 12px 8px', padding:'8px 12px',
          background:'var(--bg)', borderRadius:8,
          border:'1px solid var(--border)',
          fontSize:12, color:'var(--tx-muted)', lineHeight:1.6,
        }}>
          {fmt==='file' && file
            ? `Formato ${file.name.split('.').pop().toUpperCase()} detectado`
            : `${text.split('\n').filter(Boolean).length} entradas detectadas`}
          <br/>GPT-4o-mini clasificará y generará contenido por cada producto.
        </div>
      )}

      {/* Pipeline config */}
      <div style={{ padding:'0 12px' }}>
        <PipelineConfig config={config} onChange={setConfig} />
      </div>

      <div style={{ flex:1 }} />

      {/* Run / Reset */}
      <div style={{ padding:12, borderTop:'1px solid var(--border)' }}>
        {done ? (
          <button onClick={onReset} className="btn-ghost"
            style={{ width:'100%', fontSize:14 }}>
            Procesar de nuevo
          </button>
        ) : (
          <button
            disabled={!canRun || running}
            onClick={() => onStart({ file: fmt==='file' ? file : null, text: fmt==='text' ? text : '', config })}
            className="btn-primary"
            style={{ width:'100%', fontSize:14, display:'flex', alignItems:'center', justifyContent:'center', gap:10 }}
          >
            {running ? (
              <>
                <span style={{
                  width:16, height:16, borderRadius:'50%',
                  border:'2px solid rgba(255,255,255,.3)',
                  borderTopColor:'#fff',
                  animation:'spin-slow 1s linear infinite', display:'inline-block',
                }} />
                Procesando...
              </>
            ) : 'Procesar con AI'}
          </button>
        )}
      </div>
    </aside>
  )
}
