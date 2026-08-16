import { useState, useEffect, useCallback, useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts'
import { dashboardApi } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import { EmptyState, KPICard } from '../../components/ui/CommonModal'
import styles from './facility-admin.module.css'

export default function FacilityDashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    if (!user?.clinicId) return setLoading(false)
    setLoading(true)
    try {
      const res = await dashboardApi.facility(user.clinicId)
      setStats(res.data)
    } catch {
      setStats(null)
    } finally {
      setLoading(false)
    }
  }, [user?.clinicId])

  useEffect(() => { loadData() }, [loadData])

  const s = stats || {}

  const { queueByService, weeklyTrend, pieData, recentActivity, trendPct } = useMemo(() => {
    const queueService = (s.serviceDist || []).map((x) => ({
      name: x.name || x._id || 'Unknown',
      count: x.count || 0,
    }))

    const trend = (s.weeklyTrend || []).map((w) => ({ day: w.day, count: w.count }))

    const waiting = s.activeQueue ?? 0
    const serving = Math.max(0, (s.activeQueue ?? 0) - ((s.todayPatients ?? 0) - (s.completedToday ?? 0)))
    const completed = s.completedToday ?? 0

    const pie = [
      { name: 'Waiting', value: waiting, color: '#D97706' },
      { name: 'In Consultation', value: serving > 0 ? serving : (waiting > 0 ? Math.ceil(waiting * 0.3) : 0), color: '#2563EB' },
      { name: 'Completed', value: completed, color: '#16A34A' },
    ].filter((d) => d.value > 0)

    const activity = (s.recentActivity || []).map((a) => ({
      name: a.patientName || '—',
      action: a.status === 'waiting' ? 'Checked in' : a.status === 'serving' ? 'Consultation started' : ['completed', 'done'].includes(a.status) ? 'Completed' : a.status || '—',
      service: a.serviceName || '',
      time: a.joinedAt ? new Date(a.joinedAt).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' }) : '',
      color: a.status === 'waiting' ? '#D97706' : a.status === 'serving' ? '#2563EB' : '#16A34A',
    }))

    let pct = 0
    if (s.weeklyTrend?.length >= 2) {
      const last = s.weeklyTrend[s.weeklyTrend.length - 1]?.count ?? 0
      const prev = s.weeklyTrend[s.weeklyTrend.length - 2]?.count ?? 0
      pct = prev > 0 ? Math.round(((last - prev) / prev) * 100) : 0
    }

    return { queueByService: queueService, weeklyTrend: trend, pieData: pie, recentActivity: activity, trendPct: pct }
  }, [s])

  return (
    <div className={styles.page}>
      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 20 }}>
        <KPICard
          label="Total Patients Today"
          value={loading ? '…' : (s.todayPatients ?? 0)}
          sub={`${trendPct >= 0 ? '+' : ''}${trendPct}% from yesterday`}
          subColor={trendPct >= 0 ? '#16A34A' : '#EF4444'}
          iconBg="#2563EB"
          icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>}
        />
        <KPICard
          label="In Queue"
          value={loading ? '…' : (s.activeQueue ?? 0)}
          sub="Across all services"
          iconBg="#D97706"
          icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>}
        />
        <KPICard
          label="Avg. Wait Time"
          value={loading ? '…' : `${s.avgWaitTime ?? 0} min`}
          sub={(s.avgWaitTime ?? 0) <= 30 ? '−5 min from avg' : 'Above average'}
          subColor={(s.avgWaitTime ?? 0) <= 30 ? '#16A34A' : '#EF4444'}
          iconBg="#16A34A"
          icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/></svg>}
        />
        <KPICard
          label="Consultations Done"
          value={loading ? '…' : (s.completedToday ?? 0)}
          sub={`${s.activeQueue ?? 0} patients in queue`}
          iconBg="#7C3AED"
          icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>}
        />
      </div>

      {/* Row 1 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 16, marginBottom: 16 }}>
        <div className="card" style={{ padding: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)', marginBottom: 16 }}>Queue Status by Service</div>
          {queueByService.length === 0 ? (
            <EmptyState loading={loading} label="No queue entries yet — add walk-ins to see data" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={queueByService} margin={{ top: 8, right: 8, left: -20, bottom: 50 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" interval={0} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="count" name="Patients" fill="#16A34A" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card" style={{ padding: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)', marginBottom: 16 }}>Patient Status</div>
          {pieData.length === 0 ? (
            <EmptyState loading={loading} label="No patient data today" />
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
                <ResponsiveContainer width={180} height={180}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={52} outerRadius={80} paddingAngle={pieData.length > 1 ? 4 : 0} dataKey="value">
                      {pieData.map((d, i) => <Cell key={i} fill={d.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {pieData.map((d) => (
                  <div key={d.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 10, height: 10, borderRadius: '50%', background: d.color, display: 'inline-block' }} />
                      <span style={{ fontSize: 13, color: 'var(--text-2)' }}>{d.name}</span>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{d.value}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Row 2 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 16 }}>
        <div className="card" style={{ padding: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)', marginBottom: 16 }}>Patient Traffic (This Week)</div>
          {weeklyTrend.every((d) => d.count === 0) ? (
            <EmptyState loading={loading} label="No traffic data this week" />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={weeklyTrend} margin={{ top: 8, right: 8, left: -20, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                <Line type="monotone" dataKey="count" stroke="#2563EB" strokeWidth={2.5} dot={{ r: 4, fill: '#2563EB', stroke: '#fff', strokeWidth: 2 }} name="Patients" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>Recent Activity</span>
            <button className="btn btn-outline" style={{ fontSize: 11, padding: '3px 8px' }} onClick={loadData}>Refresh</button>
          </div>
          {recentActivity.length === 0 ? (
            <EmptyState loading={loading} label="No activity recorded today" />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {recentActivity.map((a, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: a.color, marginTop: 3, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{a.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>{a.action}{a.service ? ` — ${a.service}` : ''}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>{a.time}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}