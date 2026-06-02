import { useState, useEffect } from 'react'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import api from '../../services/api'
import styles from './super-admin.module.css'

const COLORS = ['#2563EB','#16A34A','#D97706','#7C3AED','#DB2777','#0D9488']

export default function SystemReportsPage() {
  const [stats,   setStats]   = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/api/dashboard/super-admin')
      .then(r => setStats(r.data))
      .catch(() => setStats(null))
      .finally(() => setLoading(false))
  }, [])

  const s = stats || {}
  const weeklyTrend    = (s.weeklyTrend     || [])
  const statusBreakdown= (s.statusBreakdown  || [])

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <div className={styles.title}>System Reports</div>
          <div className={styles.sub}>Platform-wide analytics and statistics</div>
        </div>
      </div>

      {/* Summary cards */}
      <div className={styles.statsRow}>
        <div className={`card ${styles.statCard}`}>
          <div className={styles.statLabel}>Total Clinics</div>
          <div className={styles.statValue}>{loading ? '…' : (s.totalClinics ?? 0)}</div>
          <div className={styles.statSub}>{s.activeClinics ?? 0} active</div>
        </div>
        <div className={`card ${styles.statCard}`}>
          <div className={styles.statLabel}>Total Users</div>
          <div className={styles.statValue}>{loading ? '…' : (s.totalUsers ?? 0)}</div>
          <div className={styles.statSub}>{s.totalPatients ?? 0} patients</div>
        </div>
        <div className={`card ${styles.statCard}`}>
          <div className={styles.statLabel}>Today's Queue</div>
          <div className={styles.statValue}>{loading ? '…' : (s.todayQueue ?? 0)}</div>
          <div className={styles.statSub}>Across all facilities</div>
        </div>
        <div className={`card ${styles.statCard}`}>
          <div className={styles.statLabel}>Today's Appointments</div>
          <div className={styles.statValue}>{loading ? '…' : (s.todayAppointments ?? 0)}</div>
          <div className={styles.statSub}>Scheduled today</div>
        </div>
      </div>

      {/* Charts */}
      <div className={styles.chartsRow}>
        <div className={`card ${styles.chartBox}`}>
          <div className={styles.chartTitle}>Weekly Queue Volume (Last 7 Days)</div>
          {weeklyTrend.length === 0
            ? <Empty loading={loading} />
            : <ResponsiveContainer width="100%" height={220}>
                <LineChart data={weeklyTrend} margin={{ top:8, right:8, left:-24, bottom:4 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize:11 }} />
                  <YAxis tick={{ fontSize:11 }} allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius:8, fontSize:12 }} />
                  <Line type="monotone" dataKey="count" stroke="#2563EB" strokeWidth={2.5}
                    dot={{ r:3, fill:'#2563EB', stroke:'#fff', strokeWidth:2 }} />
                </LineChart>
              </ResponsiveContainer>
          }
        </div>
        <div className={`card ${styles.chartBox}`}>
          <div className={styles.chartTitle}>Queue Status Breakdown (Today)</div>
          {statusBreakdown.length === 0
            ? <Empty loading={loading} />
            : <ResponsiveContainer width="100%" height={220}>
                <BarChart data={statusBreakdown} margin={{ top:8, right:8, left:-24, bottom:4 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="status" tick={{ fontSize:10 }} />
                  <YAxis tick={{ fontSize:11 }} allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius:8, fontSize:12 }} />
                  <Bar dataKey="count" radius={[4,4,0,0]}>
                    {statusBreakdown.map((_,i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
          }
        </div>
      </div>

      {/* Data table */}
      <div className="card" style={{ padding:20 }}>
        <div style={{ fontWeight:700, color:'var(--text)', marginBottom:14 }}>Queue Status Summary (Today)</div>
        {statusBreakdown.length === 0
          ? <div style={{ textAlign:'center', color:'var(--muted)', padding:'20px 0' }}>{loading ? 'Loading…' : 'No queue data today.'}</div>
          : <table className="table">
              <thead><tr><th>Status</th><th>Count</th><th>Share</th></tr></thead>
              <tbody>
                {statusBreakdown.map((row, i) => {
                  const total = statusBreakdown.reduce((s,r)=>s+r.count,0)
                  return (
                    <tr key={row.status}>
                      <td><span className="badge badge-blue">{row.status}</span></td>
                      <td><strong>{row.count}</strong></td>
                      <td>{total > 0 ? `${Math.round((row.count/total)*100)}%` : '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
        }
      </div>
    </div>
  )
}

function Empty({ loading }) {
  return (
    <div style={{ height:220, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--muted)', fontSize:13 }}>
      {loading ? 'Loading…' : 'No data yet'}
    </div>
  )
}
