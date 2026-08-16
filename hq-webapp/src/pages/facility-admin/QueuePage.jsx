import { useState, useEffect, useCallback, useMemo } from 'react'
import api, { clinicsApi } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import { useToast, CommonModal, FormField, SelectField, KPICard } from '../../components/ui/CommonModal'
import Modal from '../../components/ui/Modal'
import styles from './facility-admin.module.css'

const STATUS_BADGES = {
  waiting: 'badge-warn', serving: 'badge-blue', done: 'badge-green',
  completed: 'badge-green', skipped: 'badge-gray', no_show: 'badge-red',
  cancelled: 'badge-red', pending: 'badge-warn', confirmed: 'badge-blue',
  arrived: 'badge-green', rescheduled: 'badge-gray',
}
const PATIENT_TYPES = ['Regular', 'Senior Citizen', 'PWD', 'Pregnant', 'Priority']
const APPT_STATUSES = ['pending', 'confirmed', 'arrived', 'serving', 'completed', 'no_show', 'cancelled', 'rescheduled']
const EMPTY_WALKIN = { patientName: '', phone: '', serviceName: '', patientType: 'Regular', errors: {} }

export default function QueueAndAppointmentsPage() {
  const { user } = useAuth()
  const { toast, showToast } = useToast()
  const [tab, setTab] = useState('queue')

  // Queue state
  const [queue, setQueue] = useState([])
  const [metrics, setMetrics] = useState(null)
  const [services, setServices] = useState([])
  const [qLoading, setQLoading] = useState(true)
  const [qSearch, setQSearch] = useState('')
  const [qStatus, setQStatus] = useState('All')
  const [walkinModal, setWalkinModal] = useState(false)
  const [walkinForm, setWalkinForm] = useState(EMPTY_WALKIN)
  const [wSaving, setWSaving] = useState(false)

  // Appointments state
  const [appts, setAppts] = useState([])
  const [aLoading, setALoading] = useState(true)
  const [aSearch, setASearch] = useState('')
  const [aStatus, setAStatus] = useState('All')
  const [aTab, setATab] = useState('today')

  const clinicId = user?.clinicId

// ── Load queue ──
const loadQueue = useCallback(() => {
  if (!clinicId) { setQLoading(false); return }
  setQLoading(true)
  Promise.all([
    api.get('/api/queues', { params: { clinicId } }),
    api.get('/api/queues/metrics', { params: { clinicId } }).catch(() => ({ data: null })),
    clinicsApi.get(clinicId),
  ]).then(([qr, mr, cr]) => {
    // Unnest response to ensure it's always an array
    const rawQueue = qr.data?.data || qr.data?.queue || qr.data || []
    setQueue(Array.isArray(rawQueue) ? rawQueue : [])

    setMetrics(mr.data?.data || mr.data || null)
    setServices((cr.data?.services || cr.data?.data?.services || []).filter(s => s.isAvailable))
  }).catch(() => {
    setQueue([])
  }).finally(() => setQLoading(false))
}, [clinicId])

// ── Load appointments ──
const loadAppts = useCallback(() => {
  if (!clinicId) { setALoading(false); return }
  setALoading(true)
  const url = aTab === 'today' ? '/api/appointments/today' : '/api/appointments'
  api.get(url, { params: { clinicId } })
    .then(r => {
      const rawAppts = r.data?.data || r.data?.appointments || r.data || []
      setAppts(Array.isArray(rawAppts) ? rawAppts : [])
    })
    .catch(() => setAppts([]))
    .finally(() => setALoading(false))
}, [clinicId, aTab])

  useEffect(() => { loadQueue(); loadAppts() }, [loadQueue, loadAppts])

  const handleWalkinChange = (e) => {
    const { name, value } = e.target
    setWalkinForm((p) => ({ ...p, [name]: value, errors: { ...p.errors, [name]: '' } }))
  }

  const addWalkin = async () => {
    const errors = {}
    if (!walkinForm.patientName.trim()) errors.patientName = 'Patient name is required'
    if (!walkinForm.serviceName.trim()) errors.serviceName = 'Service is required'

    if (Object.keys(errors).length > 0) {
      setWalkinForm((f) => ({ ...f, errors }))
      return
    }
    setWSaving(true)
    try {
      await api.post('/api/queues/add-walkin', { ...walkinForm, clinicId })
      showToast('Walk-in patient added')
      setWalkinModal(false)
      setWalkinForm(EMPTY_WALKIN)
      loadQueue()
    } catch (e) {
      showToast(e?.response?.data?.message || 'Failed to add walk-in')
    } finally {
      setWSaving(false)
    }
  }

  const filteredQ = useMemo(() => {
    const q = qSearch.trim().toLowerCase()
    return queue.filter((item) => {
      const ms = qStatus === 'All' || item.status === qStatus
      const mq = !q || item.patientName?.toLowerCase().includes(q) || item.queueNumber?.toLowerCase().includes(q)
      return ms && mq
    })
  }, [queue, qSearch, qStatus])

  const filteredA = useMemo(() => {
    const q = aSearch.trim().toLowerCase()
    return appts.filter((item) => {
      const ms = aStatus === 'All' || item.status === aStatus
      const mq = !q || item.patientName?.toLowerCase().includes(q) || item.serviceName?.toLowerCase().includes(q)
      return ms && mq
    })
  }, [appts, aSearch, aStatus])

  return (
    <div className={styles.page}>
      {toast && <div className={styles.toast}>{toast}</div>}

      <div className={styles.header}>
        <div>
          <div className={styles.title}>Queue & Appointment Management</div>
          <div className={styles.sub}>Manage walk-ins and scheduled appointments</div>
        </div>
        {tab === 'queue' && <button className="btn btn-primary" onClick={() => setWalkinModal(true)}>+ Add Walk-in</button>}
      </div>

      <div style={{ display: 'flex', gap: 0, background: 'var(--bg-2)', borderRadius: 10, padding: 4, width: 'fit-content', marginBottom: 16 }}>
        <button
          onClick={() => setTab('queue')}
          style={{
            padding: '8px 20px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13,
            background: tab === 'queue' ? 'var(--primary)' : 'transparent',
            color: tab === 'queue' ? '#fff' : 'var(--text-2)',
          }}
        >
          Queue Management
        </button>
        <button
          onClick={() => setTab('appointments')}
          style={{
            padding: '8px 20px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13,
            background: tab === 'appointments' ? 'var(--primary)' : 'transparent',
            color: tab === 'appointments' ? '#fff' : 'var(--text-2)',
          }}
        >
          Appointment Management
        </button>
      </div>

      {tab === 'queue' ? (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
            <KPICard label="Waiting" value={qLoading ? '…' : queue.filter((q) => q.status === 'waiting').length} color="#D97706" />
            <KPICard label="Being Served" value={qLoading ? '…' : queue.filter((q) => q.status === 'serving').length} color="#2563EB" />
            <KPICard label="Completed" value={qLoading ? '…' : queue.filter((q) => ['done', 'completed'].includes(q.status)).length} color="#16A34A" />
            <KPICard label="Avg Wait" value={qLoading ? '…' : `${metrics?.avgWait ?? 0} min`} color="#7C3AED" />
          </div>

          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <input className="form-input" style={{ flex: 1, maxWidth: 260 }} placeholder="Search patient or queue #…" value={qSearch} onChange={(e) => setQSearch(e.target.value)} />
            <select className="form-select" style={{ width: 140 }} value={qStatus} onChange={(e) => setQStatus(e.target.value)}>
              {['All', 'waiting', 'serving', 'done', 'completed', 'cancelled', 'no_show'].map((s) => <option key={s} value={s}>{s === 'All' ? 'All Status' : s}</option>)}
            </select>
            <button className="btn btn-outline" onClick={loadQueue}>Refresh</button>
          </div>

          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {qLoading ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>Loading queue…</div>
            ) : filteredQ.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>{queue.length === 0 ? 'No queue entries today.' : 'No results match your filter.'}</div>
            ) : (
              <table className="table">
                <thead><tr><th>Queue #</th><th>Patient</th><th>Service</th><th>Type</th><th>Joined</th><th>Status</th></tr></thead>
                <tbody>
                  {filteredQ.map((q) => (
                    <tr key={q._id}>
                      <td><strong>{q.queueNumber}</strong></td>
                      <td>
                        <div>{q.patientName || '—'}</div>
                        {q.patientPhone && <div style={{ fontSize: 11, color: 'var(--muted)' }}>{q.patientPhone}</div>}
                      </td>
                      <td>{q.serviceName || '—'}</td>
                      <td><span className={`badge ${q.queueType === 'Priority' ? 'badge-red' : 'badge-blue'}`}>{q.queueType || 'Regular'}</span></td>
                      <td style={{ fontSize: 12 }}>{q.joinedAt ? new Date(q.joinedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                      <td><span className={`badge ${STATUS_BADGES[q.status] || 'badge-gray'}`}>{q.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
            <KPICard label="Total Today" value={aLoading ? '…' : appts.length} color="#2563EB" />
            <KPICard label="Pending" value={aLoading ? '…' : appts.filter((a) => a.status === 'pending').length} color="#D97706" />
            <KPICard label="Confirmed" value={aLoading ? '…' : appts.filter((a) => a.status === 'confirmed').length} color="#16A34A" />
            <KPICard label="Completed" value={aLoading ? '…' : appts.filter((a) => a.status === 'completed').length} color="#7C3AED" />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ display: 'flex', gap: 0, background: 'var(--bg-2)', borderRadius: 8, padding: 3 }}>
              {['today', 'all'].map((t) => (
                <button
                  key={t}
                  onClick={() => setATab(t)}
                  style={{
                    padding: '6px 16px', borderRadius: 6, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 12,
                    background: aTab === t ? 'var(--primary)' : 'transparent',
                    color: aTab === t ? '#fff' : 'var(--text-2)',
                  }}
                >
                  {t === 'today' ? "Today's" : 'All Appointments'}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input className="form-input" style={{ width: 220 }} placeholder="Search patient or service…" value={aSearch} onChange={(e) => setASearch(e.target.value)} />
              <select className="form-select" style={{ width: 150 }} value={aStatus} onChange={(e) => setAStatus(e.target.value)}>
                <option value="All">All Status</option>
                {APPT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <button className="btn btn-outline" onClick={loadAppts}>Refresh</button>
            </div>
          </div>

          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {aLoading ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>Loading appointments…</div>
            ) : filteredA.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>No appointments found.</div>
            ) : (
              <table className="table">
                <thead><tr><th>Patient</th><th>Service</th><th>Date & Time</th><th>Type</th><th>Status</th></tr></thead>
                <tbody>
                  {filteredA.map((a) => (
                    <tr key={a._id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{a.patientName || '—'}</div>
                        <div style={{ fontSize: 11, color: 'var(--muted)' }}>{a.patientPhone}</div>
                      </td>
                      <td>{a.serviceName || '—'}</td>
                      <td style={{ fontSize: 12 }}>
                        <div>{a.appointmentDate ? new Date(a.appointmentDate).toLocaleDateString('en-PH') : '—'}</div>
                        <div style={{ color: 'var(--muted)' }}>{a.timeSlot}</div>
                      </td>
                      <td><span className={`badge ${a.patientType === 'Regular' ? 'badge-blue' : 'badge-red'}`}>{a.patientType || 'Regular'}</span></td>
                      <td><span className={`badge ${STATUS_BADGES[a.status] || 'badge-gray'}`}>{a.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* Walk-in Modal */}
      <Modal
        isOpen={walkinModal}
        onClose={() => { setWalkinModal(false); setWalkinForm(EMPTY_WALKIN) }}
        title="Add Walk-in Patient"
        maxWidth={420}
        footer={
          <>
            <button className="btn btn-outline" onClick={() => { setWalkinModal(false); setWalkinForm(EMPTY_WALKIN) }}>Cancel</button>
            <button className="btn btn-primary" onClick={addWalkin} disabled={wSaving}>
              {wSaving ? 'Adding…' : 'Add to Queue'}
            </button>
          </>
        }
      >
        <FormField label="Patient Name" name="patientName" value={walkinForm.patientName} onChange={handleWalkinChange} error={walkinForm.errors?.patientName} required />
        <FormField label="Phone" name="phone" value={walkinForm.phone} onChange={handleWalkinChange} placeholder="+63 9XX XXX XXXX" />
        <SelectField
          label="Service"
          name="serviceName"
          value={walkinForm.serviceName}
          onChange={handleWalkinChange}
          error={walkinForm.errors?.serviceName}
          required
          options={services.map((s) => ({ value: s.name, label: `${s.name} (${s.durationMinutes} min)` }))}
        />
        <SelectField label="Patient Type" name="patientType" value={walkinForm.patientType} onChange={handleWalkinChange} options={PATIENT_TYPES} />
      </Modal>
    </div>
  )
}