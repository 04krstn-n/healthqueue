import { useState, useEffect } from 'react'
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'
import { dashboardApi, clinicsApi } from '../../services/api'
import styles from './super-admin.module.css'

const STATUS_BADGE = { open:'badge-green', active:'badge-green', busy:'badge-warn', closed:'badge-gray', maintenance:'badge-warn', inactive:'badge-gray', pending:'badge-warn' }

export default function SuperDashboard() {
  const [metrics,  setMetrics]  = useState(null)
  const [clinics,  setClinics]  = useState([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    Promise.all([
      dashboardApi.superAdmin(),
      clinicsApi.list(),
    ]).then(([dm, cm]) => {
      setMetrics(dm.data)
      setClinics(cm.data || [])
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const m = metrics || {}

  // Real facility growth from server, or empty until loaded
  const facilityGrowth  = m.facilityGrowth  || []
  const weeklyTrend     = m.weeklyTrend      || []

  // Recent clinics — last 5 from real list, sorted by createdAt desc
  const recentClinics = [...clinics]
    .sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5)

  // System alerts from server, or empty
  const alerts = m.alerts || []

  return (
    <div className={styles.page}>
      {/* ── Stat cards ── */}
      <div className={styles.statsRow}>
        <StatCard label="Total Health Centers" value={loading ? '…' : (m.totalClinics   ?? 0)} sub={`${m.activeClinics ?? 0} active`}    icon="building" color="blue"   />
        <StatCard label="Total Users"           value={loading ? '…' : (m.totalUsers     ?? 0)} sub={`${m.totalPatients ?? 0} patients`}  icon="users"    color="green"  />
        <StatCard label="Today's Queue"         value={loading ? '…' : (m.todayQueue     ?? 0)} sub="Across all facilities"               icon="queue"    color="purple" />
        <StatCard label="Today's Appointments"  value={loading ? '…' : (m.todayAppointments ?? 0)} sub="Scheduled today"                 icon="calendar" color="teal"   />
      </div>

      {/* ── Charts ── */}
      <div className={styles.chartsRow}>
        <div className={`card ${styles.chartBox}`}>
          <div className={styles.chartTitle}>Weekly Patient Volume</div>
          {weeklyTrend.length === 0
            ? <EmptyChart />
            : <ResponsiveContainer width="100%" height={200}>
                <LineChart data={weeklyTrend} margin={{ top:8, right:8, left:-24, bottom:4 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="day"   tick={{ fontSize:11 }} />
                  <YAxis tick={{ fontSize:11 }} />
                  <Tooltip contentStyle={{ borderRadius:8, fontSize:12 }} />
                  <Line type="monotone" dataKey="count" stroke="#2563EB" strokeWidth={2.5}
                    dot={{ r:3, fill:'#2563EB', strokeWidth:2, stroke:'#fff' }} />
                </LineChart>
              </ResponsiveContainer>
          }
        </div>
        <div className={`card ${styles.chartBox}`}>
          <div className={styles.chartTitle}>Queue by Status</div>
          {!m.statusBreakdown?.length
            ? <EmptyChart />
            : <ResponsiveContainer width="100%" height={200}>
                <BarChart data={m.statusBreakdown} margin={{ top:8, right:8, left:-24, bottom:4 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="status" tick={{ fontSize:10 }} />
                  <YAxis tick={{ fontSize:11 }} />
                  <Tooltip contentStyle={{ borderRadius:8, fontSize:12 }} />
                  <Bar dataKey="count" fill="#7C3AED" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
          }
        </div>
      </div>

      {/* ── Bottom row ── */}
      <div className={styles.bottomRow}>
        {/* Recent health centers */}
        <div className={`card ${styles.centersCard}`}>
          <div className={styles.centersHeader}>
            <span style={{fontWeight:700,color:'var(--text)'}}>Recent Health Centers</span>
            <span style={{fontSize:12,color:'var(--muted)'}}>Latest registered</span>
          </div>
          {loading
            ? <div style={{padding:'20px 0',textAlign:'center',color:'var(--muted)'}}>Loading…</div>
            : recentClinics.length === 0
              ? <div style={{padding:'20px 0',textAlign:'center',color:'var(--muted)'}}>No health centers yet.</div>
              : recentClinics.map(c => (
                <div key={c._id} className={styles.centerItem}>
                  <div className={styles.centerIcon}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                  </div>
                  <div className={styles.centerInfo}>
                    <div className={styles.centerName}>{c.name}</div>
                    <div className={styles.centerLoc}>{c.city}, {c.province}</div>
                    <div className={styles.centerDate}>Added {new Date(c.createdAt).toLocaleDateString()}</div>
                  </div>
                  <div className={styles.centerRight}>
                    <span className={`badge ${STATUS_BADGE[c.status] || 'badge-gray'}`}>{c.status}</span>
                    <span className={styles.centerUsers}>{c.maxQueueCapacity ?? 0} cap</span>
                  </div>
                </div>
              ))
          }
        </div>

        {/* Alerts */}
        <div className={`card ${styles.alertsCard}`}>
          <div style={{fontWeight:700,color:'var(--text)',marginBottom:12}}>System Alerts</div>
          {alerts.length === 0
            ? <div style={{textAlign:'center',color:'var(--muted)',fontSize:13,padding:'12px 0'}}>No alerts at this time.</div>
            : alerts.map((a,i) => (
              <div key={i} className={styles.alertItem}>
                <div className={styles.alertIconWrap} data-type={a.type}>
                  {a.type === 'warning'
                    ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                    : a.type === 'success'
                      ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                      : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  }
                </div>
                <div>
                  <div className={styles.alertMsg} data-type={a.type}>{a.msg || a.message}</div>
                  <div className={styles.alertTime}>{a.time || a.createdAt}</div>
                </div>
              </div>
            ))
          }
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, sub, color, icon }) {
  const colors = { blue:'#2563EB', green:'#16A34A', purple:'#7C3AED', teal:'#0D9488', orange:'#D97706' }
  const bg     = { blue:'#EFF6FF', green:'#F0FDF4', purple:'#F5F3FF', teal:'#F0FDFA', orange:'#FFFBEB' }
  const c = colors[color] || '#2563EB'
  const b = bg[color]     || '#EFF6FF'
  return (
    <div className={`card ${styles.statCard}`}>
      <div>
        <div className={styles.statLabel}>{label}</div>
        <div className={styles.statValue}>{value}</div>
        <div className={styles.statSub}>{sub}</div>
      </div>
      <div className={styles.statIcon} style={{ background:b, color:c }}>
         {icon === "calendar" && (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
        )}

        {icon === "building" && (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 21h18" />
            <path d="M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16" />
            <path d="M9 7h1" />
            <path d="M14 7h1" />
            <path d="M9 11h1" />
            <path d="M14 11h1" />
            <path d="M9 15h1" />
            <path d="M14 15h1" />
          </svg>
        )}

        {icon === "users" && (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        )}

        {icon === "queue" && (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="8" y1="6" x2="21" y2="6" />
            <line x1="8" y1="12" x2="21" y2="12" />
            <line x1="8" y1="18" x2="21" y2="18" />
            <circle cx="4" cy="6" r="1" />
            <circle cx="4" cy="12" r="1" />
            <circle cx="4" cy="18" r="1" />
          </svg>
        )}
    
      </div>
    </div>
  )
}

function EmptyChart() {
  return <div style={{height:200,display:'flex',alignItems:'center',justifyContent:'center',color:'var(--muted)',fontSize:13}}>No data yet</div>
}
