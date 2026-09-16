import React from 'react'
import { X, Map, Search, Image as ImageIcon, History } from 'lucide-react'

export default function MapSettingsPanel({ onClose, theme, vesselFilter, setVesselFilter }) {
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

  const Section = ({ title, icon: Icon, imageSrc }) => (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12, padding: 16, background: c.card, borderRadius: 12, border: `1px solid ${c.border}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Icon size={16} color="var(--accent)" />
        <span style={{ fontSize: 13, fontWeight: 700, color: c.text, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{title}</span>
      </div>
      <div style={{ flex: 1, borderRadius: 8, overflow: 'hidden', border: `1px solid ${c.border}`, background: '#000', position: 'relative' }}>
        <img src={imageSrc} alt={title} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.85 }} />
      </div>
    </div>
  )

  return (
    <div data-theme={theme} style={panelStyle}>
      {/* Header */}
      <div style={{ padding: '20px 24px', borderBottom: `1px solid ${c.border}`, position: 'relative', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: 20, right: 24,
            width: 32, height: 32, borderRadius: '50%',
            background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', transition: 'all 0.2s'
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
        >
          <X size={16} />
        </button>
        <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--accent-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Map size={20} color="var(--accent)" />
        </div>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: c.text, margin: 0 }}>Interactive Telemetry Map</h2>
          <p style={{ fontSize: 12, color: c.muted, marginTop: 4 }}>SAR Imagery Analysis Views</p>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: '0 24px', paddingTop: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: c.muted }}>Vessel Filter:</span>
          <select 
            value={vesselFilter} 
            onChange={e => setVesselFilter(e.target.value)}
            style={{
              padding: '6px 12px',
              borderRadius: 6,
              background: 'var(--tag-bg)',
              border: `1px solid ${c.border}`,
              color: c.text,
              fontSize: 12,
              outline: 'none',
              cursor: 'pointer',
              width: 200
            }}
          >
            <option value="All">All Vessel Types</option>
            <option value="Tanker">Tankers Only</option>
            <option value="Cargo">Cargo Only</option>
            <option value="Other">Other Ships</option>
          </select>
        </div>
      </div>

      <div style={{ padding: 24, display: 'flex', gap: 20, flex: 1 }}>
        <Section title="Live Telemetry" icon={Search} imageSrc="/sar_samples/sar_ennore.png" />
        <Section title="Historical Context" icon={History} imageSrc="/sar_samples/sar_mumbai.png" />
        <Section title="Before / After" icon={ImageIcon} imageSrc="/sar_samples/sar_gulf_of_mexico.png" />
      </div>
    </div>
  )
}
