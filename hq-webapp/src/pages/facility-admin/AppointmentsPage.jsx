import { useState, useEffect, useCallback } from 'react'
import api, { clinicsApi, appointmentsApi } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import styles from './facility-admin.module.css'

const STATUS_BADGE = {
  pending:'badge-warn', confirmed:'badge-blue', arrived:'badge-green',
  serving:'badge-blue', completed:'badge-green', no_show:'badge-red',
  cancelled:'badge-red', rescheduled:'badge-gray', late:'badge-orange',
}
const PATIENT_TYPES = ['Regular','Senior Citizen','PWD','Pregnant','Priority']

export default function AppointmentsPage() {
  const { user }   = useAuth()
  const [appts,    setAppts]    = useState([])
  const [services, setServices] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [tab,      setTab]      = useState('today')  // 'today' | 'all'
  const [search,   setSearch]   = useState('')
  const [statusFilter, setStatus] = useState('All')
  const [modal,    setModal]    = useState(null)
  const [selected, setSelected] = useState(null)
  const [toast,    setToast]    = useState('')
  const [saving,   setSaving]   = useState(false)

  const clinicId  = user?.clinicId
  const showToast = (m) => { setToast(m); setTimeout(() => setToast(''), 3000) }

  const load = useCallback(() => {
    if (!clinicId) { setLoading(false); return }
    setLoading(true)
    const apptReq = tab === 'today'
      ? api.get('/api/appointments/today', { params: { clinicId } })
      : api.get('/api/appointments', { params: { clinicId } })
    Promise.all([
      apptReq,
      clinicsApi.get(clinicId),
    ]).then(([ar, cr]) => {
      setAppts(ar.data || [])
      setServices((cr.data?.services || []).filter(s => s.isAvailable))
    }).catch(() => {})
    .finally(() => setLoading(false))
  }, [clinicId, tab])

  useEffect(load, [load])

  const updateStatus = async (id, status) => {
    try {
      await api.put(`/api/appointments/${id}/status`, { status })
      showToast(`Status updated to ${status}`)
      load()
    } catch { showToast('Failed to update status') }
  }

  const cancelAppt = async (id) => {
    if (!confirm('Cancel this appointment?')) return
    try {
      await api.put(`/api/appointments/${id}/cancel`)
      showToast('Appointment cancelled')
      load()
    } catch { showToast('Failed to cancel') }
  }

  const filtered = appts.filter(a => {
    const matchStatus = statusFilter === 'All' || a.status === statusFilter
    const matchSearch = !search ||
      a.patientName?.toLowerCase().includes(search.toLowerCase()) ||
      a.serviceName?.toLowerCase().includes(search.toLowerCase())
    return matchStatus && matchSearch
  })

  const statuses = ['pending','confirmed','arrived','serving','completed','no_show','cancelled','rescheduled']

  return (
    <div className={styles.page}>
      {toast && <div className={styles.toast}>{toast}</div>}

      {/* Tabs */}
      <div className={styles.header}>
        <div style={{ display:'flex', gap:0, background:'var(--bg-2)', borderRadius:8, padding:3 }}>
          {['today','all'].map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={tab === t ? 'btn btn-primary' : 'btn btn-outline'}
              style={{ fontSize:13, borderRadius:6 }}>
              {t === 'today' ? "Today's Appointments" : 'All Appointments'}
            </button>
          ))}
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button className="btn btn-outline" onClick={load}>Refresh</button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display:'flex', gap:8, marginBottom:12 }}>
        <input className="form-input" style={{ width:240 }} placeholder="Search patient or service…"
          value={search} onChange={e => setSearch(e.target.value)} />
        <select className="form-select" style={{ width:160 }} value={statusFilter} onChange={e => setStatus(e.target.value)}>
          <option value="All">All Status</option>
          {statuses.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="card" style={{ padding:0, overflow:'hidden' }}>
        {loading
          ? <div style={{ padding:40, textAlign:'center', color:'var(--muted)' }}>Loading appointments…</div>
          : filtered.length === 0
            ? <div style={{ padding:40, textAlign:'center', color:'var(--muted)' }}>No appointments found.</div>
            : <table className="table">
                <thead>
                  <tr>
                    <th>Patient</th><th>Service</th><th>Date & Time</th>
                    <th>Type</th><th>Status</th><th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(a => (
                    <tr key={a._id}>
                      <td>
                        <div><strong>{a.patientName || '—'}</strong></div>
                        <div style={{ fontSize:11, color:'var(--muted)' }}>{a.patientPhone}</div>
                      </td>
                      <td>{a.serviceName || '—'}</td>
                      <td style={{ fontSize:12 }}>
                        <div>{a.appointmentDate ? new Date(a.appointmentDate).toLocaleDateString('en-PH') : '—'}</div>
                        <div style={{ color:'var(--muted)' }}>{a.timeSlot}</div>
                      </td>
                      <td>
                        <span className={`badge ${a.patientType === 'Regular' ? 'badge-blue' : 'badge-red'}`}>
                          {a.patientType || 'Regular'}
                        </span>
                      </td>
                      <td><span className={`badge ${STATUS_BADGE[a.status] || 'badge-gray'}`}>{a.status}</span></td>
                      <td>
                        <div style={{ display:'flex', gap:4 }}>
                          {a.status === 'pending' && (
                            <button className="btn btn-outline" style={{ fontSize:11, padding:'3px 8px' }}
                              onClick={() => updateStatus(a._id, 'confirmed')}>Confirm</button>
                          )}
                          {a.status === 'confirmed' && (
                            <button className="btn btn-outline" style={{ fontSize:11, padding:'3px 8px' }}
                              onClick={() => updateStatus(a._id, 'arrived')}>Arrived</button>
                          )}
                          {a.status === 'arrived' && (
                            <button className="btn btn-outline" style={{ fontSize:11, padding:'3px 8px' }}
                              onClick={() => updateStatus(a._id, 'serving')}>Serve</button>
                          )}
                          {a.status === 'serving' && (
                            <button className="btn btn-outline" style={{ fontSize:11, padding:'3px 8px', color:'var(--success)' }}
                              onClick={() => updateStatus(a._id, 'completed')}>Complete</button>
                          )}
                          {!['completed','cancelled'].includes(a.status) && (
                            <button className="btn" style={{ fontSize:11, padding:'3px 8px', color:'var(--error)', background:'var(--error-lt)', border:'none' }}
                              onClick={() => cancelAppt(a._id)}>Cancel</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
        }
      </div>
    </div>
  )
}
