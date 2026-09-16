import React from 'react'
import { AlertTriangle, Cpu } from 'lucide-react'

export default function SpillCard({ spillResult, theme }) {
  const isDark = theme === 'night'
  const c = {
    bg:      isDark ? 'rgba(12,13,16,0.84)'    : 'rgba(255,255,255,0.9)',
    card:    isDark ? 'rgba(20,21,26,0.9)'     : 'rgba(248,250,252,0.97)',
    border:  isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)',
    bdrMid:  isDark ? 'rgba(255,255,255,0.11)' : 'rgba(0,0,0,0.11)',
    text:    isDark ? '#f1f5f9'  : '#0f172a',
    sec:     isDark ? '#94a3b8'  : '#475569',
    muted:   isDark ? '#475569'  : '#94a3b8',
    dim:     isDark ? '#334155'  : '#cbd5e1',
    warnBg:  isDark ? 'rgba(251,191,36,0.07)'  : 'rgba(217,119,6,0.06)',
    warnBdr: isDark ? 'rgba(251,191,36,0.18)'  : 'rgba(217,119,6,0.14)',
    warnTxt: isDark ? '#fbbf24'  : '#d97706',
    dangBg:  isDark ? 'rgba(248,113,113,0.08)' : 'rgba(220,38,38,0.06)',
    dangBdr: isDark ? 'rgba(248,113,113,0.18)' : 'rgba(220,38,38,0.14)',
    dangTxt: isDark ? '#f87171'  : '#dc2626',
  }

  const card = {
    background: c.bg,
    backdropFilter: 'blur(14px)',
    WebkitBackdropFilter: 'blur(14px)',
    border: `1px solid ${c.border}`,
    borderRadius: 12,
    overflow: 'hidden',
    pointerEvents: 'all',
  }

  return (
    <div style={card} className="anim-fade">
      {/* Header */}
      <div style={{ padding: '10px 12px 8px', borderBottom: `1px solid ${c.border}`, display: 'flex', alignItems: 'center', gap: 6 }}>
        <AlertTriangle size={11} color={spillResult ? c.dangTxt : c.muted} />
        <p style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: spillResult ? c.dangTxt : c.muted }}>
          Oil Spill Data
        </p>
      </div>

      <div style={{ padding: '10px 12px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>

        {/* No spill yet */}
        {!spillResult && (
          <p style={{ fontSize: 10, color: c.muted, lineHeight: 1.5, fontStyle: 'italic' }}>
            No spill detected. Upload a SAR image and run the detection model.
          </p>
        )}

        {/* Spill detected */}
        {spillResult && (
          <>
            {/* Detection status */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 8px', borderRadius: 8, background: c.dangBg, border: `1px solid ${c.dangBdr}` }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: c.dangTxt, animation: 'blink 1.8s ease-in-out infinite', flexShrink: 0 }} />
              <span style={{ fontSize: 10, fontWeight: 700, color: c.dangTxt }}>Spill Detected</span>
            </div>

            {/* Coordinates */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 10px' }}>
              <SpillStat label="Centroid Lat" value={`${spillResult.centroid[0].toFixed(5)}°N`} c={c} mono />
              <SpillStat label="Centroid Lon" value={`${spillResult.centroid[1].toFixed(5)}°E`} c={c} mono />
            </div>

            {/* AI-model-dependent metrics — pending */}
            <div style={{ borderTop: `1px solid ${c.border}`, paddingTop: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 7 }}>
                <Cpu size={9} color={c.warnTxt} />
                <span style={{ fontSize: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.09em', color: c.warnTxt }}>
                  Awaiting AI Model
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 10px' }}>
                <PendingStat label="Area (km²)"       c={c} />
                <PendingStat label="Perimeter (km)"   c={c} />
                <PendingStat label="Confidence Score" c={c} />
                <PendingStat label="Slick Volume"     c={c} />
                <PendingStat label="Slick Thickness"  c={c} />
                <PendingStat label="Severity Index"   c={c} />
              </div>
              <p style={{ fontSize: 8, color: c.dim, marginTop: 7, lineHeight: 1.5, fontStyle: 'italic' }}>
                Metrics will be populated once the trained segmentation model is integrated.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function SpillStat({ label, value, c, mono }) {
  return (
    <div>
      <span style={{ display: 'block', fontSize: 7, textTransform: 'uppercase', letterSpacing: '0.08em', color: c.dim, fontWeight: 700 }}>{label}</span>
      <span style={{ display: 'block', fontSize: 10, color: c.text, marginTop: 2, fontFamily: mono ? 'JetBrains Mono, monospace' : 'inherit', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{value}</span>
    </div>
  )
}

function PendingStat({ label, c }) {
  return (
    <div>
      <span style={{ display: 'block', fontSize: 7, textTransform: 'uppercase', letterSpacing: '0.08em', color: c.dim, fontWeight: 700 }}>{label}</span>
      <div style={{
        marginTop: 3, height: 14, borderRadius: 4,
        background: 'repeating-linear-gradient(-45deg,transparent,transparent 3px,rgba(251,191,36,0.06) 3px,rgba(251,191,36,0.06) 6px)',
        border: '1px dashed rgba(251,191,36,0.22)',
        display: 'flex', alignItems: 'center', paddingLeft: 5,
      }}>
        <span style={{ fontSize: 8, color: 'rgba(251,191,36,0.5)', fontStyle: 'italic' }}>—</span>
      </div>
    </div>
  )
}
