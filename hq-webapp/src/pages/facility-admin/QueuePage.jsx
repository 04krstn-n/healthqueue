import { useState, useEffect, useCallback } from 'react'
import api, { clinicsApi } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import styles from './facility-admin.module.css'

const STATUS_BADGE = {
  waiting:'badge-warn', serving:'badge-blue',
  done:'badge-green', completed:'badge-green',
  skipped:'badge-gray', no_show:'badge-red', cancelled:'badge-red',
  pending:'badge-warn', confirmed:'badge-blue', arrived:'badge-green', rescheduled:'badge-gray',
}
const PATIENT_TYPES = ['Regular','Senior Citizen','PWD','Pregnant','Priority']
const APPT_STATUSES = ['pending','confirmed','arrived','serving','completed','no_show','cancelled','rescheduled']

export default function QueueAndAppointmentsPage() {
  const { user } = useAuth()
  const [tab, setTab] = useState('queue')   // 'queue' | 'appointments'

  // ── Queue state ──
  const [queue,       setQueue]      = useState([])
  const [metrics,     setMetrics]    = useState(null)
  const [services,    setServices]   = useState([])
  const [qLoading,    setQLoading]   = useState(true)
  const [qSearch,     setQSearch]    = useState('')
  const [qStatus,     setQStatus]    = useState('All')
  const [walkinModal, setWalkin]     = useState(false)
  const [walkinForm,  setWalkinForm] = useState({ patientName:'', phone:'', serviceName:'', patientType:'Regular', })
  const [wSaving,     setWSaving]    = useState(false)

  // ── Appointment state ──
  const [appts,    setAppts]   = useState([])
  const [aLoading, setALoading]= useState(true)
  const [aSearch,  setASearch] = useState('')
  const [aStatus,  setAStatus] = useState('All')
  const [aTab,     setATab]    = useState('today')   // 'today' | 'all'

  const [toast,    setToast]   = useState('')
  const clinicId  = user?.clinicId
  const showToast = (m) => { setToast(m); setTimeout(() => setToast(''), 3000) }

  const closeWalkinModal = () => {
  setWalkin(false)
  setWalkinForm({
    patientName: '',
    phone: '',
    serviceName: '',
    patientType: 'Regular',
    errors: {}
  })
}

  // ── Load queue ──
  const loadQueue = useCallback(() => {
    if (!clinicId) { setQLoading(false); return }
    setQLoading(true)
    Promise.all([
      api.get('/api/queues', { params: { clinicId } }),
      api.get('/api/queues/metrics', { params: { clinicId } }).catch(() => ({ data: null })),
      clinicsApi.get(clinicId),
    ]).then(([qr, mr, cr]) => {
      setQueue(qr.data || [])
      setMetrics(mr.data)
      setServices((cr.data?.services || []).filter(s => s.isAvailable))
    }).catch(() => {}).finally(() => setQLoading(false))
  }, [clinicId])

  // ── Load appointments ──
  const loadAppts = useCallback(() => {
    if (!clinicId) { setALoading(false); return }
    setALoading(true)
    const url = aTab === 'today' ? '/api/appointments/today' : '/api/appointments'
    api.get(url, { params: { clinicId } })
      .then(r => setAppts(r.data || []))
      .catch(() => setAppts([]))
      .finally(() => setALoading(false))
  }, [clinicId, aTab])

  useEffect(() => { loadQueue(); loadAppts() }, [loadQueue, loadAppts])

  const addWalkin = async () => {
    const errors = {}
    if (!walkinForm.patientName.trim()) {
      errors.patientName = 'Patient name is required'
    }

    if (!walkinForm.serviceName.trim()) {
      errors.serviceName = 'Service is required'
    }

    if (Object.keys(errors).length > 0) {
      setWalkinForm(f => ({ ...f, errors }))
      return
    }
    setWSaving(true)
    try {
      await api.post('/api/queues/add-walkin', { ...walkinForm, clinicId })
      showToast('Walk-in patient added') 
      closeWalkinModal()
      setWalkinForm({ patientName:'', phone:'', serviceName:'', patientType:'Regular',  errors: {}  })
      loadQueue()
    } catch (e) { showToast(e?.response?.data?.message || 'Failed to add walk-in') }
    finally { setWSaving(false) }
  }


  // ── Filtered data ──
  const filteredQ = queue.filter(q => {
    const ms = qStatus === 'All' || q.status === qStatus
    const mq = !qSearch || q.patientName?.toLowerCase().includes(qSearch.toLowerCase()) || q.queueNumber?.toLowerCase().includes(qSearch.toLowerCase())
    return ms && mq
  })
  const filteredA = appts.filter(a => {
    const ms = aStatus === 'All' || a.status === aStatus
    const mq = !aSearch || a.patientName?.toLowerCase().includes(aSearch.toLowerCase()) || a.serviceName?.toLowerCase().includes(aSearch.toLowerCase())
    return ms && mq
  })

  const waiting   = queue.filter(q => q.status === 'waiting').length
  const serving   = queue.filter(q => q.status === 'serving').length
  const completed = queue.filter(q => ['done','completed'].includes(q.status)).length
  const pendingA  = appts.filter(a => a.status === 'pending').length
  const confirmedA= appts.filter(a => a.status === 'confirmed').length

  return (
    <div className={styles.page}>
      {toast && <div className={styles.toast}>{toast}</div>}

      {/* Page header */}
      <div className={styles.header}>
        <div>
          <div className={styles.title}>Queue & Appointment Management</div>
          <div className={styles.sub}>Manage walk-ins and scheduled appointments</div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          {tab === 'queue'
            ? <button className="btn btn-primary" onClick={() => setWalkin(true)}>+ Add Walk-in</button>
            : null
          }
        </div>
      </div>

      {/* Tab switcher */}
      <div style={{ display:'flex', gap:0, background:'var(--bg-2)', borderRadius:10, padding:4, width:'fit-content', marginBottom:16 }}>
        <button onClick={() => setTab('queue')}
          style={{ padding:'8px 20px', borderRadius:8, border:'none', cursor:'pointer', fontWeight:600, fontSize:13,
            background: tab==='queue' ? 'var(--primary)' : 'transparent',
            color: tab==='queue' ? '#fff' : 'var(--text-2)' }}>
          Queue Management
        </button>
        <button onClick={() => setTab('appointments')}
          style={{ padding:'8px 20px', borderRadius:8, border:'none', cursor:'pointer', fontWeight:600, fontSize:13,
            background: tab==='appointments' ? 'var(--primary)' : 'transparent',
            color: tab==='appointments' ? '#fff' : 'var(--text-2)' }}>
          Appointment Management
        </button>
      </div>

      {/* ── QUEUE TAB ── */}
      {tab === 'queue' && (
        <>
          {/* Stats */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:16 }}>
            {[
              { label:'Waiting',     value:waiting,              color:'#D97706', bg:'#FFF7ED' },
              { label:'Being Served',value:serving,              color:'#2563EB', bg:'#EFF6FF' },
              { label:'Completed',   value:completed,            color:'#16A34A', bg:'#ECFDF5' },
              { label:'Avg Wait',    value:`${metrics?.avgWait??0} min`, color:'#7C3AED', bg:'#F5F3FF' },
            ].map(s => (
              <div key={s.label} className="card" style={{ padding:16 }}>
                <div style={{ fontSize:11, color:'var(--muted)', marginBottom:4 }}>{s.label}</div>
                <div style={{ fontSize:26, fontWeight:800, color:s.color }}>{qLoading ? '…' : s.value}</div>
              </div>
            ))}
          </div>

          {/* Toolbar */}
          <div style={{ display:'flex', gap:8, marginBottom:12 }}>
            <input className="form-input" style={{ flex:1, maxWidth:260 }}
              placeholder="Search patient or queue #…"
              value={qSearch} onChange={e => setQSearch(e.target.value)} />
            <select className="form-select" style={{ width:140 }} value={qStatus} onChange={e => setQStatus(e.target.value)}>
              {['All','waiting','serving','done','completed','cancelled','no_show'].map(s =>
                <option key={s} value={s}>{s === 'All' ? 'All Status' : s}</option>)}
            </select>
            <button className="btn btn-outline" onClick={loadQueue}>Refresh</button>
          </div>

          {/* Queue Table */}
          <div className="card" style={{ padding:0, overflow:'hidden' }}>
            {qLoading
              ? <div style={{ padding:40, textAlign:'center', color:'var(--muted)' }}>Loading queue…</div>
              : filteredQ.length === 0
                ? <div style={{ padding:40, textAlign:'center', color:'var(--muted)' }}>
                    {queue.length === 0 ? 'No queue entries today.' : 'No results match your filter.'}
                  </div>
                : <table className="table">
                    <thead><tr><th>Queue #</th><th>Patient</th><th>Service</th><th>Type</th><th>Joined</th><th>Status</th></tr></thead>
                    <tbody>
                      {filteredQ.map(q => (
                        <tr key={q._id}>
                          <td><strong>{q.queueNumber}</strong></td>
                          <td>
                            <div>{q.patientName || '—'}</div>
                            {q.patientPhone && <div style={{ fontSize:11, color:'var(--muted)' }}>{q.patientPhone}</div>}
                          </td>
                          <td>{q.serviceName || '—'}</td>
                          <td><span className={`badge ${q.queueType==='Priority'?'badge-red':'badge-blue'}`}>{q.queueType||'Regular'}</span></td>
                          <td style={{ fontSize:12 }}>{q.joinedAt ? new Date(q.joinedAt).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}) : '—'}</td>
                          <td><span className={`badge ${STATUS_BADGE[q.status]||'badge-gray'}`}>{q.status}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
            }
          </div>
        </>
      )}

      {/* ── APPOINTMENTS TAB ── */}
      {tab === 'appointments' && (
        <>
          {/* Stats */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:16 }}>
            {[
              { label:'Total Today',  value:appts.length,  color:'#2563EB', bg:'#EFF6FF' },
              { label:'Pending',      value:pendingA,       color:'#D97706', bg:'#FFF7ED' },
              { label:'Confirmed',    value:confirmedA,     color:'#16A34A', bg:'#ECFDF5' },
              { label:'Completed',    value:appts.filter(a=>a.status==='completed').length, color:'#7C3AED', bg:'#F5F3FF' },
            ].map(s => (
              <div key={s.label} className="card" style={{ padding:16 }}>
                <div style={{ fontSize:11, color:'var(--muted)', marginBottom:4 }}>{s.label}</div>
                <div style={{ fontSize:26, fontWeight:800, color:s.color }}>{aLoading ? '…' : s.value}</div>
              </div>
            ))}
          </div>

          {/* Sub-tabs + filters */}
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
            <div style={{ display:'flex', gap:0, background:'var(--bg-2)', borderRadius:8, padding:3 }}>
              {['today','all'].map(t => (
                <button key={t} onClick={() => setATab(t)}
                  style={{ padding:'6px 16px', borderRadius:6, border:'none', cursor:'pointer', fontWeight:600, fontSize:12,
                    background: aTab===t ? 'var(--primary)' : 'transparent',
                    color: aTab===t ? '#fff' : 'var(--text-2)' }}>
                  {t==='today' ? "Today's" : 'All Appointments'}
                </button>
              ))}
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <input className="form-input" style={{ width:220 }} placeholder="Search patient or service…"
                value={aSearch} onChange={e => setASearch(e.target.value)} />
              <select className="form-select" style={{ width:150 }} value={aStatus} onChange={e => setAStatus(e.target.value)}>
                <option value="All">All Status</option>
                {APPT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <button className="btn btn-outline" onClick={loadAppts}>Refresh</button>
            </div>
          </div>

          {/* Appointments Table */}
          <div className="card" style={{ padding:0, overflow:'hidden' }}>
            {aLoading
              ? <div style={{ padding:40, textAlign:'center', color:'var(--muted)' }}>Loading appointments…</div>
              : filteredA.length === 0
                ? <div style={{ padding:40, textAlign:'center', color:'var(--muted)' }}>No appointments found.</div>
                : <table className="table">
                    <thead><tr><th>Patient</th><th>Service</th><th>Date & Time</th><th>Type</th><th>Status</th></tr></thead>
                    <tbody>
                      {filteredA.map(a => (
                        <tr key={a._id}>
                          <td>
                            <div style={{ fontWeight:600 }}>{a.patientName||'—'}</div>
                            <div style={{ fontSize:11, color:'var(--muted)' }}>{a.patientPhone}</div>
                          </td>
                          <td>{a.serviceName||'—'}</td>
                          <td style={{ fontSize:12 }}>
                            <div>{a.appointmentDate ? new Date(a.appointmentDate).toLocaleDateString('en-PH') : '—'}</div>
                            <div style={{ color:'var(--muted)' }}>{a.timeSlot}</div>
                          </td>
                          <td><span className={`badge ${a.patientType==='Regular'?'badge-blue':'badge-red'}`}>{a.patientType||'Regular'}</span></td>
                          <td><span className={`badge ${STATUS_BADGE[a.status]||'badge-gray'}`}>{a.status}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
            }
          </div>
        </>
      )}

      {/* Walk-in Modal */}
      {walkinModal && (
        <div className="modal-overlay" onClick={closeWalkinModal}>
          <div className="modal" style={{ maxWidth:420 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Add Walk-in Patient</span>
              <button className="modal-close" onClick={closeWalkinModal}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Patient Name *</label>
                <input className="form-input" value={walkinForm.patientName} placeholder="Full name" style={{ border: walkinForm.errors?.patientName ? '1px solid #DC2626' : undefined }}
                  onChange={e =>
                    setWalkinForm(p => ({
                      ...p,
                      patientName: e.target.value,
                      errors: {
                        ...p.errors,
                        patientName: ''
                      }
                    }))
                  }
                />
                {walkinForm.errors?.patientName && (
                  <div style={{ color:'#DC2626', fontSize:12, marginTop:6, fontWeight:500,}} >
                    {walkinForm.errors.patientName}
                  </div>
                )}
              </div>
              <div className="form-group">
                <label className="form-label">Phone</label>
                <input className="form-input" value={walkinForm.phone} placeholder="+63 9XX XXX XXXX"
                  onChange={e => setWalkinForm(p => ({ ...p, phone: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Service *</label>
                {services.length > 0
                  ? <select className="form-select" value={walkinForm.serviceName} 
                      style={{ border: walkinForm.errors?.serviceName? '1px solid #DC2626' : undefined }}
                      onChange={e => setWalkinForm(p => ({ ...p, serviceName: e.target.value }))}>
                      <option value="">Select service…</option>
                     
                      {services.map(s => <option key={s._id||s.name} value={s.name}>{s.name} ({s.durationMinutes} min)</option>)}
                    </select>
                    
                  : <input className="form-input" value={walkinForm.serviceName} placeholder="e.g. Laboratory"
                      onChange={e => setWalkinForm(p => ({ ...p, serviceName: e.target.value }))} />
                    }
                    {walkinForm.errors?.serviceName && (
                      <div style={{ color:'#DC2626',fontSize:12, marginTop:6, fontWeight:500, }} >
                        {walkinForm.errors.serviceName}
                      </div>
                    )}
              </div>
              <div className="form-group">
                <label className="form-label">Patient Type</label>
                <select className="form-select" value={walkinForm.patientType}
                  onChange={e => setWalkinForm(p => ({ ...p, patientType: e.target.value }))}>
                  {PATIENT_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={closeWalkinModal}>Cancel</button>
              <button className="btn btn-primary" onClick={addWalkin} disabled={wSaving}>{wSaving ? 'Adding…' : 'Add to Queue'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
