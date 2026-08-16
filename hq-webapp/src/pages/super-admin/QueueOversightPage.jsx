import { useState, useEffect, useCallback } from 'react'
import { clinicsApi, queueApi } from '../../services/api'
import styles from './super-admin.module.css'

const STATUS_BADGE = { 
  waiting: 'badge-warn', 
  serving: 'badge-blue', 
  done: 'badge-green', 
  completed: 'badge-green', 
  cancelled: 'badge-gray', 
  no_show: 'badge-red' 
}

export default function QueueOversightPage() {
  const [clinics,  setClinics]  = useState([])
  const [queueMap, setQueueMap] = useState({})
  const [loading,  setLoading]  = useState(true)
  const [search,   setSearch]   = useState('')
  const [expanded, setExpanded] = useState(null)
  const [toast,    setToast]    = useState('')

  const showToast = (m) => { setToast(m); setTimeout(() => setToast(''), 3000) }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const cr = await clinicsApi.list()
      const cData = cr.data
      const list = Array.isArray(cData) ? cData : Array.isArray(cData?.data) ? cData.data : Array.isArray(cData?.clinics) ? cData.clinics : []
      setClinics(list)

      const results = await Promise.allSettled(
        list.map(c => {
          const cid = c._id || c.id
          return queueApi.list({ clinicId: cid }).then(r => {
            const qData = r.data
            const queue = Array.isArray(qData) ? qData : Array.isArray(qData?.data) ? qData.data : []
            return { id: cid, queue }
          })
        })
      )
      const map = {}
      results.forEach(r => { if (r.status === 'fulfilled') map[r.value.id] = r.value.queue })
      setQueueMap(map)
    } catch { 
      showToast('Failed to load queue data') 
    } finally { 
      setLoading(false) 
    }
  }, [])

  useEffect(() => { load() }, [load])

  const act = async (fn, label) => {
    try { 
      await fn()
      showToast(`${label} — done`)
      load() 
    } catch { 
      showToast(`Failed: ${label}`) 
    }
  }

  const safeClinics = Array.isArray(clinics) ? clinics : []
  const filtered = safeClinics.filter(c =>
    !search || c.name?.toLowerCase().includes(search.toLowerCase()) || c.city?.toLowerCase().includes(search.toLowerCase())
  )

  const allQueues = Object.values(queueMap).flat()
  const totalWaiting  = allQueues.filter(q => q.status === 'waiting').length
  const totalServing  = allQueues.filter(q => q.status === 'serving').length
  const totalDone     = allQueues.filter(q => ['done','completed'].includes(q.status)).length
  const totalAll      = allQueues.length

  return (
    <div className={styles.page}>
      {toast && <div className={styles.toast}>{toast}</div>}

      <div className={styles.header}>
        <div>
          <div className={styles.title}>Queue Oversight</div>
          <div className={styles.sub}>Monitor live queues across all health facilities</div>
        </div>
        <div className={styles.toolbar}>
          <input className="form-input" style={{ width:220 }} placeholder="Search facility…"
            value={search} onChange={e => setSearch(e.target.value)} />
          <button className="btn btn-outline" onClick={load}>Refresh</button>
        </div>
      </div>

      <div className={styles.statsRow}>
        <div className={`card ${styles.statCard}`}>
          <div className={styles.statLabel}>Total in Queue</div>
          <div className={styles.statValue}>{loading ? '…' : totalAll}</div>
        </div>
        <div className={`card ${styles.statCard}`}>
          <div className={styles.statLabel}>Waiting</div>
          <div className={styles.statValue} style={{ color:'#D97706' }}>{loading ? '…' : totalWaiting}</div>
        </div>
        <div className={`card ${styles.statCard}`}>
          <div className={styles.statLabel}>Being Served</div>
          <div className={styles.statValue} style={{ color:'#2563EB' }}>{loading ? '…' : totalServing}</div>
        </div>
        <div className={`card ${styles.statCard}`}>
          <div className={styles.statLabel}>Completed Today</div>
          <div className={styles.statValue} style={{ color:'#16A34A' }}>{loading ? '…' : totalDone}</div>
        </div>
      </div>

      {loading
        ? <div style={{ padding:40, textAlign:'center', color:'var(--muted)' }}>Loading facility queues…</div>
        : filtered.length === 0
          ? <div style={{ padding:40, textAlign:'center', color:'var(--muted)' }}>No facilities found.</div>
          : filtered.map(clinic => {
              const cid     = clinic._id || clinic.id
              const queue   = queueMap[cid] || []
              const waiting = queue.filter(q => q.status === 'waiting').length
              const cap     = clinic.maxQueueCapacity || 60
              const pct     = Math.min(100, Math.round((queue.length / cap) * 100))
              const isOpen  = expanded === cid

              return (
                <div key={cid} className="card" style={{ padding:0, overflow:'hidden', marginBottom: 12 }}>
                  <div style={{ padding:'14px 18px', display:'flex', alignItems:'center', gap:14, cursor:'pointer', borderBottom: isOpen ? '1px solid var(--border-lt)' : 'none' }}
                    onClick={() => setExpanded(isOpen ? null : cid)}>
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:700, color:'var(--text)', fontSize:14 }}>{clinic.name}</div>
                      <div style={{ fontSize:12, color:'var(--muted)' }}>{clinic.city}, {clinic.province}</div>
                    </div>
                    <div style={{ display:'flex', gap:16, alignItems:'center' }}>
                      <span className={`badge ${waiting > 0 ? 'badge-warn' : 'badge-gray'}`}>{waiting} waiting</span>
                      <span style={{ fontSize:12, color:'var(--muted)' }}>{queue.length}/{cap}</span>
                      <div style={{ width:80 }}>
                        <div className={styles.ovProgress}>
                          <div className={styles.ovBar} style={{ width:`${pct}%`, background: pct > 80 ? '#DC2626' : pct > 50 ? '#D97706' : '#2563EB' }} />
                        </div>
                      </div>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2"
                        style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition:'.2s' }}>
                        <polyline points="6 9 12 15 18 9"/>
                      </svg>
                    </div>
                  </div>

                  {isOpen && (
                    <div style={{ padding:'0 18px 14px' }}>
                      {queue.length === 0
                        ? <div style={{ padding:'20px 0', textAlign:'center', color:'var(--muted)', fontSize:13 }}>No active queue entries.</div>
                        : <table className="table" style={{ marginTop:12 }}>
                            <thead>
                              <tr>
                                <th>Queue #</th><th>Patient</th><th>Service</th>
                                <th>Type</th><th>Joined</th><th>Status</th><th>Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {queue.map(q => (
                                <tr key={q._id || q.id}>
                                  <td><strong>{q.queueNumber}</strong></td>
                                  <td>{q.patientName || '—'}</td>
                                  <td>{q.serviceName || '—'}</td>
                                  <td>{q.queueType || 'Regular'}</td>
                                  <td>{q.joinedAt ? new Date(q.joinedAt).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}) : '—'}</td>
                                  <td><span className={`badge ${STATUS_BADGE[q.status] || 'badge-gray'}`}>{q.status}</span></td>
                                  <td>
                                    <div style={{ display:'flex', gap:4 }}>
                                      {q.status === 'waiting' && (
                                        <button className="btn btn-outline" style={{ fontSize:11, padding:'3px 8px' }}
                                          onClick={() => act(() => queueApi.call(q._id || q.id), 'Called patient')}>Call</button>
                                      )}
                                      {q.status === 'serving' && (
                                        <button className="btn btn-outline" style={{ fontSize:11, padding:'3px 8px', color:'var(--success)' }}
                                          onClick={() => act(() => queueApi.complete(q._id || q.id), 'Completed')}>Done</button>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                      }
                    </div>
                  )}
                </div>
              )
            })
      }
    </div>
  )
}