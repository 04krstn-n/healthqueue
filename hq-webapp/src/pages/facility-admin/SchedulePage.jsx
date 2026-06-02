import { useState, useEffect } from 'react'
import api from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import styles from './facility-admin.module.css'

const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']

const timeOptions = []
for (let h = 7; h <= 17; h++) {
  ['00','30'].forEach(m => {
    const label = `${h > 12 ? h - 12 : h}:${m} ${h >= 12 ? 'PM' : 'AM'}`
    timeOptions.push({ value: `${String(h).padStart(2,'0')}:${m}`, label })
  })
}

export default function SchedulePage() {
  const { user } = useAuth()
  const [slots,      setSlots]      = useState([])
  const [loading,    setLoading]    = useState(true)
  const [showModal,  setShowModal]  = useState(false)
  const [editing,    setEditing]    = useState(null)
  const [toast,      setToast]      = useState('')
  const [form, setForm] = useState({
    serviceName: '', dayOfWeek: 0, startTime: '08:00', endTime: '09:00', maxPatients: 1
  })

  const clinicId = user?.clinicId

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  const load = () => {
    if (!clinicId) { setLoading(false); return }
    api.get(`/api/appointments/timeslots?clinicId=${clinicId}`)
      .then(r => setSlots(r.data || []))
      .catch(() => setSlots([]))
      .finally(() => setLoading(false))
  }

  useEffect(load, [clinicId])

  const openAdd = () => {
    setEditing(null)
    setForm({ serviceName: '', dayOfWeek: 0, startTime: '08:00', endTime: '09:00', maxPatients: 1 })
    setShowModal(true)
  }
  const openEdit = (s) => {
    setEditing(s)
    setForm({ serviceName: s.serviceName, dayOfWeek: s.dayOfWeek ?? 0, startTime: s.startTime, endTime: s.endTime, maxPatients: s.maxPatients })
    setShowModal(true)
  }

  const save = async () => {
    try {
      if (editing) await api.put(`/api/appointments/timeslots/${editing._id}`, form)
      else         await api.post('/api/appointments/timeslots', { ...form, clinicId })
      showToast(editing ? 'Time slot updated' : 'Time slot created')
      setShowModal(false)
      load()
    } catch (e) {
      showToast(e.response?.data?.message || 'Failed to save')
    }
  }

  const remove = async (id) => {
    if (!confirm('Remove this time slot?')) return
    await api.delete(`/api/appointments/timeslots/${id}`).catch(() => {})
    showToast('Time slot removed')
    load()
  }

  const byDay = DAYS.reduce((acc, d, i) => {
    acc[i] = slots.filter(s => s.dayOfWeek === i)
    return acc
  }, {})

  return (
    <div className={styles.page}>
      {toast && <div className={styles.toast}>{toast}</div>}

      {/* Header */}
      <div className={styles.header}>
        <div>
          <div className={styles.title}>Schedule & Time Slots</div>
          <div className={styles.sub}>Manage appointment time slots for each day of the week</div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={openAdd}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Time Slot
        </button>
      </div>

      {/* Day columns */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 48, color: 'var(--muted)' }}>Loading schedule…</div>
      ) : (
        <div className={styles.grid}>
          {DAYS.map((day, i) => (
            <div key={day} className={"card " + styles.dayCard}>
              <div className={styles.dayTitle}>{day}</div>
              {byDay[i].length === 0 ? (
                <div className={styles.empty}>No slots</div>
              ) : byDay[i].map(s => (
                <div key={s._id} className={styles.slotItem}>
                  <div className={styles.slotTime}>{s.label || s.startTime} – {s.endTime}</div>
                  <div className={styles.slotService}>{s.serviceName}</div>
                  <div className={styles.slotMeta}>Max: {s.maxPatients} patients</div>
                  <div className={styles.slotActions}>
                    <button className="btn btn-icon btn-outline" onClick={() => openEdit(s)} title="Edit">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button className="btn btn-icon" style={{ background: 'var(--error-lt)', color: 'var(--error)' }} onClick={() => remove(s._id)} title="Delete">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <div className="modal-title">{editing ? 'Edit Time Slot' : 'Add Time Slot'}</div>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Service Name</label>
                <input className="form-input" placeholder="e.g. General Consultation" value={form.serviceName} onChange={e => setForm(f => ({ ...f, serviceName: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Day of Week</label>
                <select className="form-select" value={form.dayOfWeek} onChange={e => setForm(f => ({ ...f, dayOfWeek: Number(e.target.value) }))}>
                  {DAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div className="form-group">
                  <label className="form-label">Start Time</label>
                  <select className="form-select" value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))}>
                    {timeOptions.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">End Time</label>
                  <select className="form-select" value={form.endTime} onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))}>
                    {timeOptions.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Max Patients per Slot</label>
                <input className="form-input" type="number" min="1" max="50" value={form.maxPatients} onChange={e => setForm(f => ({ ...f, maxPatients: Number(e.target.value) }))} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={save}>{editing ? 'Save Changes' : 'Create Slot'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
