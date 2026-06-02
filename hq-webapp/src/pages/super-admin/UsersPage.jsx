import { useState, useEffect } from 'react'
import api from '../../services/api'
import styles from './super-admin.module.css'

// --- CONSTANTS ---
const ROLE_LABELS = {
  super_admin:    'System Administrator',
  facility_admin: 'Facility Admin',
  staff:          'Staff',
  patient:        'Patient',
}
const ROLE_BADGE = {
  super_admin:    'badge-purple',
  facility_admin: 'badge-blue',
  staff:          'badge-teal',
  patient:        'badge-green',
}
const CREATE_ROLES = ['facility_admin', 'staff', 'super_admin']
const PERMISSIONS = {
  'Patient Management':  ['Patient Check-in', 'View Patient Records', 'Edit Patient Records'],
  'Queue Management':    ['View Queue', 'Manage Queue'],
  'Staff Management':    ['View Staff', 'Manage Staff'],
  'Analytics':           ['View Reports', 'Export Reports'],
  'System Settings':     ['View Settings', 'Manage Settings'],
}
const EMPTY_USER_FORM = {
  firstName: '', lastName: '', email: '', phone: '',
  role: 'facility_admin', clinicId: '', permissions: [],
}
const PERM_OPTIONS = [
  'full-access','queue-management','patient-view','patient-checkin',
  'reports-view','reports-export','analytics','staff-view','staff-manage',
  'queue-view','settings-view','settings-manage',
]
const SYSTEM_ROLES = [
  { _id:'1', name:'Facility Admin',  type:'system', users:24,  desc:'Full administrative access to facility operations',        perms:['full-access'] },
  { _id:'2', name:'Staff',   type:'system', users:42,  desc:'Manage patient queues and flow',                             perms:['queue-management','patient-view','reports-view'] },
  { _id:'3', name:'System Admin',  type:'system', users:24,  desc:'Full administrative access to all operations',        perms:['full-access'] },
]
const PERM_BADGE = {
  'full-access':'badge-blue','queue-management':'badge-teal','patient-view':'badge-green',
  'patient-checkin':'badge-green','reports-view':'badge-purple','reports-export':'badge-purple',
  'analytics':'badge-orange','staff-view':'badge-gray','staff-manage':'badge-gray',
  'queue-view':'badge-teal','settings-view':'badge-gray','settings-manage':'badge-gray',
}

export default function UserManagementPage() {
  // --- SHARED STATE ---
  const [tab, setTab] = useState('list')   // 'list' | 'create'
  const [toast, setToast] = useState('')
  const showToast = (m) => { setToast(m); setTimeout(()=>setToast(''), 3000) }

  // --- USER STATE ---
  const [users, setUsers] = useState([])
  const [clinics, setClinics] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleF] = useState('all')
  const [userForm, setUserForm] = useState(EMPTY_USER_FORM)
  const [savingUser, setSavingUser] = useState(false)
  const [userSuccess, setUserSuccess] = useState('')
  const [userError, setUserError] = useState('')
  const [assignModal, setAssignModal] = useState(null)
  const [assignClinic, setAssignClinic] = useState('')
  const [assigning, setAssigning] = useState(false)
  const [deactivateTarget, setDeactivateTarget] = useState(null)

  // --- ROLE MANAGEMENT MODAL STATE ---
  const [showRoleManager, setShowRoleManager] = useState(false)
  const [customRoles, setCustomRoles] = useState([])
  const [roleModal, setRoleModal] = useState(null)   // null | 'create' | 'edit'
  const [editingRole, setEditingRole] = useState(null)
  const [roleForm, setRoleForm] = useState({ name:'', desc:'', perms:[] })

  // ==========================================
  // USER EFFECTS & FUNCTIONS
  // ==========================================
  const loadUsers = () => {
    setLoading(true)
    api.get('/api/users').then(r => setUsers(r.data || [])).catch(() => {}).finally(() => setLoading(false))
  }
  const loadClinics = () => {
    api.get('/api/clinics').then(r => setClinics(r.data || [])).catch(() => {})
  }

  useEffect(() => { loadUsers(); loadClinics() }, [])

  const toggleUserPerm = (perm) => setUserForm(f => ({
    ...f, permissions: f.permissions.includes(perm)
      ? f.permissions.filter(p => p !== perm)
      : [...f.permissions, perm],
  }))

  const handleCreateUser = async () => {
    if (!userForm.firstName || !userForm.email || !userForm.role) {
      setUserError('First name, email, and role are required.'); return
    }
    if (userForm.role === 'facility_admin' && !userForm.clinicId) {
      setUserError('Facility Admin must be assigned to a clinic.'); return
    }
    setSavingUser(true); setUserError(''); setUserSuccess('')
    try {
      await api.post('/api/users/create', {
        fullName:    `${userForm.firstName.trim()} ${userForm.lastName.trim()}`.trim(),
        email:       userForm.email.trim(),
        phone:       userForm.phone.trim(),
        role:        userForm.role,
        clinicId:    userForm.clinicId || null,
        permissions: userForm.permissions,
        password:    'HealthQueue@2025',
      })
      setUserSuccess(`User created! Default password: HealthQueue@2025`)
      setUserForm(EMPTY_USER_FORM)
      loadUsers()
    } catch (e) {
      setUserError(e.response?.data?.message || 'Failed to create user.')
    } finally { setSavingUser(false) }
  }

  const openAssign = (u) => { setAssignModal(u); setAssignClinic(u.clinicId?._id || u.clinicId || '') }

  const handleAssign = async () => {
    if (!assignModal) return
    setAssigning(true)
    try {
      await api.put(`/api/users/${assignModal._id}`, { clinicId: assignClinic || null })
      setAssignModal(null)
      loadUsers()
      showToast('Clinic assigned successfully')
    } catch (e) {
      alert(e.response?.data?.message || 'Failed to assign clinic.')
    } finally { setAssigning(false) }
  }

  const handleDeactivate = async (u) => {
    try {
      await api.delete(`/api/users/${u._id}`)
      setDeactivateTarget(null)
      loadUsers()
      showToast('User deactivated')
    } catch (e) {
      alert(e.response?.data?.message || 'Failed to deactivate user.')
    }
  }

  const handleReactivate = async (u) => {
    try {
      await api.put(`/api/users/${u._id}`, { isActive: true })
      loadUsers()
      showToast('User reactivated')
    } catch (e) {
      alert(e.response?.data?.message || 'Failed to reactivate user.')
    }
  }

  const clinicName = (u) => {
    if (!u.clinicId) return '—'
    const c = clinics.find(cl => cl._id === (u.clinicId?._id || u.clinicId))
    return c ? c.name.replace('Hi-Precision Diagnostics - ', '') : '—'
  }

  // ==========================================
  // ROLE FUNCTIONS
  // ==========================================
  const allRoles   = [...SYSTEM_ROLES, ...customRoles]
  const totalUsers = allRoles.reduce((s,r)=>s+r.users,0)

  const openCreateRole = () => { setEditingRole(null); setRoleForm({ name:'', desc:'', perms:[] }); setRoleModal('create') }
  const openEditRole   = (r) => {
    setEditingRole(r)
    setRoleForm({ name:r.name, desc:r.desc, perms:[...r.perms] })
    setRoleModal('edit')
  }
  const closeRoleModal = () => { setRoleModal(null); setEditingRole(null) }

  const toggleRolePerm = (p) => setRoleForm(f=>({
    ...f, perms: f.perms.includes(p) ? f.perms.filter(x=>x!==p) : [...f.perms, p]
  }))

  const saveRole = () => {
    if (!roleForm.name.trim()) {
  setRoleForm(f => ({ ...f, error: 'Role name is required' }))
  return
}
    if (roleModal === 'edit' && editingRole?.type === 'system') {
      showToast('System roles cannot be modified'); return
    }
    if (roleModal === 'edit') {
      setCustomRoles(rs => rs.map(r => r._id===editingRole._id ? {...r, ...roleForm} : r))
      showToast('Role updated')
    } else {
      setCustomRoles(rs => [...rs, { _id: String(Date.now()), type:'custom', users:0, ...roleForm }])
      showToast('Role created successfully')
    }
    closeRoleModal()
  }

  const duplicateRole = (r) => {
    setCustomRoles(rs => [...rs, { ...r, _id:String(Date.now()), name:`${r.name} (Copy)`, type:'custom', users:0 }])
    showToast(`"${r.name}" duplicated`)
  }

  const removeRole = (e, id) => {
    e.stopPropagation()
    if (!window.confirm('Delete this custom role? This cannot be undone.')) return
    setCustomRoles(rs => rs.filter(r => r._id !== id))
    showToast('Role deleted')
  }

  const renderPerms = (perms) => {
    const max = 3
    const visible = perms.slice(0, max)
    const extra   = perms.length - max
    return (
      <div className={styles.perms} style={{marginTop: 8}}>
        {visible.map(p=>(
          <span key={p} className={`${styles.permTag} ${PERM_BADGE[p]||'badge-gray'}`}>{p}</span>
        ))}
        {extra > 0 && <span className={styles.permTag} style={{background:'#F1F5F9',color:'var(--muted)'}}>+{extra} more</span>}
      </div>
    )
  }

  // ==========================================
  // RENDER DATA PREP
  // ==========================================
  const filteredUsers = users.filter(u => {
    const matchRole   = roleFilter === 'all' || u.role === roleFilter
    const q           = search.toLowerCase()
    const matchSearch = !q || u.fullName?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q)
    return matchRole && matchSearch
  })

  const facilityAdmins = users.filter(u => u.role === 'facility_admin')
  const unassigned     = facilityAdmins.filter(u => !u.clinicId)


  return (
    <div className={styles.page}>
      {toast && <div style={{position:'fixed', top:24, right:24, background:'#1F2937', color:'#fff', padding:'10px 18px', borderRadius:8, zIndex:20000, fontSize:13, fontWeight:500, boxShadow:'0 4px 20px rgba(0,0,0,0.2)'}}>{toast}</div>}

      {/* HEADER SECTION */}
      <div className={styles.header}>
        <div>
          <div className={styles.title}>User Management</div>
          <div className={styles.sub}>Add, edit, and manage system access for all personnel</div>
        </div>
        
        {/* Manage Roles Modal Trigger */}
        <button className="btn btn-outline" onClick={() => setShowRoleManager(true)} style={{display: 'flex', gap: 6, alignItems: 'center'}}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          Manage Roles & Permissions
        </button>
      </div>

      {/* PAGE TABS */}
      <div className={styles.pageTabs}>
        <button className={`${styles.pageTab} ${tab==='list'?styles.pageTabActive:''}`} onClick={() => setTab('list')}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
          User List
        </button>
        <button className={`${styles.pageTab} ${tab==='create'?styles.pageTabActive:''}`} onClick={() => setTab('create')}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
          Create New User
        </button>
      </div>

      {/* ── 1. USER LIST TAB ── */}
      {tab === 'list' && (
        <>
          {unassigned.length > 0 && (
            <div style={{padding:'10px 14px',background:'#FEF3C7',border:'1px solid #F59E0B',borderRadius:8,marginBottom:12,fontSize:13,color:'#92400E',display:'flex',alignItems:'center',gap:8}}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              <span><strong>{unassigned.length} Facility Admin{unassigned.length>1?'s':''}</strong> without a clinic assignment. Use the <strong>Assign Clinic</strong> button below.</span>
            </div>
          )}

          <div className="card">
            <div className={styles.toolbar}>
              <div className="search-bar" style={{flex:1,maxWidth:300}}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                <input placeholder="Search by name or email..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <select className="dropdown-select" value={roleFilter} onChange={e => setRoleF(e.target.value)}>
                <option value="all">All Roles</option>
                <option value="super_admin">System Administrator</option>
                <option value="facility_admin">Facility Admin</option>
                <option value="staff">Staff</option>
                <option value="patient">Patient</option>
              </select>
              <button className="btn btn-outline btn-sm" onClick={loadUsers}>Refresh</button>
            </div>

            <div style={{display:'flex',gap:12,padding:'12px 0',borderBottom:'1px solid var(--border)'}}>
              {[
                ['Total Users',    users.length,                                      'var(--text)'],
                ['Sys Admin',      users.filter(u=>u.role==='super_admin').length,    '#7C3AED'],
                ['Facility Admin', users.filter(u=>u.role==='facility_admin').length, '#2563EB'],
                ['Staff',          users.filter(u=>u.role==='staff').length,          '#0D9488'],
                ['Active',         users.filter(u=>u.isActive).length,                '#16A34A'],
                ['Inactive',       users.filter(u=>!u.isActive).length,               '#6B7280'],
              ].map(([label, val, color]) => (
                <div key={label} style={{flex:1,textAlign:'center',padding:'8px 4px',background:'var(--bg)',borderRadius:8}}>
                  <div style={{fontSize:20,fontWeight:700,color}}>{val}</div>
                  <div style={{fontSize:11,color:'var(--muted)',marginTop:2}}>{label}</div>
                </div>
              ))}
            </div>

            <div className="table-wrap" style={{border:'none',borderRadius:0}}>
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Role</th>
                    <th>Assigned Clinic</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading
                    ? <tr><td colSpan={6} style={{textAlign:'center',padding:32,color:'var(--muted)'}}>Loading users…</td></tr>
                    : filteredUsers.length === 0
                    ? <tr><td colSpan={6} style={{textAlign:'center',padding:32,color:'var(--muted)'}}>No users found</td></tr>
                    : filteredUsers.map(u => (
                      <tr key={u._id} style={{opacity: u.isActive ? 1 : 0.55}}>
                        <td>
                          <div style={{fontWeight:600,fontSize:13}}>{u.fullName}</div>
                          <div style={{fontSize:11,color:'var(--muted)'}}>{u.email}</div>
                        </td>
                        <td>
                          <span className={`badge ${ROLE_BADGE[u.role]||'badge-gray'}`}>
                            {ROLE_LABELS[u.role]||u.role}
                          </span>
                        </td>
                        <td style={{fontSize:13}}>
                          {u.role === 'facility_admin' ? (
                            <span style={{ color: u.clinicId ? 'var(--text)' : '#D97706', fontWeight: u.clinicId ? 400 : 600 }}>
                              {clinicName(u) === '—' ? '⚠ Not assigned' : clinicName(u)}
                            </span>
                          ) : clinicName(u)}
                        </td>
                        <td>
                          <span className={`badge ${u.isActive ? 'badge-green' : 'badge-gray'}`}>
                            {u.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td style={{fontSize:12,color:'var(--muted)'}}>
                          {new Date(u.createdAt).toLocaleDateString('en-PH',{month:'short',day:'numeric',year:'numeric'})}
                        </td>
                        <td>
                          <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
                            {u.role === 'facility_admin' && (
                              <button className="btn btn-primary btn-sm" onClick={() => openAssign(u)}>
                                Assign Clinic
                              </button>
                            )}
                            {u.isActive ? (
                              <button className="btn btn-sm" style={{background:'var(--error-lt)',color:'var(--error)',border:'none'}} onClick={() => setDeactivateTarget(u)}>
                                Deactivate
                              </button>
                            ) : (
                              <button className="btn btn-outline btn-sm" onClick={() => handleReactivate(u)}>
                                Reactivate
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  }
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ── 2. CREATE USER TAB ── */}
      {tab === 'create' && (
        <>
          <div className={`card ${styles.banner}`}>
            <div className={styles.bannerIcon}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/>
              </svg>
            </div>
            <div>
              <div className={styles.bannerTitle}>Create New User</div>
              <div className={styles.bannerSub}>Add a new user to the HealthQueue+ system. Default password: <strong>HealthQueue@2025</strong></div>
            </div>
          </div>

          {userSuccess && <div className="alert alert-success">{userSuccess}</div>}
          {userError   && <div className="alert alert-error">{userError}</div>}

          <div className={`card ${styles.section}`}>
            <div className={styles.sectionTitle}>Personal Information</div>
            <div className={styles.formGrid2}>
              <div className="form-group">
                <label className="form-label">First Name <span className={styles.req}>*</span></label>
                <input className="form-input" placeholder="First name" value={userForm.firstName} onChange={e => setUserForm(f=>({...f,firstName:e.target.value}))} />
              </div>
              <div className="form-group">
                <label className="form-label">Last Name</label>
                <input className="form-input" placeholder="Last name" value={userForm.lastName} onChange={e => setUserForm(f=>({...f,lastName:e.target.value}))} />
              </div>
              <div className="form-group">
                <label className="form-label">Email Address <span className={styles.req}>*</span></label>
                <input className="form-input" type="email" placeholder="user@example.com" value={userForm.email} onChange={e => setUserForm(f=>({...f,email:e.target.value}))} />
              </div>
              <div className="form-group">
                <label className="form-label">Phone Number</label>
                <input className="form-input" placeholder="+63 9XX XXX XXXX" value={userForm.phone} onChange={e => setUserForm(f=>({...f,phone:e.target.value}))} />
              </div>
            </div>
          </div>

          <div className={`card ${styles.section}`}>
            <div className={styles.sectionTitle}>Account Information</div>
            <div className={styles.formGrid2}>
              <div className="form-group">
                <label className="form-label">Role <span className={styles.req}>*</span></label>
                <select className="form-select" value={userForm.role} onChange={e => setUserForm(f=>({...f,role:e.target.value,clinicId:''}))}>
                  {CREATE_ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]||r}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">
                  Assign Clinic
                  {userForm.role === 'facility_admin' && <span className={styles.req}> *</span>}
                </label>
                <select className="form-select" value={userForm.clinicId} onChange={e => setUserForm(f=>({...f,clinicId:e.target.value}))}>
                  <option value="">
                    {userForm.role === 'facility_admin' ? '— Select clinic (required) —' : '— None —'}
                  </option>
                  {clinics.map(cl => <option key={cl._id} value={cl._id}>{cl.name.replace('Hi-Precision Diagnostics - ','')}</option>)}
                </select>
                {userForm.role === 'facility_admin' && !userForm.clinicId && (
                  <div style={{fontSize:11,color:'#D97706',marginTop:4}}>Facility Admin must be assigned to a clinic.</div>
                )}
              </div>
            </div>
          </div>

          <div className={`card ${styles.section}`}>
            <div className={styles.sectionTitle}>Permissions</div>
            {Object.entries(PERMISSIONS).map(([group, perms]) => (
              <div key={group} className={styles.permGroup}>
                <div className={styles.permGroupTitle}>{group}</div>
                <div className={styles.permGrid}>
                  {perms.map(p => (
                    <label key={p} className={styles.permItem}>
                      <input type="checkbox" checked={userForm.permissions.includes(p)} onChange={() => toggleUserPerm(p)} className={styles.permCheck} />
                      <span className={styles.permLabel}>{p}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className={styles.actions}>
            <button className="btn btn-outline" onClick={() => { setUserForm(EMPTY_USER_FORM); setUserError(''); setUserSuccess('') }}>Clear</button>
            <button className="btn btn-outline" onClick={() => setTab('list')}>Back to List</button>
            <button className="btn btn-primary" onClick={handleCreateUser} disabled={savingUser}>
              {savingUser ? 'Creating…' : 'Create User'}
            </button>
          </div>
        </>
      )}


      {/* =========================================
          MODALS
      ========================================= */}

      {/* ── ROLE MANAGEMENT OVERLAY MODAL (Forced Fixed Popup) ── */}
      {showRoleManager && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9000, padding: '24px'
        }} onClick={() => setShowRoleManager(false)}>
          
          <div style={{
            background: '#f8fafc', borderRadius: '16px', width: '100%',
            maxWidth: '1100px', maxHeight: '90vh', display: 'flex', flexDirection: 'column',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', overflow: 'hidden'
          }} onClick={e => e.stopPropagation()}>
            
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px 32px', background: '#fff', borderBottom: '1px solid var(--border)' }}>
              <div>
                <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)' }}>Role & Permissions Directory</div>
                <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>Manage system access levels for your organization</div>
              </div>
              <button 
                onClick={() => setShowRoleManager(false)}
                style={{ background: 'transparent', border: 'none', fontSize: 28, color: 'var(--muted)', cursor: 'pointer' }}
              >
                ×
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '32px', overflowY: 'auto', flex: 1 }}>
              <div style={{display: 'flex', justifyContent: 'flex-end', marginBottom: 20}}>
                 <button className="btn btn-primary" onClick={openCreateRole}>
                   <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                   Create Custom Role
                 </button>
              </div>

              <div className={styles.rolesGrid}>
                {allRoles.map(role => (
                  <div key={role._id} className={`card ${styles.roleCard}`} style={{boxShadow: '0 2px 8px rgba(0,0,0,0.04)'}}>
                    <div className={styles.roleHeader}>
                      <div className={styles.roleIcon}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                      </div>
                      <div>
                        <div className={styles.roleName}>{role.name}</div>
                        <span className={`badge ${role.type==='system'?'badge-gray':'badge-blue'}`} style={{fontSize:10}}>{role.type}</span>
                      </div>
                    </div>

                    <div className={styles.roleDesc}>{role.desc}</div>

                    <div className={styles.roleUsers}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                      {role.users} users
                    </div>

                    <div style={{fontSize: 12, fontWeight: 600, color: 'var(--text-2)', marginTop: 8}}>Permissions:</div>
                    {renderPerms(role.perms)}

                    <div className={styles.roleActions}>
                      <button className={styles.actBtn} onClick={()=>openEditRole(role)}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        Edit
                      </button>
                      <button className={styles.actBtn} onClick={()=>duplicateRole(role)}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                        Duplicate
                      </button>
                      {role.type === 'custom' && (
                        <button className={`${styles.actBtn} ${styles.actDel}`} onClick={(e) => removeRole(e, role._id)}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{pointerEvents:'none'}}><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── CREATE / EDIT SINGLE ROLE MODAL ── */}
      {roleModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999, padding: '24px'
        }} onClick={e=>e.target===e.currentTarget&&closeRoleModal()}>
          <div style={{
            background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '520px', 
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', overflow: 'hidden'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontSize: 16, fontWeight: 700 }}>{roleModal==='edit'?'Edit Role':'Create Custom Role'}</div>
              <button onClick={closeRoleModal} style={{ background: 'transparent', border: 'none', fontSize: 24, cursor: 'pointer', color: 'var(--muted)' }}>×</button>
            </div>
            <div style={{ padding: '24px' }}>
              {roleModal==='edit' && editingRole?.type==='system' && (
                <div style={{padding:'10px 14px',background:'#FFF7ED',borderRadius:8,fontSize:12,color:'#92400E',marginBottom:16,borderLeft:'3px solid #D97706'}}>
                  System roles are read-only. Duplicate this role to create a custom variant.
                </div>
              )}
             <div className="form-group" style={{marginBottom: 16}}>
  <label className="form-label" style={{fontWeight:600, fontSize:12, color:'var(--text-2)'}}>
    Role Name *
  </label>

  <input className="form-input" style={{
      width:'100%',
      padding:'10px 14px',
      borderRadius:8,
      border: roleForm.error
        ? '1px solid #DC2626'
        : '1px solid var(--border)'
    }}
    value={roleForm.name}
    onChange={e => setRoleForm(f => ({ ...f, name:e.target.value,  error:'' })) } placeholder="e.g. Administrator, Lab Staff, etc." />

  {roleForm.error && (
    <div
      style={{
        color:'#DC2626',
        fontSize:12,
        marginTop:6,
        fontWeight:500,
      }}
    >
      {roleForm.error}
    </div>
  )}
</div>
              <div className="form-group" style={{marginBottom: 16}}>
                <label className="form-label" style={{fontWeight:600, fontSize:12, color:'var(--text-2)'}}>Description</label>
                <input className="form-input" style={{width:'100%', padding:'10px 14px', borderRadius:8, border:'1px solid var(--border)'}} value={roleForm.desc}
                  onChange={e=>setRoleForm(f=>({...f,desc:e.target.value}))}
                  placeholder="Describe what this role can do"
                  disabled={roleModal==='edit' && editingRole?.type==='system'} />
              </div>
              <div className="form-group">
                <label className="form-label" style={{fontWeight:600, fontSize:12, color:'var(--text-2)', marginBottom:8, display:'block'}}>Permissions</label>
                <div className={styles.permGrid}>
                  {PERM_OPTIONS.map(p=>(
                    <label key={p} className={`${styles.permCheck2} ${roleForm.perms.includes(p)?styles.permChecked:''}`}>
                      <input type="checkbox" checked={roleForm.perms.includes(p)}
                        onChange={()=>!(roleModal==='edit'&&editingRole?.type==='system')&&toggleRolePerm(p)}
                        style={{display:'none'}} />
                      <span className={styles.permCheckBox}>
                        {roleForm.perms.includes(p) && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
                      </span>
                      {p}
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ padding: '20px 24px', background: '#f8fafc', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button className="btn btn-outline" onClick={closeRoleModal}>Cancel</button>
              {!(roleModal==='edit' && editingRole?.type==='system') && (
                <button className="btn btn-primary" onClick={saveRole}>
                  {roleModal==='edit' ? 'Save Changes' : 'Create Role'}
                </button>
              )}
              {roleModal==='edit' && editingRole?.type==='system' && (
                <button className="btn btn-primary" onClick={()=>{duplicateRole(editingRole);closeRoleModal()}}>
                  Duplicate & Customize
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* USER: ASSIGN CLINIC MODAL */}
      {assignModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9000, padding: '24px'
        }} onClick={e => e.target===e.currentTarget && setAssignModal(null)}>
          <div style={{ background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '440px', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontSize: 16, fontWeight: 700 }}>Assign Clinic</div>
              <button onClick={() => setAssignModal(null)} style={{ background: 'transparent', border: 'none', fontSize: 24, cursor: 'pointer', color: 'var(--muted)' }}>×</button>
            </div>
            <div style={{ padding: '24px' }}>
              <p style={{fontSize:13,marginBottom:16,color:'var(--muted)'}}>
                Assigning clinic for <strong style={{color:'var(--text)'}}>{assignModal.fullName}</strong> ({assignModal.email})
              </p>
              <div className="form-group">
                <label className="form-label" style={{fontWeight:600, fontSize:12, color:'var(--text-2)'}}>Select Clinic</label>
                <select className="form-select" style={{width:'100%', padding:'10px 14px', borderRadius:8, border:'1px solid var(--border)'}} value={assignClinic} onChange={e => setAssignClinic(e.target.value)}>
                  <option value="">— Remove clinic assignment —</option>
                  {clinics.map(cl => (
                    <option key={cl._id} value={cl._id}>
                      {cl.name.replace('Hi-Precision Diagnostics - ','')}
                      {cl.status === 'open' ? ' ✓' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div style={{ padding: '20px 24px', background: '#f8fafc', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button className="btn btn-outline" onClick={() => setAssignModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleAssign} disabled={assigning}>
                {assigning ? 'Saving…' : 'Save Assignment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* USER: DEACTIVATE CONFIRM MODAL */}
      {deactivateTarget && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9000, padding: '24px'
        }} onClick={e => e.target===e.currentTarget && setDeactivateTarget(null)}>
          <div style={{ background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '400px', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontSize: 16, fontWeight: 700 }}>Deactivate User</div>
              <button onClick={() => setDeactivateTarget(null)} style={{ background: 'transparent', border: 'none', fontSize: 24, cursor: 'pointer', color: 'var(--muted)' }}>×</button>
            </div>
            <div style={{ padding: '24px' }}>
              <p style={{fontSize:13,color:'var(--muted)', margin:0}}>
                Are you sure you want to deactivate <strong style={{color:'var(--text)'}}>{deactivateTarget.fullName}</strong>?
                They will no longer be able to log in.
              </p>
            </div>
            <div style={{ padding: '20px 24px', background: '#f8fafc', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button className="btn btn-outline" onClick={() => setDeactivateTarget(null)}>Cancel</button>
              <button className="btn btn-sm" style={{background:'var(--error)',color:'#fff',border:'none',padding:'8px 16px',borderRadius:6,cursor:'pointer'}} onClick={() => handleDeactivate(deactivateTarget)}>
                Yes, Deactivate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, sub, color }) {
  const fg = {blue:'#2563EB',green:'#16A34A',purple:'#7C3AED'}
  return (
    <div className={`card ${styles.statCard}`}>
      <div className={styles.statLabel}>{label}</div>
      <div className={styles.statValue} style={{color:color?fg[color]:'var(--text)'}}>{value}</div>
      {sub && <div className={styles.statSub} style={{color:color?fg[color]:'var(--muted)'}}>{sub}</div>}
    </div>
  )
}