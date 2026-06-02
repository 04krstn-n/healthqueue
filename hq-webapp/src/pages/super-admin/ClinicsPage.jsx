import { useState, useEffect } from 'react'
import { clinicsApi } from '../../services/api'
import styles from './super-admin.module.css'

const STATUS_BADGE = { active: 'badge-green', inactive: 'badge-gray', maintenance: 'badge-warn' }

const EMPTY_FORM = {
  name: '', address: '', city: '', province: '',
  contactNumber: '', email: '', operatingHours: '8:00 AM - 5:00 PM',
  maxQueueCapacity: 60, acceptsWalkIn: true, acceptsAppointment: true, status: 'active'
}

export default function ClinicsPage() {
  const [clinics,    setClinics]    = useState([])
  const [loading,    setLoading]    = useState(true)
  const [showModal,  setShowModal]  = useState(false)
  const [editing,    setEditing]    = useState(null)
  const [form,       setForm]       = useState(EMPTY_FORM)
  const [search,     setSearch]     = useState('')
  const [toast,      setToast]      = useState('')
  const [deleting,   setDeleting]   = useState(null)

  const showToast = (m) => { setToast(m); setTimeout(() => setToast(''), 3000) }

  const load = () => {
    setLoading(true)
    clinicsApi.list()
      .then(r => setClinics(r.data || []))
      .catch(() => showToast('Failed to load clinics'))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const openCreate = () => { setEditing(null); setForm(EMPTY_FORM); setShowModal(true) }
  const openEdit   = (c) => { setEditing(c); setForm({ ...EMPTY_FORM, ...c }); setShowModal(true) }

  const save = async () => {
    if (!form.name || !form.address || !form.city) {
      showToast('Name, address and city are required.'); return
    }
    try {
      if (editing) await clinicsApi.update(editing._id, form)
      else         await clinicsApi.create(form)
      showToast(editing ? 'Clinic updated successfully' : 'Clinic created successfully')
      setShowModal(false)
      load()
    } catch (e) { showToast(e?.response?.data?.message || 'Failed to save clinic') }
  }

  const remove = async (id) => {
    try {
      await clinicsApi.delete(id)
      showToast('Clinic removed')
      setDeleting(null)
      load()
    } catch (e) { showToast(e?.response?.data?.message || 'Failed to remove clinic') }
  }

  const F = (field, label, type='text', opts=null) => (
    <div className="form-group">
      <label className="form-label">{label}</label>
      {opts
        ? <select className="form-select" value={form[field]??''} onChange={e=>setForm(f=>({...f,[field]:e.target.value}))}>
            {opts.map(o=><option key={o.value??o} value={o.value??o}>{o.label??o}</option>)}
          </select>
        : type==='toggle'
          ? <Toggle value={!!form[field]} onChange={v=>setForm(f=>({...f,[field]:v}))} />
          : <input className="form-input" type={type} value={form[field]??''} onChange={e=>setForm(f=>({...f,[field]:type==='number'?Number(e.target.value):e.target.value}))} />
      }
    </div>
  )

  const filtered = clinics.filter(c =>
    !search || c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.city?.toLowerCase().includes(search.toLowerCase())
  )

  const totalActive = clinics.filter(c => c.status === 'active').length

  return (
    <div className={styles.page}>
      {toast && <div className={styles.toast}>{toast}</div>}

      {/* Header */}
      <div className={styles.header}>
        <div>
          <div className={styles.title}>Clinic Management</div>
          <div className={styles.sub}>Manage all registered health facilities on the platform</div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={openCreate}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Clinic
        </button>
      </div>

      {/* Stats */}
      <div className={styles.statsRow}>
        <div className={"card " + styles.statCard}>
          <div className={styles.statLabel}>Total Clinics</div>
          <div className={styles.statValue}>{clinics.length}</div>
        </div>
        <div className={"card " + styles.statCard}>
          <div className={styles.statLabel}>Active</div>
          <div className={styles.statValue} style={{color:'#16A34A'}}>{totalActive}</div>
        </div>
        <div className={"card " + styles.statCard}>
          <div className={styles.statLabel}>Inactive</div>
          <div className={styles.statValue} style={{color:'#6B7280'}}>{clinics.length - totalActive}</div>
        </div>
      </div>

      {/* Toolbar */}
      <div className={styles.toolbar}>
        <div className="search-bar" style={{flex:1,maxWidth:320}}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input placeholder="Search clinic name or city..." value={search} onChange={e=>setSearch(e.target.value)} />
        </div>
        <button className="btn btn-outline btn-sm" onClick={load}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
          Refresh
        </button>
      </div>

      {/* Table */}
      <div className="card">
        {loading
          ? <div style={{padding:40,textAlign:'center',color:'var(--muted)'}}>Loading clinics…</div>
          : <div className="table-wrap" style={{border:'none',borderRadius:0}}>
              <table>
                <thead>
                  <tr><th>Clinic Name</th><th>Location</th><th>Contact</th><th>Capacity</th><th>Walk-in</th><th>Status</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {filtered.length === 0
                    ? <tr><td colSpan="7" style={{textAlign:'center',padding:32,color:'var(--muted)'}}>No clinics found</td></tr>
                    : filtered.map(c => (
                      <tr key={c._id}>
                        <td>
                          <div style={{fontWeight:600,fontSize:13}}>{c.name}</div>
                          <div style={{fontSize:11,color:'var(--muted)'}}>{c.email}</div>
                        </td>
                        <td style={{fontSize:13}}>{c.city}{c.province ? ', '+c.province : ''}</td>
                        <td style={{fontSize:13}}>{c.contactNumber}</td>
                        <td style={{fontSize:13}}>{c.maxQueueCapacity} patients</td>
                        <td>
                          <span className={'badge '+(c.acceptsWalkIn?'badge-green':'badge-gray')}>{c.acceptsWalkIn?'Yes':'No'}</span>
                        </td>
                        <td>
                          <span className={'badge '+(STATUS_BADGE[c.status]||'badge-gray')}>{c.status||'active'}</span>
                        </td>
                        <td>
                          <div style={{display:'flex',gap:4}}>
                            <button className="btn btn-outline btn-sm" onClick={()=>openEdit(c)}>Edit</button>
                            <button className="btn btn-sm" style={{background:'var(--error-lt)',color:'var(--error)'}} onClick={()=>setDeleting(c._id)}>Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))
                  }
                </tbody>
              </table>
            </div>
        }
      </div>

      {/* Delete confirm */}
      {deleting && (
        <div className="modal-overlay" onClick={()=>setDeleting(null)}>
          <div className="modal" style={{maxWidth:400}} onClick={e=>e.stopPropagation()}>
            <div className="modal-header"><div className="modal-title">Confirm Delete</div></div>
            <div className="modal-body"><p style={{fontSize:14,color:'var(--text-2)'}}>Are you sure you want to remove this clinic? This action cannot be undone.</p></div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={()=>setDeleting(null)}>Cancel</button>
              <button className="btn btn-sm" style={{background:'var(--error)',color:'#fff'}} onClick={()=>remove(deleting)}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setShowModal(false)}>
          <div className="modal" style={{maxWidth:560}}>
            <div className="modal-header">
              <div className="modal-title">{editing?'Edit Clinic':'Add New Clinic'}</div>
              <button className="modal-close" onClick={()=>setShowModal(false)}>×</button>
            </div>
            <div className="modal-body" style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 16px'}}>
              <div style={{gridColumn:'1/-1'}}>{F('name','Clinic Name')}</div>
              {F('address','Address')}
              {F('city','City')}
              {F('province','Province')}
              {F('contactNumber','Contact Number')}
              {F('email','Email','email')}
              {F('operatingHours','Operating Hours')}
              {F('maxQueueCapacity','Max Queue Capacity','number')}
              {F('status','Status','text',[{value:'active',label:'Active'},{value:'inactive',label:'Inactive'},{value:'maintenance',label:'Maintenance'}])}
              <div className="form-group">
                <label className="form-label">Accepts Walk-in</label>
                <Toggle value={!!form.acceptsWalkIn} onChange={v=>setForm(f=>({...f,acceptsWalkIn:v}))} />
              </div>
              <div className="form-group">
                <label className="form-label">Accepts Appointments</label>
                <Toggle value={!!form.acceptsAppointment} onChange={v=>setForm(f=>({...f,acceptsAppointment:v}))} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={()=>setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={save}>{editing?'Save Changes':'Create Clinic'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Toggle({ value, onChange }) {
  return (
    <button style={{width:44,height:24,borderRadius:99,background:value?'#2563EB':'var(--border)',border:'none',cursor:'pointer',position:'relative',marginTop:4}} onClick={()=>onChange(!value)}>
      <span style={{position:'absolute',top:3,left:value?22:3,width:18,height:18,background:'#fff',borderRadius:'50%',transition:'left .2s',display:'block',boxShadow:'0 1px 3px rgba(0,0,0,.2)'}} />
    </button>
  )
}
