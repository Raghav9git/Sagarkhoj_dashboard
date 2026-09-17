import React from 'react'
import { X, Ship } from 'lucide-react'
import { getFlagFromMMSI } from '../constants'

// Helper to get ship type name
function getShipType(code) {
  if (code >= 70 && code <= 79) return 'Cargo'
  if (code >= 80 && code <= 89) return 'Tanker'
  return 'Other'
}

export default function AisPanel({ onClose, vessels, vesselScores, theme }) {
  const isDark = theme === 'night'
  
  const c = {
    bg:     'var(--bg-panel)',
    card:   'var(--bg-card)',
    border: 'var(--border-subtle)',
    text:   'var(--text-primary)',
    muted:  'var(--text-muted)',
    dim:    'var(--text-dim)',
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
    <div data-theme={theme} style={panelStyle}>
      {/* Header */}
      <div style={{ padding: '16px 20px', borderBottom: `1px solid ${c.border}`, position: 'relative', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: 16, right: 16,
            width: 28, height: 28, borderRadius: '50%',
            background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', transition: 'all 0.2s'
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
        >
          <X size={16} />
        </button>
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--accent-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Ship size={18} color="var(--accent)" />
        </div>
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: c.text, margin: 0 }}>AIS: Vessels in Regional Zone (Active)</h2>
          <p style={{ fontSize: 11, color: c.muted, marginTop: 2 }}>Real-time telemetry for {vessels?.length || 0} ships on map</p>
        </div>
      </div>

      {/* Table */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${c.border}` }}>
              <th style={{ padding: '10px 8px', fontSize: 10, color: c.muted, fontWeight: 700, textTransform: 'uppercase' }}>MMSI</th>
              <th style={{ padding: '10px 8px', fontSize: 10, color: c.muted, fontWeight: 700, textTransform: 'uppercase' }}>Ship Name</th>
              <th style={{ padding: '10px 8px', fontSize: 10, color: c.muted, fontWeight: 700, textTransform: 'uppercase' }}>Flag</th>
              <th style={{ padding: '10px 8px', fontSize: 10, color: c.muted, fontWeight: 700, textTransform: 'uppercase' }}>Type</th>
              <th style={{ padding: '10px 8px', fontSize: 10, color: c.muted, fontWeight: 700, textTransform: 'uppercase' }}>SOG (knots)</th>
              <th style={{ padding: '10px 8px', fontSize: 10, color: c.muted, fontWeight: 700, textTransform: 'uppercase' }}>COG (deg)</th>
              <th style={{ padding: '10px 8px', fontSize: 10, color: c.muted, fontWeight: 700, textTransform: 'uppercase' }}>LAT</th>
              <th style={{ padding: '10px 8px', fontSize: 10, color: c.muted, fontWeight: 700, textTransform: 'uppercase' }}>LON</th>
            </tr>
          </thead>
          <tbody>
            {vessels.map(v => (
              <tr key={v.mmsi} style={{ borderBottom: `1px solid ${c.border}`, transition: 'background 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-card)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <td style={{ padding: '12px 8px', fontSize: 12, color: c.text, fontFamily: 'monospace' }}>{v.mmsi}</td>
                <td style={{ padding: '12px 8px', fontSize: 12, color: c.text, fontWeight: 600 }}>{v.name || 'UNKNOWN'}</td>
                <td style={{ padding: '12px 8px', fontSize: 12 }}>{getFlagFromMMSI(v.mmsi)}</td>
                <td style={{ padding: '12px 8px', fontSize: 12, color: c.muted }}>{getShipType(v.shipType)}</td>
                <td style={{ padding: '12px 8px', fontSize: 12, color: c.text }}>{v.sog?.toFixed(1) || '-'}</td>
                <td style={{ padding: '12px 8px', fontSize: 12, color: c.text }}>{v.cog?.toFixed(0) || '-'}</td>
                <td style={{ padding: '12px 8px', fontSize: 12, color: c.text, fontFamily: 'monospace' }}>{v.lat?.toFixed(5)}</td>
                <td style={{ padding: '12px 8px', fontSize: 12, color: c.text, fontFamily: 'monospace' }}>{v.lon?.toFixed(5)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
