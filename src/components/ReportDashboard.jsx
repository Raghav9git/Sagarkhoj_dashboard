import React, { useMemo, useState, useRef, useEffect } from 'react'
import { X, Download, BarChart2, Users, CheckCircle2, FileText, ChevronDown } from 'lucide-react'
import { jsPDF } from 'jspdf'

/* ─── Sparkline ──────────────────────────────────────────────────────────── */
function Sparkline({ data, color, height = 28 }) {
  const max = Math.max(...data, 1), min = Math.min(...data, 0)
  const range = max - min || 1, width = 100
  const points = data.map((val, i) => {
    const x = (i / (data.length - 1)) * width
    const y = height - ((val - min) / range) * height
    return `${x},${y}`
  }).join(' ')
  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" style={{ overflow: 'visible', marginTop: 6 }}>
      <polyline fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" points={points} />
      <polygon fill={`url(#sg-${color.replace('#', '')})`} points={`0,${height} ${points} ${width},${height}`} opacity="0.25" />
      <defs>
        <linearGradient id={`sg-${color.replace('#', '')}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="1" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  )
}

/* ─── Export helpers ─────────────────────────────────────────────────────── */
function buildTextContent(spillResult, selectedIncident, suspectsList) {
  let t = '==============================================\n'
  t += '                  SAGARKHOJ\n'
  t += '          Oil Spill Intelligence System\n'
  t += '==============================================\n\n'
  t += `Generated : ${new Date().toUTCString()}\n\n`

  if (selectedIncident) {
    t += `INCIDENT TYPE  : Historical Event\n`
    t += `NAME           : ${selectedIncident.name}\n`
    t += `DATE           : ${selectedIncident.date}\n`
    t += `CENTER         : ${selectedIncident.center[0]}  N, ${selectedIncident.center[1]}  E\n\n`
    t += `-- METRICS --\n`
    t += `  Area      : ${selectedIncident.metrics.area}\n`
    t += `  Perimeter : ${selectedIncident.metrics.perimeter}\n`
    t += `  Volume    : ${selectedIncident.metrics.volume}\n`
    t += `  Oil Type  : ${selectedIncident.metrics.oilType}\n\n`
  } else if (spillResult) {
    t += `INCIDENT TYPE  : Live Detection\n`
    t += `DETECTED AT    : ${new Date(spillResult.detectedAt).toISOString()}\n`
    t += `CENTER         : ${spillResult.centroid[0].toFixed(5)}  N, ${spillResult.centroid[1].toFixed(5)}  E\n\n`
  }

  t += `-- SUSPECT VESSELS --\n`
  if (suspectsList.length > 0) {
    suspectsList.forEach((s, i) => {
      t += `  ${i + 1}. ${s.name} (MMSI: ${s.id})\n`
      t += `     Type: ${s.type} | Confidence: ${s.score}%${s.isCulprit ? ' [CULPRIT]' : ''}\n`
    })
  } else { t += `  No suspects identified.\n` }

  t += '\n==============================================\n'
  t += '      SAGARKHOJ - Confidential Report\n'
  t += '==============================================\n'
  return t
}

function exportTXT(spillResult, selectedIncident, suspectsList) {
  const content = buildTextContent(spillResult, selectedIncident, suspectsList)
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `SAGARKHOJ_Report_${Date.now()}.txt`
  document.body.appendChild(a); a.click(); document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function exportPDF(spillResult, selectedIncident, suspectsList) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const W = doc.internal.pageSize.getWidth()
  let y = 15

  // Header bar
  doc.setFillColor(180, 20, 20)
  doc.rect(0, 0, W, 30, 'F')

  // Company name bold
  doc.setFontSize(18); doc.setFont('helvetica', 'bold')
  doc.setTextColor(255, 255, 255)
  doc.text('SAGARKHOJ', 15, 12)
  doc.setFontSize(9); doc.setFont('helvetica', 'normal')
  doc.text('Oil Spill Intelligence System', 15, 19)
  doc.setFontSize(7)
  doc.text(`Report Generated: ${new Date().toUTCString()}`, 15, 25)

  y = 40

  doc.setFontSize(14); doc.setFont('helvetica', 'bold')
  doc.setTextColor(20, 20, 30)
  doc.text('INCIDENT REPORT', 15, y); y += 10

  const addRow = (label, val) => {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(100, 100, 120)
    doc.text(label, 15, y)
    doc.setFont('helvetica', 'normal'); doc.setTextColor(20, 20, 30)
    doc.text(String(val), 65, y); y += 7
  }

  if (selectedIncident) {
    addRow('Incident Type:', 'Historical Event')
    addRow('Name:', selectedIncident.name)
    addRow('Date:', selectedIncident.date)
    addRow('Center:', `${selectedIncident.center[0]} N, ${selectedIncident.center[1]} E`)
    y += 4
    doc.setFillColor(245, 246, 248); doc.roundedRect(10, y - 4, W - 20, 38, 3, 3, 'F')
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(20, 20, 30)
    doc.text('Spill Metrics', 15, y + 4); y += 10
    addRow('Surface Area:', selectedIncident.metrics.area)
    addRow('Perimeter:', selectedIncident.metrics.perimeter)
    addRow('Est. Volume:', selectedIncident.metrics.volume)
    addRow('Oil Type:', selectedIncident.metrics.oilType)
  } else if (spillResult) {
    addRow('Incident Type:', 'Live Detection')
    addRow('Detected At:', new Date(spillResult.detectedAt).toISOString())
    addRow('Center:', `${spillResult.centroid[0].toFixed(5)} N, ${spillResult.centroid[1].toFixed(5)} E`)
  }

  y += 10
  doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(20, 20, 30)
  doc.text('Suspect Vessels', 15, y); y += 7

  if (suspectsList.length > 0) {
    suspectsList.forEach((s, i) => {
      if (y > 265) { doc.addPage(); y = 20 }
      doc.setFillColor(i % 2 === 0 ? 248 : 255, 248, 252)
      doc.roundedRect(10, y - 4, W - 20, 15, 2, 2, 'F')
      doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(20, 20, 30)
      doc.text(`${i + 1}. ${s.name}`, 15, y + 2)
      if (s.isCulprit) {
        doc.setTextColor(180, 20, 20)
        doc.text('[CULPRIT]', 120, y + 2)
      }
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(100, 100, 120)
      doc.text(`MMSI: ${s.id}  |  ${s.type}  |  Confidence: ${s.score}%`, 15, y + 9)
      y += 18
    })
  } else {
    doc.setFont('helvetica', 'italic'); doc.setFontSize(9); doc.setTextColor(150, 150, 170)
    doc.text('No suspects identified.', 15, y)
  }

  // Footer on all pages
  const totalPages = doc.internal.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    const ph = doc.internal.pageSize.getHeight()
    doc.setFillColor(245, 246, 248)
    doc.rect(0, ph - 12, W, 12, 'F')
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(150, 150, 170)
    doc.text('SAGARKHOJ  |  Confidential  |  For Authorised Use Only', 15, ph - 5)
    doc.text(`Page ${i} of ${totalPages}`, W - 25, ph - 5)
  }

  doc.save(`SAGARKHOJ_Report_${Date.now()}.pdf`)
}

/* ─── Main Component ─────────────────────────────────────────────────────── */
export default function ReportDashboard({ onClose, theme, spillResult, selectedIncident, vesselScores, isVisible }) {
  const [activeTab, setActiveTab] = useState('overview')
  const [showDownloadMenu, setShowDownloadMenu] = useState(false)
  const downloadRef = useRef(null)
  const isDark = theme === 'night'

  useEffect(() => {
    const handler = (e) => {
      if (downloadRef.current && !downloadRef.current.contains(e.target)) setShowDownloadMenu(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const c = {
    bg: 'var(--bg-panel)',
    sidebar: 'var(--bg-card-alt)',
    card: 'var(--bg-card)',
    text: 'var(--text-primary)',
    muted: 'var(--text-secondary)',
    border: 'var(--border-subtle)',
    accent: 'var(--accent)',
    danger: 'var(--col-danger)',
    success: 'var(--col-safe)',
    warning: 'var(--col-warn)',
    menuBg: 'var(--bg-card)',
    barBg: 'var(--bg-card-alt)',
  }

  const isHistorical = !!selectedIncident
  const area = isHistorical ? selectedIncident.metrics?.area : (spillResult ? (spillResult.is_spill ? `${spillResult.area} sq km` : '0 sq km') : '---')
  const perimeter = isHistorical ? selectedIncident.metrics?.perimeter : (spillResult ? (spillResult.is_spill ? `${spillResult.perimeter} km` : '0 km') : '---')
  const volume = isHistorical ? selectedIncident.metrics?.volume : (spillResult ? (spillResult.is_spill ? 'Est. 120 Tons' : '0 Tons') : '---')
  const type = isHistorical ? selectedIncident.metrics?.oilType : (spillResult ? (spillResult.is_spill ? 'Heavy Fuel' : 'None') : '---')

  const suspectsList = useMemo(() => {
    if (isHistorical && selectedIncident?.ships) {
      return [...selectedIncident.ships]
        .sort((a, b) => b.confidence - a.confidence)
        .map((s, i) => ({ id: s.mmsi, name: s.name, type: s.type, score: s.confidence, isCulprit: s.isCulprit, rank: i + 1 }))
    } else if (spillResult?.suspects) {
      return spillResult.suspects.map((s, i) => ({
        id: s.mmsi, name: s.name, type: s.type, score: s.confidence, isCulprit: s.isCulprit, rank: i + 1
      }))
    } else if (spillResult?.suspect) {
      return [{
        id: spillResult.suspect.mmsi,
        name: spillResult.suspect.name,
        type: spillResult.suspect.type,
        score: spillResult.suspect.confidence,
        isCulprit: spillResult.suspect.isCulprit,
        rank: 1
      }]
    } else if (vesselScores && Object.keys(vesselScores).length > 0) {
      return Object.entries(vesselScores)
        .sort((a, b) => b[1].total - a[1].total).slice(0, 5)
        .map(([mmsi, d], i) => ({ id: mmsi, name: d.name || `Vessel ${mmsi}`, type: d.type || 'Unknown', score: d.total, isCulprit: false, rank: i + 1 }))
    }
    return []
  }, [selectedIncident, vesselScores, isHistorical, spillResult])

  const chartData1 = [10, 20, 15, 30, 25, 40, 35, 50, 45, 60]
  const chartData2 = [2, 5, 4, 8, 12, 10, 15, 20, 18, 25]

  if (!isVisible) return null

  return (
    <div data-theme={theme} style={{
      position: 'absolute', inset: 0, zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      pointerEvents: 'none'
    }}>
      <div style={{
        position: 'relative',
        width: 'min(880px, 80vw)', height: 'min(560px, 80vh)',
        background: c.bg, borderRadius: 14, overflow: 'hidden',
        display: 'flex',
        boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
        border: `1px solid ${c.border}`,
        color: c.text, pointerEvents: 'all',
        animation: 'compiz-enter 0.35s cubic-bezier(0.175, 0.885, 0.32, 1) forwards'
      }}>

        {/* ── Sidebar ── */}
        <div style={{
          width: 155, flexShrink: 0,
          background: c.sidebar, borderRight: `1px solid ${c.border}`,
          padding: '18px 10px', display: 'flex', flexDirection: 'column', gap: 4
        }}>
          {/* Logo + brand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, paddingLeft: 6, marginBottom: 18 }}>
            <img src="/logo.png" alt="logo" style={{ width: 24, height: 24, objectFit: 'contain' }} />
            <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.06em', color: c.danger }}>SAGARKHOJ</span>
          </div>

          {[
            { id: 'overview', icon: <BarChart2 size={13} />, label: 'OVERVIEW' },
            { id: 'suspects', icon: <Users size={13} />, label: 'SUSPECTS' },
            { id: 'forensics', icon: <FileText size={13} />, label: 'FORENSICS & METOCEAN' },
          ].map(tab => (
            <div
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 7, padding: '7px 11px',
                borderRadius: 7, cursor: 'pointer', fontSize: 11, fontWeight: 600,
                transition: 'all 0.14s',
                background: activeTab === tab.id ? 'var(--accent-dim)' : 'transparent',
                color: activeTab === tab.id ? c.accent : c.muted,
              }}
            >
              {tab.icon} {tab.label}
            </div>
          ))}
        </div>

        {/* ── Main content ── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* Top bar */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 18px', borderBottom: `1px solid ${c.border}`, flexShrink: 0
          }}>
            <span style={{ fontSize: 15, fontWeight: 700 }}>Incident Report</span>

            <div style={{ display: 'flex', gap: 7, alignItems: 'center' }}>

              {/* Download dropdown */}
              <div ref={downloadRef} style={{ position: 'relative' }}>
                <button
                  onClick={() => setShowDownloadMenu(v => !v)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px',
                    background: c.card, border: `1px solid ${c.border}`, borderRadius: 6,
                    color: c.text, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
                  }}
                >
                  <Download size={11} /> Download <ChevronDown size={10} style={{ opacity: 0.6 }} />
                </button>

                {showDownloadMenu && (
                  <div style={{
                    position: 'absolute', top: 'calc(100% + 5px)', right: 0, zIndex: 9999,
                    background: c.menuBg, border: `1px solid ${c.border}`,
                    borderRadius: 8, overflow: 'hidden', minWidth: 136,
                    boxShadow: '0 8px 28px rgba(0,0,0,0.28)'
                  }}>
                    {[
                      { label: 'Export as PDF', icon: <Download size={11} />, fn: () => { exportPDF(spillResult, selectedIncident, suspectsList); setShowDownloadMenu(false) } },
                      { label: 'Export as TXT', icon: <FileText size={11} />, fn: () => { exportTXT(spillResult, selectedIncident, suspectsList); setShowDownloadMenu(false) } },
                    ].map((opt, i) => (
                      <div
                        key={i}
                        onClick={opt.fn}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 8, padding: '9px 13px',
                          cursor: 'pointer', fontSize: 11, fontWeight: 600, color: c.text,
                          borderBottom: i === 0 ? `1px solid ${c.border}` : 'none',
                          transition: 'background 0.12s'
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--accent-dim)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        {opt.icon} {opt.label}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Close */}
              <button
                onClick={onClose}
                style={{
                  width: 26, height: 26, borderRadius: '50%',
                  background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', transition: 'all 0.2s', flexShrink: 0
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Scrollable body */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '14px 18px' }}>

            {activeTab === 'overview' && (
              <>
                {/* Visual Imagery Banner: Live Heatmap or Historical 2-Panel Segmentation */}
                {(spillResult?.heatmap || selectedIncident?.segmentationImage || selectedIncident?.image) && (
                  <div style={{ marginBottom: 16, display: 'flex', gap: 14, flexDirection: 'column' }}>

                    {/* 3-Panel Model Validation */}
                    {spillResult?.panel && (
                      <div style={{ background: c.card, borderRadius: 9, overflow: 'hidden', border: `1px solid ${c.border}` }}>
                        <div style={{ background: c.barBg, padding: '7px 12px', fontSize: 11, fontWeight: 700, borderBottom: `1px solid ${c.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span>DeepLabV3+ Model Validation (3-Panel)</span>
                          <span style={{ fontSize: 9, color: c.muted, fontFamily: 'monospace' }}>Input SAR | Ground Truth | Prediction</span>
                        </div>
                        <img
                          src={spillResult.panel}
                          alt="3-Panel Segmentation"
                          style={{ width: '100%', objectFit: 'contain', background: '#0a0d14', display: 'block', maxHeight: 220 }}
                        />
                      </div>
                    )}

                    {/* Production Heatmap */}
                    <div style={{ display: 'flex', gap: 14 }}>
                      <div style={{ flex: 1, background: c.card, borderRadius: 9, overflow: 'hidden', border: `1px solid ${c.border}` }}>
                        <div style={{ background: c.barBg, padding: '7px 12px', fontSize: 11, fontWeight: 700, borderBottom: `1px solid ${c.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span>{isHistorical ? 'Historical AI Benchmark & Segmentation Mask' : 'Production Map Overlay Engine'}</span>
                          <span style={{ fontSize: 9, color: c.muted, fontFamily: 'monospace' }}>256x256 ResNet34</span>
                        </div>
                        <img
                          src={isHistorical ? (selectedIncident.segmentationImage || selectedIncident.image) : spillResult?.heatmap}
                          alt="SAR Detection"
                          style={{ width: '100%', height: 185, objectFit: 'contain', background: '#0a0d14', display: 'block' }}
                        />
                      </div>

                      <div style={{ width: 220, display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <div style={{
                          flex: 1,
                          background: (isHistorical || spillResult?.is_spill) ? 'rgba(239, 68, 68, 0.08)' : 'rgba(34, 197, 94, 0.08)',
                          border: `1px solid ${(isHistorical || spillResult?.is_spill) ? 'rgba(239, 68, 68, 0.25)' : 'rgba(34, 197, 94, 0.25)'}`,
                          borderRadius: 9, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                          color: (isHistorical || spillResult?.is_spill) ? c.danger : c.success, padding: '12px 10px'
                        }}>
                          <div style={{ fontSize: 32, marginBottom: 4 }}>{(isHistorical || spillResult?.is_spill) ? '⚠️' : '✅'}</div>
                          <div style={{ fontSize: 13, fontWeight: 800, textAlign: 'center' }}>
                            {(isHistorical || spillResult?.is_spill) ? 'OIL SPILL CONFIRMED' : 'NO SPILL DETECTED'}
                          </div>
                          <div style={{ fontSize: 9.5, marginTop: 4, opacity: 0.85, textAlign: 'center', lineHeight: 1.3 }}>
                            {isHistorical
                              ? (selectedIncident.metrics?.anomaly || 'Benchmark Ground Truth Incident')
                              : (spillResult?.is_spill ? 'Hydrocarbon slick signature identified by model.' : 'Water surface normal. No anomalies found.')}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {/* 4 metric cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 12 }}>
                  {[
                    { label: 'Surface Area', val: area },
                    { label: 'Perimeter', val: perimeter },
                    { label: 'Est. Volume', val: volume },
                    { label: 'Oil Type', val: type },
                  ].map((s, i) => (
                    <div key={i} style={{
                      background: c.card, borderRadius: 9, padding: '11px 13px',
                      border: `1px solid ${c.border}`, boxShadow: '0 2px 4px rgba(0,0,0,0.04)'
                    }}>
                      <div style={{ fontSize: 9, color: c.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 5 }}>{s.label}</div>
                      <div style={{ fontSize: 16, fontWeight: 700 }}>{s.val}</div>
                    </div>
                  ))}
                </div>

                {/* Charts row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr', gap: 10 }}>
                  <div style={{ background: c.card, borderRadius: 9, padding: '11px 13px', border: `1px solid ${c.border}` }}>
                    <div style={{ fontSize: 10, color: c.muted, fontWeight: 500 }}>Spill Growth Rate</div>
                    <div style={{ fontSize: 17, fontWeight: 700, marginTop: 2 }}>+2.4%</div>
                    <Sparkline data={chartData1} color={c.accent} />
                  </div>
                  <div style={{ background: c.card, borderRadius: 9, padding: '11px 13px', border: `1px solid ${c.border}` }}>
                    <div style={{ fontSize: 10, color: c.muted, fontWeight: 500 }}>Culprit Anomaly</div>
                    <div style={{ fontSize: 17, fontWeight: 700, marginTop: 2 }}>94 / 100</div>
                    <Sparkline data={chartData2} color={c.accent} />
                  </div>
                  <div style={{ background: c.card, borderRadius: 9, padding: '11px 13px', border: `1px solid ${c.border}` }}>
                    <div style={{ fontSize: 10, color: c.muted, fontWeight: 500, marginBottom: 8 }}>Vessel Activity (Last 12h)</div>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 64 }}>
                      {[30, 45, 20, 60, 80, 50, 40, 70, 90, 100, 85, 95].map((h, i) => (
                        <div key={i} style={{
                          flex: 1, height: `${h}%`, borderRadius: '3px 3px 0 0',
                          background: i === 9 ? c.accent : c.barBg
                        }} />
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}
            
            {activeTab === 'suspects' && (
              /* Suspects tab */
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {/* Match criteria */}
                <div style={{ background: c.card, borderRadius: 9, padding: '13px 15px', border: `1px solid ${c.border}` }}>
                  <div style={{ fontSize: 10, color: c.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>Match Criteria</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {[
                      { label: 'Trajectory Intersect', val: 95, color: c.success },
                      { label: 'Speed Anomaly', val: 74, color: c.warning },
                      { label: 'AIS Gap Detected', val: 52, color: c.danger },
                      { label: 'Proximity to Center', val: 89, color: c.success },
                    ].map((item, i) => (
                      <div key={i}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 11, fontWeight: 600 }}>
                          <span>{item.label}</span><span style={{ color: c.muted }}>{item.val}%</span>
                        </div>
                        <div style={{ height: 4, background: c.barBg, borderRadius: 2, overflow: 'hidden' }}>
                          <div style={{ width: `${item.val}%`, height: '100%', background: item.color, borderRadius: 2 }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Leaderboard */}
                <div style={{ background: c.card, borderRadius: 9, padding: '13px 15px', border: `1px solid ${c.border}` }}>
                  <div style={{ fontSize: 10, color: c.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>Suspect Leaderboard</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                    {suspectsList.length > 0 ? suspectsList.map(s => (
                      <div key={s.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 9, borderBottom: `1px solid ${c.border}` }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{
                            width: 24, height: 24, borderRadius: '50%', fontSize: 10, fontWeight: 700,
                            background: s.isCulprit ? 'rgba(239,68,68,0.14)' : 'rgba(59,130,246,0.14)',
                            color: s.isCulprit ? c.danger : c.accent,
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                          }}>{s.rank}</div>
                          <div>
                            <div style={{ fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5 }}>
                              {s.name} {s.isCulprit && <CheckCircle2 size={10} color={c.danger} />}
                            </div>
                            <div style={{ fontSize: 9, color: c.muted, marginTop: 1 }}>{s.type} · {s.id}</div>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontWeight: 700, fontSize: 11, color: s.isCulprit ? c.danger : c.text }}>{s.score}%</div>
                          <div style={{ fontSize: 9, color: c.muted }}>Confidence</div>
                        </div>
                      </div>
                    )) : (
                      <div style={{ color: c.muted, fontSize: 11, fontStyle: 'italic' }}>No suspects yet.</div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'forensics' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* Show imagery panels */}
                <div style={{ display: 'flex', gap: 14, flexDirection: 'column' }}>
                  {/* 3-panel from backend or benchmark */}
                  {(isHistorical ? selectedIncident?.panelImage : spillResult?.panel) && (
                    <div style={{ border: `1px solid ${c.border}`, borderRadius: 9, overflow: 'hidden' }}>
                      <div style={{ background: c.barBg, padding: '7px 12px', fontSize: 11, fontWeight: 700, borderBottom: `1px solid ${c.border}` }}>
                        DeepLabV3+ 3-Panel Model Validation
                      </div>
                      <img
                        src={isHistorical ? selectedIncident?.panelImage : spillResult.panel}
                        style={{ width: '100%', display: 'block', objectFit: 'contain', background: '#0a0d14', maxHeight: 200 }}
                        alt="SAR 3-Panel Analysis"
                      />
                    </div>
                  )}
                  {/* Segmentation heatmap */}
                  {(isHistorical ? (selectedIncident?.segmentationImage || selectedIncident?.image) : spillResult?.heatmap) && (
                    <div style={{ border: `1px solid ${c.border}`, borderRadius: 9, overflow: 'hidden' }}>
                      <div style={{ background: c.barBg, padding: '7px 12px', fontSize: 11, fontWeight: 700, borderBottom: `1px solid ${c.border}` }}>
                        AI Detection Imagery — SAR Segmentation Overlay
                      </div>
                      <img
                        src={isHistorical ? (selectedIncident.segmentationImage || selectedIncident.image) : spillResult?.heatmap}
                        style={{ width: '100%', display: 'block', maxHeight: 220, objectFit: 'contain', background: '#0a0d14' }}
                        alt="SAR Image Overlay"
                      />
                    </div>
                  )}
                </div>

                {/* Forensic briefing text — full 6 sections */}
                <div style={{
                  background: c.card, borderRadius: 9,
                  padding: '16px 20px', border: `1px solid ${c.border}`,
                  fontFamily: 'JetBrains Mono, monospace', fontSize: 11, lineHeight: 1.7,
                  color: c.muted, overflowY: 'auto', maxHeight: 360
                }}>
                  {/* Header */}
                  <div style={{ textAlign: 'center', marginBottom: 16, color: c.accent, fontWeight: 700, fontSize: 12 }}>
                    ═══════════════════════════════════════════════════════════════════<br/>
                    🔍 MARITIME FORENSIC & HYDRODYNAMIC ANALYSIS BRIEFING<br/>
                    ═══════════════════════════════════════════════════════════════════
                  </div>
                  {/* Get briefing text from spillResult (benchmark match) or selectedIncident */}
                  {(() => {
                    const text = spillResult?.briefingText || selectedIncident?.briefingText
                    if (text) {
                      // Render the text with section headers highlighted
                      const lines = text.split('\n')
                      return lines.map((line, i) => {
                        const isSection = line.includes('[SECTION') || line.startsWith('═') || line.startsWith('RANK') || line.startsWith('✔') || line.startsWith('[VERDICT')
                        const isCulprit = line.includes('[MATCH]') || line.includes('CONFIRMED')
                        const isLabel = line.startsWith('├─') || line.startsWith('└─')
                        return (
                          <div key={i} style={{
                            color: isCulprit ? '#ef4444' : isSection ? '#60a5fa' : isLabel ? c.muted : c.muted,
                            fontWeight: isSection ? 700 : 400,
                            marginBottom: line === '' ? 4 : 0,
                          }}>
                            {line || '\u00a0'}
                          </div>
                        )
                      })
                    } else {
                      return (
                        <div style={{ color: c.muted, fontStyle: 'italic', textAlign: 'center', padding: '20px 0' }}>
                          No forensic briefing available. Upload an image or select a historical case.
                        </div>
                      )
                    }
                  })()}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
