import React, { useState, useEffect } from 'react'
import { Moon, Sun, Radio, Globe, User, Settings, Bell } from 'lucide-react'

function useUTCClock() {
  const [time, setTime] = useState(new Date())
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  return time
}

export default function TopBar({ vesselCount, aisConnected, theme, toggleTheme }) {
  const now = useUTCClock()
  const hh = String(now.getUTCHours()).padStart(2, '0')
  const mm = String(now.getUTCMinutes()).padStart(2, '0')
  const ss = String(now.getUTCSeconds()).padStart(2, '0')
  const isDark = theme === 'night'

  const c = {
    bg: isDark ? 'rgba(12,13,16,0.92)' : 'rgba(255,255,255,0.92)',
    border: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)',
    text: isDark ? '#f1f5f9' : '#0f172a',
    muted: isDark ? '#64748b' : '#94a3b8',
    dim: isDark ? '#334155' : '#cbd5e1',
    chipBg: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
    chipBdr: isDark ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.09)',
  }

  return (
    <div style={{
      height: 46, display: 'flex', alignItems: 'center',
      justifyContent: 'space-between', padding: '0 14px',
      background: c.bg, backdropFilter: 'blur(14px)',
      WebkitBackdropFilter: 'blur(14px)',
      borderBottom: `1px solid ${c.border}`,
      flexShrink: 0, zIndex: 500, position: 'relative',
    }}>

      {/* Brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <img src="/logo.png" alt="SAGARKHOJ Logo" style={{ width: 28, height: 28, objectFit: 'contain', filter: isDark ? 'drop-shadow(0 0 8px rgba(255,255,255,0.2))' : 'drop-shadow(0 0 8px rgba(0,0,0,0.1))' }} />
        <p style={{
          fontSize: 16, fontWeight: 800, color: c.text,
          letterSpacing: '-0.02em', lineHeight: 1,
          fontFamily: 'Inter, sans-serif',
        }}>
          SAGARKHOJ
        </p>
      </div>

      {/* Center chips */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <Chip c={c} icon={<Radio size={9} color={c.muted} />}>
          <span style={{
            width: 5, height: 5, borderRadius: '50%', display: 'inline-block',
            background: aisConnected ? '#4ade80' : '#f87171',
            animation: aisConnected ? 'blink 1.8s ease-in-out infinite' : 'none',
            marginRight: 4,
          }} />
          AIS {aisConnected ? `· ${vesselCount} vessels` : '· Connecting…'}
        </Chip>
      </div>

      {/* Right: clock + toggle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{
          fontFamily: 'JetBrains Mono, monospace', fontSize: 12,
          color: c.muted, letterSpacing: '0.02em',
        }}>
          {hh}:{mm}:{ss}
          <span style={{ fontSize: 9, color: c.dim, marginLeft: 4, letterSpacing: '0.06em' }}>UTC</span>
        </span>

        <div style={{ width: 1, height: 16, background: c.border }} />

        {/* Night / Day toggle */}
        <div
          className="theme-toggle"
          onClick={toggleTheme}
          role="button"
          aria-label="Toggle theme"
          style={{ pointerEvents: 'all' }}
        >
          <div className={`theme-toggle-option ${theme === 'night' ? 'active' : ''}`}>
            <Moon size={10} /> Night
          </div>
          <div className={`theme-toggle-option ${theme === 'day' ? 'active' : ''}`}>
            <Sun size={10} /> Day
          </div>
        </div>

        <div style={{ width: 1, height: 16, background: c.border }} />

        {/* User / Settings / Notifications */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 2, display: 'flex' }}>
            <Bell size={13} color={c.muted} />
          </button>
          <button style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 2, display: 'flex' }}>
            <Settings size={13} color={c.muted} />
          </button>
          <button style={{ 
            background: 'transparent', border: `1px solid ${c.border}`, borderRadius: 14, 
            cursor: 'pointer', padding: '2px 8px', display: 'flex', alignItems: 'center', gap: 6,
            fontSize: 10, fontWeight: 600, color: c.text 
          }}>
            <User size={11} color={c.muted} />
            User
          </button>
        </div>
      </div>
    </div>
  )
}

function Chip({ c, icon, children }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 5,
      padding: '3px 9px', borderRadius: 14,
      background: c.chipBg, border: `1px solid ${c.chipBdr}`,
      fontSize: 10, color: c.muted, fontWeight: 500,
      whiteSpace: 'nowrap',
    }}>
      {icon}
      {children}
    </div>
  )
}
