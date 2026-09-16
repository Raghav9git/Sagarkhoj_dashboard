import React from 'react'
import { Satellite, Ship, Map, FileText } from 'lucide-react'

export default function Sidebar({ activeTab, setActiveTab, theme }) {
  const isDark = theme === 'night'

  const c = {
    bg: isDark ? 'rgba(12, 13, 16, 0.65)' : 'rgba(255, 255, 255, 0.65)',
    border: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.12)',
    iconColor: isDark ? '#94a3b8' : '#64748b',
    activeIcon: '#3b82f6',
    activeBg: isDark ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.15)'
  }

  const buttons = [
    { id: 'sar', icon: Satellite, tooltip: 'SAR Input' },
    { id: 'ais', icon: Ship, tooltip: 'Vessel Details' },
    { id: 'report', icon: FileText, tooltip: 'Incident Report' }
  ]

  return (
    <div style={{
      position: 'absolute',
      top: '50%',
      left: 20,
      transform: 'translateY(-50%)',
      zIndex: 500,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 20,
      padding: '24px 16px',
      background: c.bg,
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      border: `1px solid ${c.border}`,
      borderRadius: 32,
      boxShadow: '0 12px 40px rgba(0,0,0,0.15)',
      pointerEvents: 'all'
    }}>
      {buttons.map(b => {
        const Icon = b.icon
        const isActive = activeTab === b.id
        return (
          <div key={b.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <button
              onClick={() => setActiveTab(isActive ? null : b.id)}
              title={b.tooltip}
              style={{
                width: 52,
                height: 52,
                borderRadius: 14, // squircle shape as per wireframe
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: isActive ? c.activeBg : c.bg,
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                border: isActive ? `1px solid rgba(59, 130, 246, 0.6)` : `1px solid ${c.border}`,
                boxShadow: '0 4px 14px rgba(0,0,0,0.1)',
                cursor: 'pointer',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                color: isActive ? c.activeIcon : c.iconColor,
                pointerEvents: 'all'
              }}
              onMouseEnter={e => {
                if (!isActive) e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.95)'
              }}
              onMouseLeave={e => {
                if (!isActive) e.currentTarget.style.background = c.bg
              }}
            >
              <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
            </button>
            <span style={{ fontSize: 10, fontWeight: 600, color: c.iconColor, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              {b.id}
            </span>
          </div>
        )
      })}
    </div>
  )
}
