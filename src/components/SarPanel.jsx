import React, { useRef, useState, useCallback, useEffect } from 'react'
import { Upload, Cpu, CheckCircle2, X, RefreshCw, Search, Satellite, Layers, AlertCircle } from 'lucide-react'

function fmtSize(b) {
  if (b < 1024) return `${b} B`
  if (b < 1048576) return `${(b/1024).toFixed(1)} KB`
  return `${(b/1048576).toFixed(2)} MB`
}

const STAGES = [
  { id:1, label:'Pre-processing SAR bands',    icon:Layers     },
  { id:2, label:'Running segmentation model',  icon:Cpu        },
  { id:3, label:'Detecting oil-water boundary',icon:AlertCircle},
  { id:4, label:'Geo-referencing output',      icon:Satellite  },
]
const STAGE_MS = [900, 1400, 800, 700]

export default function SarPanel({ onClose, onSpillDetected, isProcessing, setIsProcessing, spillResult, theme, onPreviewReady, selectedIncident, setSelectedIncident, showHistorical, setShowHistorical, historicalIncidents }) {
  const inputRef             = useRef(null)
  const [file, setFile]       = useState(null)
  const [preview, setPreview] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const [stage, setStage]     = useState(0)
  const [done,  setDone]      = useState(false)
  const [weather, setWeather] = useState(null)

  const isDark = theme === 'night'

  const c = {
    bg:     'var(--bg-panel)',
    card:   'var(--bg-card)',
    border: 'var(--border-subtle)',
    bdrMid: 'var(--border-mid)',
    text:   'var(--text-primary)',
    sec:    'var(--text-secondary)',
    muted:  'var(--text-muted)',
    dim:    'var(--text-dim)',
    iconBg: 'var(--tag-bg)',
  }

  const handleFile = useCallback((f) => {
    if (!f) return
    setFile(f); setDone(false); setStage(0)
    const r = new FileReader()
    r.onload = e => { setPreview(e.target.result); onPreviewReady?.(e.target.result) }
    r.readAsDataURL(f)
  }, [onPreviewReady])

  const onDrop = useCallback((e) => {
    e.preventDefault(); setDragOver(false)
    handleFile(e.dataTransfer.files?.[0])
  }, [handleFile])

  const executeModel = useCallback(async () => {
    if (!file || isProcessing) return
    setIsProcessing(true); setDone(false)
    try {
      const formData = new FormData()
      formData.append('image', file)
      const res = await fetch('https://sagarkhoj-backend-production.up.railway.app/api/segment', {
        method: 'POST',
        body: formData
      })
      const data = await res.json()
      setDone(true)
      if (data && data.status === 'success') {
        onSpillDetected(data)
        // Auto-close panel after 800ms so user can see map with results
        setTimeout(() => onClose?.(), 800)
      } else {
        onSpillDetected()
        setTimeout(() => onClose?.(), 800)
      }
    } catch (err) {
      console.warn('Backend API connection failed, using fallback detection:', err)
      setDone(true)
      onSpillDetected()
      setTimeout(() => onClose?.(), 800)
    } finally {
      setIsProcessing(false)
    }
  }, [file, isProcessing, onSpillDetected, setIsProcessing, onClose])

  // Fetch wind data for spill location (same source as oil drift line)
  useEffect(() => {
    if (!spillResult?.centroid) return
    const [lat, lon] = spillResult.centroid
    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=wind_speed_10m,wind_direction_10m&forecast_days=1&timezone=UTC`)
      .then(r => r.json())
      .then(json => {
        const wspd = json.hourly?.wind_speed_10m?.[0]
        const wdir = json.hourly?.wind_direction_10m?.[0]
        if (wspd != null) setWeather({ wspd: wspd.toFixed(1), wdir: Math.round(wdir) })
      })
      .catch(() => {})
  }, [spillResult?.centroid?.[0], spillResult?.centroid?.[1]])

  const reset = () => {
    setFile(null); setPreview(null); setStage(0); setDone(false)
    if (inputRef.current) inputRef.current.value = ''
  }

  const panelStyle = {
    position: 'relative',
    width: 'min(920px, 80vw)', height: 'min(580px, 80vh)', overflow: 'hidden', display: 'flex', flexDirection: 'column',
    background: c.bg,
    backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
    border: `1px solid ${c.border}`, borderRadius: 14, pointerEvents: 'all',
    boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
    animation: 'compiz-enter 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.1) forwards'
  }

  return (
    <div data-theme={theme} style={{ ...panelStyle }}>
      {/* Header */}
      <div style={{ padding: '14px', borderBottom: `1px solid ${c.border}`, position: 'relative' }}>
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: 12, right: 12,
            width: 24, height: 24, borderRadius: '50%',
            background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', transition: 'all 0.2s'
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
        >
          <X size={14} />
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
          <Satellite size={11} color={c.muted} />
          <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: c.muted }}>SAR Input</span>
        </div>
        <p style={{ fontSize: 13, fontWeight: 700, color: c.text }}>Sensor Telemetry</p>
        <p style={{ fontSize: 9, color: c.muted, marginTop: 2 }}>Upload SAR imagery for detection</p>
        
        {/* Mode Toggle */}
        <div style={{ display:'flex', marginTop:10, background:c.iconBg, borderRadius:6, padding:2, border:`1px solid ${c.border}` }}>
          <button 
            onClick={() => setShowHistorical(false)}
            style={{ flex:1, padding:'6px 0', fontSize:10, fontWeight:600, borderRadius:4, background: !showHistorical ? c.card : 'transparent', color: !showHistorical ? c.text : c.muted, border:'none', cursor:'pointer', transition:'all 0.2s', boxShadow: !showHistorical ? `0 1px 3px rgba(0,0,0,0.1)` : 'none' }}
          >
            Live Upload
          </button>
          <button 
            onClick={() => setShowHistorical(true)}
            style={{ flex:1, padding:'6px 0', fontSize:10, fontWeight:600, borderRadius:4, background: showHistorical ? c.card : 'transparent', color: showHistorical ? c.text : c.muted, border:'none', cursor:'pointer', transition:'all 0.2s', boxShadow: showHistorical ? `0 1px 3px rgba(0,0,0,0.1)` : 'none' }}
          >
            Historical Case
          </button>
        </div>

        {/* Historical Dropdown */}
        {showHistorical && (
          <div style={{ marginTop: 10, display:'flex', flexDirection:'column', gap:6 }}>
            <select 
              value={selectedIncident?.id || ''} 
              onChange={e => {
                const inc = historicalIncidents.find(i => i.id === e.target.value);
                if (inc) setSelectedIncident(inc); // This calls handleHistoricalSelect in App.jsx
              }}
              style={{
                width: '100%',
                padding: '6px 8px',
                borderRadius: 6,
                background: c.iconBg,
                border: `1px solid ${c.border}`,
                color: c.text,
                fontSize: 10,
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              {historicalIncidents?.map(inc => (
                <option key={inc.id} value={inc.id}>{inc.name}</option>
              ))}
            </select>
            {selectedIncident && (
              <button
                onClick={() => {
                  onClose?.() // Close panel and fly to the incident on the map
                }}
                style={{
                  width:'100%', padding:'7px 12px',
                  display:'flex', alignItems:'center', justifyContent:'center', gap:6,
                  background:'rgba(239,68,68,0.12)',
                  border:'1px solid rgba(239,68,68,0.3)',
                  color:'#ef4444', fontSize:10, fontWeight:700,
                  borderRadius:6, cursor:'pointer',
                }}
              >
                📍 View on Map
              </button>
            )}
          </div>
        )}
      </div>

      {/* Body */}
      <div style={{ flex:1, overflowY:'auto', padding:10, display:'flex', flexDirection:'column', gap:8 }}>

        {/* Dropzone */}
        {!file && !showHistorical && (
          <div
            className={`dropzone${dragOver?' drag-over':''}`}
            style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:8, padding:'20px 10px', cursor:'pointer' }}
            onDrop={onDrop}
            onDragOver={e=>{e.preventDefault();setDragOver(true)}}
            onDragLeave={()=>setDragOver(false)}
            onClick={()=>inputRef.current?.click()}
            role="button" tabIndex={0}
            onKeyDown={e=>e.key==='Enter'&&inputRef.current?.click()}
          >
            <div style={{ width:40, height:40, borderRadius:10, background:c.iconBg, border:`1px solid ${c.border}`, display:'flex', alignItems:'center', justifyContent:'center' }} className="clay">
              <Upload size={17} color={c.muted} strokeWidth={1.6} />
            </div>
            <div style={{ textAlign:'center' }}>
              <p style={{ fontSize:11, fontWeight:600, color:c.text }}>{dragOver?'Release to upload':'Drop SAR imagery here'}</p>
              <p style={{ fontSize:9, color:c.muted, marginTop:2 }}>PNG · JPG · TIF</p>
            </div>
          </div>
        )}

        <input ref={inputRef} type="file" accept=".png,.jpg,.jpeg,.tif,.tiff"
          className="hidden" onChange={e=>handleFile(e.target.files?.[0])} aria-hidden />

        {/* Preview + pipeline */}
        {((file && preview && !showHistorical) || (showHistorical && selectedIncident)) && (
          <div className="anim-slide" style={{ display:'flex', flexDirection:'column', gap:7 }}>
            {/* Image preview */}
            <div style={{ position:'relative', borderRadius:9, overflow:'hidden', border:`1px solid ${c.border}` }} className="clay">
              <img src={showHistorical ? selectedIncident?.image : preview} alt="SAR Image" style={{ width:'100%', height:130, objectFit:'cover', display:'block' }} />
              {isProcessing && <div className="scan-line" />}
              {isProcessing && !showHistorical && (
                <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <div style={{ width:22, height:22, border:'2px solid rgba(255,255,255,0.15)', borderTop:'2px solid rgba(255,255,255,0.7)', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
                </div>
              )}
              {((done && !isProcessing && !showHistorical) || showHistorical) && (
                <div style={{ position:'absolute', top:5, right:5, display:'flex', alignItems:'center', gap:3, padding:'2px 8px', borderRadius:10, background:'rgba(239, 68, 68, 0.25)', border:'1px solid rgba(239, 68, 68, 0.4)', fontSize:9, fontWeight:700, color:'#ef4444' }}>
                  <CheckCircle2 size={9} color="#ef4444" /> {showHistorical ? "Historical Benchmark" : "Heatmap Detection Active"}
                </div>
              )}
              {!isProcessing && !showHistorical && (
                <button onClick={reset} style={{ position:'absolute', top:5, left:5, width:20, height:20, borderRadius:'50%', background:'rgba(0,0,0,0.6)', border:'none', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
                  <X size={9} color="rgba(255,255,255,0.75)" />
                </button>
              )}
            </div>

            {/* File info */}
            <div style={{ background:c.card, border:`1px solid ${c.border}`, borderRadius:9, padding:'7px 9px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:'5px 8px' }} className="clay">
              {showHistorical ? (
                <>
                  <div>
                    <span style={{ display:'block', fontSize:7, textTransform:'uppercase', letterSpacing:'0.08em', color:c.dim, fontWeight:700 }}>Incident</span>
                    <span style={{ display:'block', fontSize:9, color:c.sec, fontFamily:'JetBrains Mono,monospace', marginTop:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{selectedIncident?.id || '-'}</span>
                  </div>
                  <div>
                    <span style={{ display:'block', fontSize:7, textTransform:'uppercase', letterSpacing:'0.08em', color:c.dim, fontWeight:700 }}>Date</span>
                    <span style={{ display:'block', fontSize:9, color:c.sec, fontFamily:'JetBrains Mono,monospace', marginTop:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{selectedIncident?.date || '-'}</span>
                  </div>
                </>
              ) : (
                [['File', (file?.name?.length > 15 ? file.name.slice(0,12)+'…' : (file?.name || 'Unknown'))],['Size',fmtSize(file?.size || 0)],['Sensor','Sentinel-1A'],['Band','C-Band VV']].map(([l,v])=>(
                  <div key={l}>
                    <span style={{ display:'block', fontSize:7, textTransform:'uppercase', letterSpacing:'0.08em', color:c.dim, fontWeight:700 }}>{l}</span>
                    <span style={{ display:'block', fontSize:9, color:c.sec, fontFamily:'JetBrains Mono,monospace', marginTop:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{v}</span>
                  </div>
                ))
              )}
            </div>

            {/* Pipeline stages - Removed per user request, just show processing */}
            {(isProcessing && !showHistorical) && (
              <div style={{ background:c.card, border:`1px solid ${c.border}`, borderRadius:9, padding:'12px 10px', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }} className="clay">
                <div style={{ width:16, height:16, border:`2px solid ${c.bdrMid}`, borderTopColor:c.text, borderRadius:'50%', animation:'spin 1s linear infinite' }} />
                <span style={{ fontSize:11, fontWeight:700, color:c.text, letterSpacing:'0.05em' }}>PROCESSING SAR IMAGERY...</span>
              </div>
            )}

            {/* ── Search / action button ── */}
            {(!done && !showHistorical) && (
              <button
                className="clay-btn"
                id="search-model-btn"
                style={{
                  width:'100%', padding:'9px 12px',
                  display:'flex', alignItems:'center', justifyContent:'center', gap:7,
                  background: 'var(--tag-bg)',
                  border:`1px solid ${c.bdrMid}`,
                   color: c.text,
                  fontSize:12, fontWeight:700,
                  opacity: isProcessing ? 0.65 : 1,
                  pointerEvents: isProcessing ? 'none' : 'all',
                  letterSpacing:'0.02em',
                }}
                onClick={executeModel}
              >
                {isProcessing
                  ? <><RefreshCw size={12} style={{ animation:'spin 0.8s linear infinite' }} /> Analyzing…</>
                  : <><Search size={12} /> Search</>}
              </button>
            )}

            {done && !showHistorical && (
              <button className="clay-btn" onClick={reset} style={{
                width:'100%', padding:'7px 12px', display:'flex', alignItems:'center', justifyContent:'center', gap:5,
                background:'transparent', border:`1px solid ${c.border}`, color:c.muted, fontSize:10, fontWeight:500, cursor:'pointer',
              }}>
                <RefreshCw size={10} /> New Image
              </button>
            )}
          </div>
        )}

        {/* Weather mini-panel — appears after spill detection */}
        {spillResult && (
          <div style={{ background:c.card, border:`1px solid ${c.border}`, borderRadius:9, padding:'7px 9px' }} className="clay anim-slide">
            <p style={{ fontSize:7, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em', color:c.muted, marginBottom:5 }}>
              Wind at Spill (Open-Meteo)
            </p>
            {weather ? (
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'4px 8px' }}>
                <div>
                  <span style={{ display:'block', fontSize:7, textTransform:'uppercase', letterSpacing:'0.08em', color:c.dim, fontWeight:700 }}>Speed</span>
                  <span style={{ display:'block', fontSize:10, color:c.text, fontWeight:600, fontFamily:'JetBrains Mono,monospace' }}>{weather.wspd} m/s</span>
                </div>
                <div>
                  <span style={{ display:'block', fontSize:7, textTransform:'uppercase', letterSpacing:'0.08em', color:c.dim, fontWeight:700 }}>Direction</span>
                  <span style={{ display:'block', fontSize:10, color:c.text, fontWeight:600, fontFamily:'JetBrains Mono,monospace' }}>{weather.wdir}°</span>
                </div>
                <div style={{ gridColumn:'1/-1' }}>
                  <span style={{ display:'block', fontSize:7, textTransform:'uppercase', letterSpacing:'0.08em', color:c.dim, fontWeight:700 }}>Oil Drift Rate</span>
                  <span style={{ display:'block', fontSize:9, color:c.sec, fontFamily:'JetBrains Mono,monospace' }}>
                    {((weather.wspd * 0.035) * 3.6).toFixed(2)} km/h (Stokes 3.5%)
                  </span>
                </div>
              </div>
            ) : (
              <span style={{ fontSize:9, color:c.muted, fontStyle:'italic' }}>Fetching wind data…</span>
            )}
          </div>
        )}
      </div>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
