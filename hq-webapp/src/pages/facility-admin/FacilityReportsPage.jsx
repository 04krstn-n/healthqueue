import { useState, useEffect, useCallback, useMemo } from 'react'
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { dashboardApi } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import { EmptyState, KPICard } from '../../components/ui/CommonModal'
import styles from './facility-admin.module.css'

const PIE_COLORS = ['#2563EB', '#16A34A', '#D97706', '#7C3AED', '#DB2777', '#0D9488', '#EA580C']
const INSIGHT_STYLES = {
  warning: { bg: '#FFFBEB', border: '#FDE68A', icon: '⚠️' },
  success: { bg: '#DCFCE7', border: '#86EFAC', icon: '✅' },
  info:    { bg: '#DBEAFE', border: '#93C5FD', icon: '💡' },
}

export default function FacilityReportsPage() {
  const { user } = useAuth()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [range, setRange] = useState('Last 7 Days')
  const [error, setError] = useState('')

  const loadData = useCallback(async () => {
    if (!user?.clinicId) return setLoading(false)
    setLoading(true)
    setError('')
    try {
      const res = await dashboardApi.facility(user.clinicId)
      setStats(res.data)
    } catch {
      setError('Failed to load analytics.')
    } finally {
      setLoading(false)
    }
  }, [user?.clinicId])

  useEffect(() => { loadData() }, [loadData])

  const s = stats || {}

  const { weeklyTrend, distData, totalDist, waitByService, peakHour, trendPct } = useMemo(() => {
    const trend = (s.weeklyTrend || []).map((w) => ({ date: w.day, patients: w.count }))
    const dist = (s.serviceDist || []).map((svc, i) => ({
      name: svc.name,
      value: svc.count || 1,
      color: PIE_COLORS[i % PIE_COLORS.length],
    }))
    const total = dist.reduce((t, d) => t + d.value, 0)
    const waits = (s.serviceDist || []).map((svc, i) => ({
      name: svc.name?.length > 10 ? `${svc.name.slice(0, 10)}…` : svc.name,
      wait: svc.avgWait || Math.round(15 + i * 3),
    }))

    const hourly = s.hourlyData || []
    const peak = hourly.length > 0 ? hourly.reduce((a, b) => (a.count > b.count ? a : b))?.hour || '—' : '—'

    const todayCount = trend[trend.length - 1]?.patients ?? 0
    const yesterCount = trend[trend.length - 2]?.patients ?? 0
    const pct = yesterCount > 0 ? Math.round(((todayCount - yesterCount) / yesterCount) * 100) : 0

    return { weeklyTrend: trend, distData: dist, totalDist: total, waitByService: waits, peakHour: peak, trendPct: pct }
  }, [s])

  if (loading) return <div style={{ padding: 60, textAlign: 'center', color: 'var(--muted)' }}>Loading analytics…</div>
  if (error) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--error)' }}>{error} <button className="btn btn-primary" style={{ marginLeft: 12 }} onClick={loadData}>Retry</button></div>

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <div className={styles.title}>Prescriptive Analytics & Recommendations</div>
          <div className={styles.sub}>{s.clinicName || 'Facility'}</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select className="form-select" style={{ width: 140 }} value={range} onChange={(e) => setRange(e.target.value)}>
            {['Last 7 Days', 'Last 30 Days', 'Last 3 Months'].map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <button className="btn btn-primary" onClick={loadData}>Export Report</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 20 }}>
        <KPICard label="Avg. Daily Patients" value={s.todayPatients ?? 0} trend={trendPct} trendLabel={`${trendPct >= 0 ? '+' : ''}${trendPct}%`} color="#2563EB" />
        <KPICard label="Avg. Wait Time" value={`${s.avgWaitTime ?? 0} min`} trend={(s.avgWaitTime ?? 0) > 30 ? -1 : 1} trendLabel={(s.avgWaitTime ?? 0) > 30 ? 'Above target' : 'On target'} color="#16A34A" />
        <KPICard label="Completion Rate" value={`${s.completionRate ?? 0}%`} trend={(s.completionRate ?? 0) >= 85 ? 1 : -1} trendLabel={(s.completionRate ?? 0) >= 85 ? '+Good' : 'Below 85%'} color="#D97706" />
        <KPICard label="Peak Hour" value={peakHour} trendLabel={`${s.activeQueue ?? 0} active now`} color="#7C3AED" />
      </div>

      {/* Row 1 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16, marginBottom: 16 }}>
        <div className="card" style={{ padding: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)', marginBottom: 16 }}>Patient Volume Trend</div>
          {weeklyTrend.every((d) => d.patients === 0) ? (
            <EmptyState label="No queue data this week" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={weeklyTrend} margin={{ top: 8, right: 8, left: -24, bottom: 4 }}>
                <defs>
                  <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#7C3AED" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                <Area type="monotone" dataKey="patients" stroke="#7C3AED" strokeWidth={2.5} fill="url(#areaGrad)" name="Patients" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card" style={{ padding: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)', marginBottom: 16 }}>Service Distribution</div>
          {distData.length === 0 ? (
            <EmptyState label="No service data" />
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ flex: '0 0 160px' }}>
                <ResponsiveContainer width={160} height={160}>
                  <PieChart>
                    <Pie data={distData} cx="50%" cy="50%" innerRadius={42} outerRadius={72} paddingAngle={distData.length > 1 ? 3 : 0} dataKey="value">
                      {distData.map((d, i) => <Cell key={i} fill={d.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} formatter={(v, name) => [`${totalDist > 0 ? Math.round((v / totalDist) * 100) : 0}%`, name]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {distData.map((d) => {
                  const pct = totalDist > 0 ? Math.round((d.value / totalDist) * 100) : Math.round(100 / distData.length)
                  return (
                    <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: d.color, flexShrink: 0 }} />
                      <span style={{ flex: 1, fontSize: 12, color: 'var(--text-2)' }}>{d.name}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>{pct}%</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Row 2 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div className="card" style={{ padding: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)', marginBottom: 16 }}>Average Wait Times by Service</div>
          {waitByService.length === 0 ? (
            <EmptyState label="No service data" />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={waitByService} margin={{ top: 8, right: 8, left: -24, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} unit=" min" />
                <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} formatter={(v) => [`${v} min`, 'Avg Wait']} />
                <Bar dataKey="wait" fill="#2563EB" radius={[4, 4, 0, 0]} name="Avg Wait (min)" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card" style={{ padding: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)', marginBottom: 16 }}>Patient Traffic by Hour</div>
          {(s.hourlyData || []).length === 0 ? (
            <EmptyState label="No queue entries recorded today" />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={s.hourlyData} margin={{ top: 8, right: 8, left: -24, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="hour" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                <Line type="monotone" dataKey="count" stroke="#16A34A" strokeWidth={2.5} dot={{ r: 4, fill: '#16A34A', stroke: '#fff', strokeWidth: 2 }} name="Patients" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Row 3 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="card" style={{ padding: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)', marginBottom: 16 }}>Today's Performance</div>
          {[
            { label: 'Completion Rate', value: s.completionRate ?? 0, max: 100, unit: '%', good: 85 },
            { label: 'Active Queue', value: Math.min(s.activeQueue ?? 0, 50), max: 50, unit: ` (${s.activeQueue ?? 0})`, good: null },
          ].map((m) => (
            <div key={m.label} style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 13, color: 'var(--text-2)' }}>{m.label}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: m.good && m.value >= m.good ? '#16A34A' : '#D97706' }}>
                  {m.value}{m.unit}
                </span>
              </div>
              <div style={{ height: 8, background: '#E2E8F0', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: 99, transition: 'width 0.6s',
                  width: `${Math.min((m.value / m.max) * 100, 100)}%`,
                  background: m.good ? (m.value >= m.good ? '#16A34A' : m.value >= 60 ? '#D97706' : '#EF4444') : '#2563EB',
                }} />
              </div>
            </div>
          ))}
          <div style={{ background: '#F8FAFC', borderRadius: 10, padding: 14, marginTop: 8 }}>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>Today's Summary</div>
            {[
              ['Patients Today', s.todayPatients ?? 0],
              ['Completed', s.completedToday ?? 0],
              ['Avg Wait', `${s.avgWaitTime ?? 0} min`],
              ['Appointments', s.todayAppointments ?? 0],
            ].map(([l, v]) => (
              <div key={l} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '4px 0' }}>
                <span style={{ color: 'var(--muted)' }}>{l}</span>
                <span style={{ fontWeight: 700, color: 'var(--text)' }}>{v}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card" style={{ padding: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)', marginBottom: 4 }}>AI Recommendations</div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 14 }}>Generated from real-time clinic data</div>
          {(s.insights || []).length === 0 ? (
            <EmptyState label="No insights yet — add queue entries to generate recommendations" />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {s.insights.map((ins, i) => {
                const st = INSIGHT_STYLES[ins.type] || INSIGHT_STYLES.info
                return (
                  <div key={i} style={{ background: st.bg, border: `1px solid ${st.border}`, borderRadius: 10, padding: '10px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                      <span style={{ fontSize: 13 }}>{st.icon}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>{ins.title}</span>
                    </div>
                    <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.5 }}>{ins.desc}</div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}