import { useState, useEffect } from 'react'
import api from '../../services/api'
import styles from './super-admin.module.css'

const GROUP_LABELS = { General:'General Settings', Queue:'Queue Settings', Chatbot:'Chatbot Settings' }
const VALUE_TYPES  = { boolean: 'toggle', number: 'number', string: 'text' }

export default function SystemConfigPage() {
  const [configs,  setConfigs]  = useState([])
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)
  const [toast,    setToast]    = useState('')
  const [edits,    setEdits]    = useState({})  // key -> new value

  const showToast = (m) => { setToast(m); setTimeout(() => setToast(''), 3000) }

  const load = () => {
    setLoading(true)
    api.get('/api/config')
      .then(r => {
        const data = r.data || []
        setConfigs(data)
        // seed edits with current values
        const e = {}
        data.forEach(c => { e[c.key] = c.value })
        setEdits(e)
      })
      .catch(() => showToast('Failed to load system config'))
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  const save = async (cfg) => {
    setSaving(true)
    try {
      await api.put(`/api/config/${cfg._id}`, { value: edits[cfg.key] })
      showToast(`"${cfg.label || cfg.key}" updated`)
      load()
    } catch { showToast('Failed to save config') }
    finally { setSaving(false) }
  }

  const groups = [...new Set(configs.map(c => c.group || 'General'))]

  const renderInput = (cfg) => {
    const val = edits[cfg.key]
    const isBoolean = typeof cfg.value === 'boolean'
    const isNumber  = typeof cfg.value === 'number'
    if (isBoolean) {
      return (
        <label style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer' }}>
          <input type="checkbox" checked={!!val}
            onChange={e => setEdits(p => ({ ...p, [cfg.key]: e.target.checked }))} />
          <span style={{ fontSize:13, color:'var(--text-2)' }}>{val ? 'Enabled' : 'Disabled'}</span>
        </label>
      )
    }
    if (isNumber) {
      return (
        <input className="form-input" type="number" style={{ width:120 }} value={val ?? ''}
          onChange={e => setEdits(p => ({ ...p, [cfg.key]: Number(e.target.value) }))} />
      )
    }
    return (
      <input className="form-input" type="text" style={{ width:240 }} value={val ?? ''}
        onChange={e => setEdits(p => ({ ...p, [cfg.key]: e.target.value }))} />
    )
  }

  return (
    <div className={styles.page}>
      {toast && <div className={styles.toast}>{toast}</div>}

      <div className={styles.header}>
        <div>
          <div className={styles.title}>System Configuration</div>
          <div className={styles.sub}>Manage platform-wide settings</div>
        </div>
        <button className="btn btn-outline" onClick={load}>Refresh</button>
      </div>

      {loading
        ? <div style={{ padding:40, textAlign:'center', color:'var(--muted)' }}>Loading config…</div>
        : configs.length === 0
          ? <div style={{ padding:40, textAlign:'center', color:'var(--muted)' }}>No configuration entries found.</div>
          : groups.map(group => (
              <div key={group} className="card" style={{ padding:20, marginBottom:16 }}>
                <div style={{ fontWeight:700, color:'var(--text)', fontSize:14, marginBottom:16, paddingBottom:10, borderBottom:'1px solid var(--border-lt)' }}>
                  {GROUP_LABELS[group] || group}
                </div>
                {configs.filter(c => (c.group || 'General') === group).map(cfg => (
                  <div key={cfg._id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 0', borderBottom:'1px solid var(--border-lt)' }}>
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:600, color:'var(--text)', fontSize:13 }}>{cfg.label || cfg.key}</div>
                      {cfg.description && <div style={{ fontSize:12, color:'var(--muted)', marginTop:2 }}>{cfg.description}</div>}
                      <div style={{ fontSize:11, color:'var(--muted)', marginTop:2, fontFamily:'monospace' }}>key: {cfg.key}</div>
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      {renderInput(cfg)}
                      <button className="btn btn-primary" style={{ fontSize:12, padding:'5px 12px' }}
                        onClick={() => save(cfg)} disabled={saving}>
                        Save
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ))
      }
    </div>
  )
}
