import { useState, useCallback } from 'react'

// --- CUSTOM HOOK: Toast ---
export function useToast() {
  const [toast, setToast] = useState('')
  const showToast = useCallback((msg) => {
    setToast(msg)
    const t = setTimeout(() => setToast(''), 3000)
    return () => clearTimeout(t)
  }, [])
  return { toast, showToast }
}

// --- SHARED MODAL ---
export function CommonModal({ isOpen, onClose, title, children, footer, maxWidth = 520 }) {
  if (!isOpen) return null
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">{title}</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  )
}

// --- SHARED EMPTY STATE ---
export function EmptyState({ loading, label = 'No data available', height = 180 }) {
  return (
    <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', fontSize: 13, fontStyle: 'italic', textAlign: 'center', padding: '0 16px' }}>
      {loading ? 'Loading…' : label}
    </div>
  )
}

// --- SHARED KPI CARD ---
export function KPICard({ label, value, sub, subColor, icon, bg = '#EFF6FF', iconBg = '#2563EB', trend, trendLabel, color }) {
  const finalColor = color || iconBg
  return (
    <div className="card" style={{ padding: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
      <div style={{ width: 48, height: 48, borderRadius: 12, background: iconBg || `${finalColor}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {icon}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 2 }}>{label}</div>
          {trendLabel && (
            <span style={{ fontSize: 12, fontWeight: 600, color: trend > 0 ? '#16A34A' : trend < 0 ? '#EF4444' : 'var(--muted)' }}>
              {trendLabel}
            </span>
          )}
        </div>
        <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--text)', lineHeight: 1.1 }}>{value}</div>
        {sub && <div style={{ fontSize: 11, color: subColor || 'var(--muted)', marginTop: 4 }}>{sub}</div>}
      </div>
    </div>
  )
}

// --- FORM CONTROLS ---
export function FormField({ label, name, value, onChange, error, type = 'text', required = false, ...rest }) {
  return (
    <div className="form-group">
      {label && <label className="form-label">{label}{required && ' *'}</label>}
      <input
        className="form-input"
        type={type}
        name={name}
        value={value ?? ''}
        style={{ border: error ? '1px solid #DC2626' : undefined }}
        onChange={onChange}
        {...rest}
      />
      {error && <div style={{ color: '#DC2626', fontSize: 12, marginTop: 4, fontWeight: 500 }}>{error}</div>}
    </div>
  )
}

export function SelectField({ label, name, value, onChange, options = [], error, required = false }) {
  return (
    <div className="form-group">
      {label && <label className="form-label">{label}{required && ' *'}</label>}
      <select className="form-select" name={name} value={value ?? ''} onChange={onChange} style={{ border: error ? '1px solid #DC2626' : undefined }}>
        {options.map((opt) => {
          const val = typeof opt === 'object' ? opt.value : opt
          const lbl = typeof opt === 'object' ? opt.label : opt
          return <option key={val} value={val}>{lbl || '— select —'}</option>
        })}
      </select>
      {error && <div style={{ color: '#DC2626', fontSize: 12, marginTop: 4, fontWeight: 500 }}>{error}</div>}
    </div>
  )
}