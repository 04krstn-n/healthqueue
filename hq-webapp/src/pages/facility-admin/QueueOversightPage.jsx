import { useState, useEffect, useCallback, useMemo } from 'react'
import api, { clinicsApi, dashboardApi } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import { useToast, EmptyState } from "../../components/ui/CommonModal"
import styles from './facility-admin.module.css'

const COLORS = { waiting: '#D97706', serving: '#2563EB', completed: '#16A34A', avg: '#7C3AED' }

export default function QueueOversightPage() {
  const { user } = useAuth()
  const { toast, showToast } = useToast()
  const [view, setView] = useState('realtime')
  const [serviceFilter, setServiceFilter] = useState('All Services')
  const [stats, setStats] = useState(null)
  const [queue, setQueue] = useState([])
  const [clinic, setClinic] = useState(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState(null)

  const clinicId = user?.clinicId

  const loadData = useCallback(async () => {
    if (!clinicId) return setLoading(false)
    setLoading(true)
    try {
      const [statsRes, queueRes, clinicRes] = await Promise.all([
        dashboardApi.facility(clinicId),
        api.get('/api/queues', { params: { clinicId } }),
        clinicsApi.get(clinicId),
      ])
      
      setStats(statsRes.data?.data || statsRes.data || {})
      
      // Safely unnest array whether response is [...] or { data: [...] } or { queue: [...] }
      const rawQueue = queueRes.data?.data || queueRes.data?.queue || queueRes.data || []
      setQueue(Array.isArray(rawQueue) ? rawQueue : [])

      setClinic(clinicRes.data?.data || clinicRes.data || null)
      setLastUpdated(new Date())
    } catch {
      showToast('Failed to load oversight data')
      setQueue([])
    } finally {
      setLoading(false)
    }
  }, [clinicId, showToast])

  useEffect(() => { loadData() }, [loadData])

  const { services, serviceNames, serviceStats, bottlenecks, recentActivity } = useMemo(() => {
    const safeQueue = Array.isArray(queue) ? queue : []
    const svcs = clinic?.services?.filter((s) => s.isAvailable) || []
    const names = ['All Services', ...svcs.map((s) => s.name)]

    const calculatedStats = svcs.map((svc) => {
      const svcQueue = safeQueue.filter((q) => q.serviceName === svc.name)
      const waiting = svcQueue.filter((q) => q.status === 'waiting').length
      const serving = svcQueue.filter((q) => q.status === 'serving').length
      const completed = svcQueue.filter((q) => ['done', 'completed'].includes(q.status)).length
      const avgWait = svc.durationMinutes || 0
      const isBottleneck = waiting >= 8 || (waiting > 0 && avgWait > 30)
      return { name: svc.name, waiting, serving, completed, avgWait, isBottleneck, total: svcQueue.length }
    }).filter((s) => serviceFilter === 'All Services' || s.name === serviceFilter)

    const bn = calculatedStats.filter((s) => s.isBottleneck)
    
    // Safely sort the verified array
    const recent = [...safeQueue]
      .sort((a, b) => new Date(b.joinedAt || 0) - new Date(a.joinedAt || 0))
      .slice(0, 8)

    return { services: svcs, serviceNames: names, serviceStats: calculatedStats, bottlenecks: bn, recentActivity: recent }
  }, [clinic, queue, serviceFilter])

  const fmtTime = (d) => d ? new Date(d).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' }) : '—'
  const s = stats || {}

  return (
    <div className={styles.page}>
      {toast && <div className={styles.toast}>{toast}</div>}

      <div className={styles.header}>
        <div>
          <div className={styles.title}>Real-Time Queue Oversight</div>
          <div className={styles.sub}>Monitor queue flow and detect bottlenecks across all services</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ display: 'flex', background: 'var(--bg-2)', borderRadius: 8, padding: 3 }}>
            {['realtime', 'summary'].map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                style={{
                  padding: '7px 16px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                  background: view === v ? 'var(--primary)' : 'transparent',
                  color: view === v ? '#fff' : 'var(--text-2)',
                }}
              >
                {v === 'realtime' ? 'Real-time View' : 'Summary View'}
              </button>
            ))}
          </div>
          <button className="btn btn-primary" onClick={loadData}>Refresh</button>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 13, color: 'var(--muted)' }}>Filter by Service:</span>
          <select className="form-select" style={{ width: 160 }} value={serviceFilter} onChange={(e) => setServiceFilter(e.target.value)}>
            {serviceNames.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--success)' }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#16A34A', display: 'inline-block' }} />
          Live Updates · Last updated: {lastUpdated ? fmtTime(lastUpdated) : '—'}
        </div>
      </div>

      {view === 'realtime' ? (
        <>
          {bottlenecks.length > 0 && (
            <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 12, padding: 16, marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <span style={{ fontWeight: 700, color: '#92400E', fontSize: 14 }}>⚠️ Bottlenecks Detected</span>
              </div>
              {bottlenecks.map((b) => (
                <div key={b.name} style={{ background: '#fff', borderRadius: 8, padding: '12px 16px', marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: 13 }}>{b.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                      {b.waiting >= 8 ? `High queue length (${b.waiting} patients)` : `Above average wait time (${b.avgWait} minutes)`}
                    </div>
                    <div style={{ fontSize: 12, color: '#2563EB', marginTop: 4 }}>
                      💡 {b.waiting >= 8 ? 'Consider opening additional service window' : 'Check if additional staff assistance is needed'}
                    </div>
                  </div>
                  <button className="btn btn-outline" style={{ fontSize: 12 }} onClick={() => showToast(`Action logged for ${b.name}`)}>
                    Take Action
                  </button>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16, alignItems: 'start' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {loading ? (
                <EmptyState loading label="Loading…" />
              ) : serviceStats.length === 0 ? (
                <EmptyState label="No services configured." />
              ) : (
                serviceStats.map((svc) => (
                  <div key={svc.name} className="card" style={{ padding: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>{svc.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>Avg. {svc.avgWait} min per patient</div>
                      </div>
                      <span style={{
                        padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700,
                        background: svc.isBottleneck ? '#FEF9C3' : '#DCFCE7',
                        color: svc.isBottleneck ? '#92400E' : '#166534',
                        border: `1px solid ${svc.isBottleneck ? '#FDE047' : '#86EFAC'}`,
                      }}>
                        {svc.isBottleneck ? 'BOTTLENECK' : 'NORMAL'}
                      </span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                      {[
                        { label: 'Queued', value: svc.waiting, color: COLORS.waiting, icon: '⏳' },
                        { label: 'Serving', value: svc.serving, color: COLORS.serving, icon: '👤' },
                        { label: 'Completed', value: svc.completed, color: COLORS.completed, icon: '✅' },
                        { label: 'Avg Wait', value: `${svc.avgWait} min`, color: COLORS.avg, icon: '⏱' },
                      ].map((m) => (
                        <div key={m.label} style={{ background: 'var(--bg-2)', borderRadius: 10, padding: '12px 14px' }}>
                          <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>{m.icon} {m.label}</div>
                          <div style={{ fontSize: 22, fontWeight: 800, color: m.color }}>{m.value}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="card" style={{ padding: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)', marginBottom: 14 }}>Recent Activity</div>
              {recentActivity.length === 0 ? (
                <EmptyState label="No activity yet" height={120} />
              ) : (
                recentActivity.map((q) => (
                  <div key={q._id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 12 }}>
                    <div style={{ width: 34, height: 34, borderRadius: 99, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ fontSize: 14 }}>👤</span>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#2563EB' }}>{q.queueNumber || '—'}</div>
                      <div style={{ fontSize: 11, color: 'var(--text)', marginTop: 1 }}>
                        {q.status === 'waiting' ? 'Checked in' : q.status === 'serving' ? 'Consultation started' : ['completed', 'done'].includes(q.status) ? 'Completed' : q.status}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--muted)' }}>{q.serviceName}</div>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', flexShrink: 0 }}>{fmtTime(q.joinedAt)}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
          <div className="card" style={{ padding: 20 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)', marginBottom: 16 }}>Service Summary</div>
            <table className="table">
              <thead><tr><th>Service</th><th>Queued</th><th>Serving</th><th>Done</th><th>Status</th></tr></thead>
              <tbody>
                {serviceStats.map((st) => (
                  <tr key={st.name}>
                    <td style={{ fontWeight: 600, fontSize: 13 }}>{st.name}</td>
                    <td style={{ color: COLORS.waiting, fontWeight: 700 }}>{st.waiting}</td>
                    <td style={{ color: COLORS.serving, fontWeight: 700 }}>{st.serving}</td>
                    <td style={{ color: COLORS.completed, fontWeight: 700 }}>{st.completed}</td>
                    <td><span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: st.isBottleneck ? '#FEF9C3' : '#DCFCE7', color: st.isBottleneck ? '#92400E' : '#166534' }}>{st.isBottleneck ? '⚠ BUSY' : '✓ OK'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="card" style={{ padding: 20 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)', marginBottom: 16 }}>Overall Stats</div>
            {[
              ['Total in Queue Today', s.todayPatients ?? 0],
              ['Currently Waiting', s.activeQueue ?? 0],
              ['Completed Today', s.completedToday ?? 0],
              ['Avg Wait Time', `${s.avgWaitTime ?? 0} min`],
              ['Completion Rate', `${s.completionRate ?? 0}%`],
              ['Appointments Today', s.todayAppointments ?? 0],
            ].map(([label, val]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border-lt)' }}>
                <span style={{ fontSize: 13, color: 'var(--muted)' }}>{label}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{loading ? '…' : val}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}