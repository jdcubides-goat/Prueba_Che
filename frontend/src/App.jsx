import { useState } from 'react'
import TopBar       from './components/TopBar'
import StatsBanner  from './components/StatsBanner'
import UploadPanel  from './components/UploadPanel'
import PipelineView from './components/PipelineView'
import ResultsGrid  from './components/ResultsGrid'
import StiboExport  from './components/StiboExport'
import usePipeline  from './hooks/usePipeline'

// Cambia esto por la ruta a tu logo cuando lo tengas
import companyLogo from './assets/logos/logo.png'
// Por ahora usa null — se mostrará un placeholder con las iniciales
const COMPANY_LOGO = companyLogo
const COMPANY_NAME = 'PMDM Consulting'

const TABS = [
  { id:'pipeline', label:'Pipeline AI'  },
  { id:'results',  label:'Resultados'   },
  { id:'stibo',    label:'Stibo Step'   },
]

export default function App() {
  const [activeTab, setActiveTab] = useState('pipeline')
  const pipeline = usePipeline()

  const globalStatus = pipeline.running ? 'running'
    : pipeline.done  ? 'done'
    : pipeline.error ? 'error'
    : 'idle'

  const handleStart = async (input) => {
    setActiveTab('pipeline')
    await pipeline.run(input)
    if (!pipeline.error) setActiveTab('results')
  }

  const handleReset = () => {
    pipeline.reset()
    setActiveTab('pipeline')
  }

  return (
    <div style={{
      display:'flex', flexDirection:'column', height:'100vh', overflow:'hidden',
      background:'var(--bg)', color:'var(--tx)',
      fontFamily:'DM Sans, sans-serif',
    }}>

      {/* Top bar fija */}
      <TopBar
        status={globalStatus}
        companyLogo={COMPANY_LOGO}
        companyName={COMPANY_NAME}
      />

      {/* Stats banner debajo del topbar */}
      <div style={{ marginTop:52, flexShrink:0 }}>
        <StatsBanner />
      </div>

      {/* Shell principal */}
      <div style={{ display:'flex', flex:1, overflow:'hidden' }}>

        {/* Panel izquierdo */}
        <div style={{ width:290, flexShrink:0, display:'flex', flexDirection:'column', overflow:'hidden' }}>
          <UploadPanel
            onStart={handleStart}
            running={pipeline.running}
            done={pipeline.done}
            onReset={handleReset}
          />
        </div>

        {/* Panel derecho — tabs + contenido */}
        <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>

          {/* Tab bar */}
          <div style={{
            display:'flex',
            background:'var(--surf)', borderBottom:'1px solid var(--border)',
            flexShrink:0, padding:'0 20px',
          }}>
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding:'12px 18px', fontSize:13, background:'none', border:'none',
                  borderBottom:`2px solid ${activeTab===tab.id ? 'var(--ch-red)' : 'transparent'}`,
                  color: activeTab===tab.id ? 'var(--tx)' : 'var(--tx-muted)',
                  cursor:'pointer', transition:'all .15s', whiteSpace:'nowrap',
                  display:'flex', alignItems:'center', gap:8,
                }}
              >
                {tab.label}

                {/* Badge Resultados */}
                {tab.id==='results' && pipeline.products.length > 0 && (
                  <span style={{
                    background:'var(--ch-red)', color:'#fff',
                    fontSize:10, fontWeight:700, borderRadius:10,
                    padding:'1px 7px',
                  }}>
                    {pipeline.products.length}
                  </span>
                )}

                {/* Badge Stibo */}
                {tab.id==='stibo' && pipeline.done && (
                  <span style={{
                    background:'rgba(0,149,156,.15)', color:'var(--ch-teal)',
                    fontSize:10, fontWeight:600, borderRadius:10,
                    padding:'1px 7px', border:'1px solid rgba(0,149,156,.3)',
                  }}>
                    CSV
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Contenido de la tab activa */}
          <div style={{ flex:1, overflow:'hidden' }}>
            {activeTab==='pipeline' && (
              <PipelineView
                stages={pipeline.stages}
                progress={pipeline.progress}
                running={pipeline.running}
                done={pipeline.done}
                error={pipeline.error}
              />
            )}
            {activeTab==='results' && (
              <ResultsGrid
                products={pipeline.products}
                config={pipeline.config || {}}
              />
            )}
            {activeTab==='stibo' && (
              <StiboExport products={pipeline.products} />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
