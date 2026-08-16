import { useState, useEffect, useCallback, useMemo } from 'react'
import api from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import { useToast, CommonModal, FormField, SelectField } from '../../components/ui/CommonModal'
import styles from './facility-admin.module.css'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

const TIME_OPTIONS = (() => {
  const opts = []
  for (let h = 7; h <= 17; h++) {
    ['00', '30'].forEach((m) => {
      const label = `${h > 12 ? h - 12 : h}:${m} ${h >= 12 ? 'PM' : 'AM'}`
      opts.push({ value: `${String(h).padStart(2, '0')}:${m}`, label })
    })
  }
  return opts
})()

const EMPTY_SCHEDULE = { serviceName: '', dayOfWeek: 0, startTime: '08:00', endTime: '09:00', maxPatients: 1 }

export default function SchedulePage() {
  const { user } = useAuth()
  const { toast, showToast } = useToast()
  const [slots, setSlots] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY_SCHEDULE)

  const clinicId = user?.clinicId

  const loadSlots = useCallback(async () => {
    if (!clinicId) return setLoading(false)
    setLoading(true)
    try {
      const res = await api.get(`/api/appointments/timeslots?clinicId=${clinicId}`)
      setSlots(res.data || [])
    } catch {
      setSlots([])
      showToast('Failed to load time slots')
    } finally {
      setLoading(false)
    }
  }, [clinicId, showToast])

  useEffect(() => { loadSlots() }, [loadSlots])

  const openAdd = () => {
    setEditing(null)
    setForm(EMPTY_SCHEDULE)
    setShowModal(true)
  }

  const openEdit = (s) => {
    setEditing(s)
    setForm({
      serviceName: s.serviceName,
      dayOfWeek: s.dayOfWeek ?? 0,
      startTime: s.startTime,
      endTime: s.endTime,
      maxPatients: s.maxPatients,
    })
    setShowModal(true)
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setForm((f) => ({ ...f, [name]: name === 'dayOfWeek' || name === 'maxPatients' ? Number(value) : value }))
  }

  const saveSlot = async () => {
    try {
      if (editing) {
        await api.put(`/api/appointments/timeslots/${editing._id}`, form)
      } else {
        await api.post('/api/appointments/timeslots', { ...form, clinicId })
      }
      showToast(editing ? 'Time slot updated' : 'Time slot created')
      setShowModal(false)
      loadSlots()
    } catch (e) {
      showToast(e.response?.data?.message || 'Failed to save')
    }
  }

  const removeSlot = async (id) => {
    if (!window.confirm('Remove this time slot?')) return
    try {
      await api.delete(`/api/appointments/timeslots/${id}`)
      showToast('Time slot removed')
      loadSlots()
    } catch {
      showToast('Failed to remove slot')
    }
  }

  const byDay = useMemo(() => {
    return DAYS.reduce((acc, _, i) => {
      acc[i] = slots.filter((s) => s.dayOfWeek === i)
      return acc
    }, {})
  }, [slots])

  return (
    <div className={styles.page}>
      {toast && <div className={styles.toast}>{toast}</div>}

      <div className={styles.header}>
        <div>
          <div className={styles.title}>Schedule & Time Slots</div>
          <div className={styles.sub}>Manage appointment time slots for each day of the week</div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={openAdd}>+ Add Time Slot</button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 48, color: 'var(--muted)' }}>Loading schedule…</div>
      ) : (
        <div className={styles.grid}>
          {DAYS.map((day, i) => (
            <div key={day} className={`card ${styles.dayCard}`}>
              <div className={styles.dayTitle}>{day}</div>
              {byDay[i]?.length === 0 ? (
                <div className={styles.empty}>No slots</div>
              ) : (
                byDay[i]?.map((s) => (
                  <div key={s._id} className={styles.slotItem}>
                    <div className={styles.slotTime}>{s.label || s.startTime} – {s.endTime}</div>
                    <div className={styles.slotService}>{s.serviceName}</div>
                    <div className={styles.slotMeta}>Max: {s.maxPatients} patients</div>
                    <div className={styles.slotActions}>
                      <button className="btn btn-icon btn-outline" onClick={() => openEdit(s)} title="Edit">✎</button>
                      <button className="btn btn-icon" style={{ background: 'var(--error-lt)', color: 'var(--error)' }} onClick={() => removeSlot(s._id)} title="Delete">✕</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editing ? 'Edit Time Slot' : 'Add Time Slot'}
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={saveSlot}>{editing ? 'Save Changes' : 'Create Slot'}</button>
          </>
        }
      >
        <FormField label="Service Name" name="serviceName" value={form.serviceName} onChange={handleInputChange} placeholder="e.g. General Consultation" />
        <SelectField label="Day of Week" name="dayOfWeek" value={form.dayOfWeek} onChange={handleInputChange} options={DAYS.map((d, i) => ({ value: i, label: d }))} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <SelectField label="Start Time" name="startTime" value={form.startTime} onChange={handleInputChange} options={TIME_OPTIONS} />
          <SelectField label="End Time" name="endTime" value={form.endTime} onChange={handleInputChange} options={TIME_OPTIONS} />
        </div>
        <FormField label="Max Patients per Slot" name="maxPatients" type="number" min="1" max="50" value={form.maxPatients} onChange={handleInputChange} />
      </Modal>
    </div>
  )
}