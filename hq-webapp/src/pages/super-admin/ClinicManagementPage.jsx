import { useState, useEffect } from 'react'
import { clinicsApi } from '../../services/api'
import styles from './super-admin.module.css'

const STATUS_BADGE = { open:'badge-green', active:'badge-green', busy:'badge-warn', closed:'badge-gray', maintenance:'badge-warn', inactive:'badge-gray' }
const EMPTY_FORM = {
  name:'', city:'', errors:{}, address:'', province:'', contactNumber:'', email:'',
  operatingHours:'8:00 AM - 5:00 PM', maxQueueCapacity:60,
  acceptsWalkIn:true, acceptsAppointment:true, status:'open',
  facilityType:'City Health Center', region:'NCR', services:[],
}

export default function ClinicManagementPage() {
  const [clinics,   setClinics]  = useState([])
  const [loading,   setLoading]  = useState(true)
  const [search,    setSearch]   = useState('')
  const [statusFilter, setStatus]= useState('all')
  const [modal,     setModal]    = useState(null)  // null | 'add' | 'edit' | 'view'
  const [selected,  setSelected] = useState(null)
  const [form,      setForm]     = useState(EMPTY_FORM)
  const [saving,    setSaving]   = useState(false)
  const [deleting,  setDeleting] = useState(null)
  const [toast,     setToast]    = useState('')

  const showToast = (m) => { setToast(m); setTimeout(() => setToast(''), 3000) }

  const load = () => {
    setLoading(true)
    clinicsApi.list()
      .then(r => setClinics(r.data || []))
      .catch(() => showToast('Failed to load clinics'))
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  const openAdd  = () => { setSelected(null); setForm(EMPTY_FORM); setModal('add') }
  const openEdit = (c) => { setSelected(c); setForm({ ...EMPTY_FORM, ...c }); setModal('edit') }
  const openView = (c) => { setSelected(c); setModal('view') }
  const close    = () => { setModal(null); setSelected(null) }

  const save = async () => {
    const errors = {}

if (!form.name.trim()) {
  errors.name = 'Clinic name is required'
}

if (!form.city.trim()) {
  errors.city = 'City is required'
}

if (Object.keys(errors).length > 0) {
  setForm(f => ({ ...f, errors }))
  return
}
    setSaving(true)
    try {
      if (modal === 'edit') await clinicsApi.update(selected._id, form)
      else                  await clinicsApi.create(form)
      showToast(modal === 'edit' ? 'Clinic updated' : 'Clinic added to the system')
      close(); load()
    } catch (e) { showToast(e?.response?.data?.message || 'Failed to save clinic') }
    finally { setSaving(false) }
  }

  const remove = async (id) => {
    try {
      await clinicsApi.delete(id)
      showToast('Clinic removed'); setDeleting(null); load()
    } catch (e) { showToast(e?.response?.data?.message || 'Cannot delete clinic with existing records') }
  }

  const filtered = clinics.filter(c => {
    const matchStatus = statusFilter === 'all' || c.status === statusFilter
    const matchSearch = !search || c.name?.toLowerCase().includes(search.toLowerCase()) || c.city?.toLowerCase().includes(search.toLowerCase())
    return matchStatus && matchSearch
  })

  const F = (field, label, type='text', opts=null) => (
    <div className="form-group">
      <label className="form-label">{label}</label>
      {opts
        ? <select className="form-select" value={form[field]??''} onChange={e=>setForm(f=>({...f,[field]:e.target.value}))}>
            {opts.map(o=><option key={o.value??o} value={o.value??o}>{o.label??o}</option>)}
          </select>
        : type==='toggle'
          ? <label style={{display:'flex',alignItems:'center',gap:8,cursor:'pointer'}}>
              <input type="checkbox" checked={!!form[field]} onChange={e=>setForm(f=>({...f,[field]:e.target.checked}))} />
              <span style={{fontSize:13,color:'var(--text-2)'}}>{label}</span>
            </label>
         : <>
    <input
      className="form-input"
      type={type}
      value={form[field] ?? ''}
      style={{
        border: form.errors?.[field]
          ? '1px solid #DC2626'
          : undefined
      }}
      onChange={e =>
        setForm(f => ({
          ...f,
          [field]:
            type === 'number'
              ? Number(e.target.value)
              : e.target.value,
          errors: {
            ...f.errors,
            [field]: ''
          }
        }))
      }
    />

    {form.errors?.[field] && (
      <div
        style={{
          color:'#DC2626',
          fontSize:12,
          marginTop:6,
          fontWeight:500,
        }}
      >
        {form.errors[field]}
      </div>
    )}
  </>
      }
    </div>
  )

  return (
    <div className={styles.page}>
      {toast && <div className={styles.toast}>{toast}</div>}

      <div className={styles.header}>
        <div>
          <div className={styles.title}>Clinic Management</div>
          <div className={styles.sub}>Manage all registered health facilities</div>
        </div>
        <div className={styles.toolbar}>
          <input className="form-input" style={{width:200}} placeholder="Search clinics…"
            value={search} onChange={e=>setSearch(e.target.value)} />
          <select className="form-select" style={{width:130}} value={statusFilter} onChange={e=>setStatus(e.target.value)}>
            <option value="all">All Status</option>
            <option value="open">Open</option>
            <option value="active">Active</option>
            <option value="closed">Closed</option>
            <option value="maintenance">Maintenance</option>
          </select>
          <button className="btn btn-primary" onClick={openAdd}>+ Add Clinic</button>
        </div>
      </div>

      {/* Stats */}
      <div className={styles.statsRow} style={{gridTemplateColumns:'repeat(3,1fr)'}}>
        <div className={`card ${styles.statCard}`}>
          <div className={styles.statLabel}>Total Clinics</div>
          <div className={styles.statValue}>{clinics.length}</div>
        </div>
        <div className={`card ${styles.statCard}`}>
          <div className={styles.statLabel}>Active / Open</div>
          <div className={styles.statValue} style={{color:'#16A34A'}}>{clinics.filter(c=>['active','open'].includes(c.status)).length}</div>
        </div>
        <div className={`card ${styles.statCard}`}>
          <div className={styles.statLabel}>Total Services</div>
          <div className={styles.statValue}>{clinics.reduce((s,c)=>s+(c.services?.length||0),0)}</div>
        </div>
      </div>

      {/* Clinic cards */}
      {loading
        ? <div style={{padding:40,textAlign:'center',color:'var(--muted)'}}>Loading clinics…</div>
        : filtered.length === 0
          ? <div style={{padding:40,textAlign:'center',color:'var(--muted)'}}>No clinics found.</div>
          : <div className={styles.clinicGrid}>
              {filtered.map(c => (
                <div key={c._id} className={`card ${styles.clinicCard}`}>
                  <div className={styles.clinicHead}>
                    <div>
                      <div className={styles.clinicName}>{c.name}</div>
                      <div className={styles.clinicMeta}>
                        <span>{c.facilityType || 'Health Clinic'}</span>
                        <span>{c.city}, {c.province}</span>
                        {c.contactNumber && <span>{c.contactNumber}</span>}
                        {c.operatingHours && <span>{c.operatingHours}</span>}
                      </div>
                    </div>
                    <span className={`badge ${STATUS_BADGE[c.status]||'badge-gray'}`}>{c.status}</span>
                  </div>

                  {/* Services from DB */}
                  {(c.services||[]).length > 0 && (
                    <div style={{display:'flex',flexWrap:'wrap',gap:4,marginTop:4}}>
                      {c.services.slice(0,4).map((s,i)=>(
                        <span key={i} className="badge badge-blue" style={{fontSize:10}}>
                          {typeof s === 'string' ? s : s.name}
                        </span>
                      ))}
                      {c.services.length > 4 && (
                        <span className="badge badge-gray" style={{fontSize:10}}>+{c.services.length-4} more</span>
                      )}
                    </div>
                  )}

                  <div className={styles.clinicStats}>
                    <div className={styles.cStat}>
                      <div className={styles.cStatVal}>{c.services?.length || 0}</div>
                      <div className={styles.cStatLbl}>Services</div>
                    </div>
                    <div className={styles.cStat}>
                      <div className={styles.cStatVal}>{c.maxQueueCapacity || 60}</div>
                      <div className={styles.cStatLbl}>Max Queue</div>
                    </div>
                    <div className={styles.cStat}>
                      <div className={styles.cStatVal}>{c.acceptsWalkIn ? 'Yes' : 'No'}</div>
                      <div className={styles.cStatLbl}>Walk-in</div>
                    </div>
                  </div>

                  <div className={styles.clinicActions}>
                    <button className="btn btn-outline" style={{flex:1,fontSize:12}} onClick={()=>openView(c)}>View</button>
                    <button className="btn btn-outline" style={{flex:1,fontSize:12}} onClick={()=>openEdit(c)}>Edit</button>
                    <button className="btn" style={{flex:0,fontSize:12,padding:'6px 10px',color:'var(--error)',background:'var(--error-lt)',border:'none'}}
                      onClick={()=>setDeleting(c._id)}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
      }

      {/* Add/Edit Modal */}
      {(modal==='add'||modal==='edit') && (
        <div className="modal-overlay" onClick={close}>
          <div className="modal" style={{maxWidth:560}} onClick={e=>e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">{modal==='edit'?'Edit Clinic':'Add New Clinic'}</span>
              <button className="modal-close" onClick={close}>✕</button>
            </div>
            <div className="modal-body">
              <div className={styles.formGrid2}>
                {F('name','Clinic Name *')}
                {F('facilityType','Facility Type','text',[
                  'City Health Center','Rural Health Unit','Barangay Health Center',
                  'Government Hospital','Private Clinic','Lying-in Clinic',
                ])}
                {F('address','Address')}
                {F('city','City *')}
                {F('province','Province')}
                {F('region','Region')}
                {F('contactNumber','Contact Number')}
                {F('email','Email')}
                {F('operatingHours','Operating Hours')}
                {F('maxQueueCapacity','Max Queue Capacity','number')}
                {F('status','Status','text',['open','closed','maintenance','active','inactive'])}
              </div>
              <div className="form-group" style={{display:'flex',gap:20,marginTop:4}}>
                {F('acceptsWalkIn','Accepts Walk-in','toggle')}
                {F('acceptsAppointment','Accepts Appointment','toggle')}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={close}>Cancel</button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>
                {saving ? 'Saving…' : modal==='edit'?'Save Changes':'Add Clinic'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Modal */}
      {modal==='view' && selected && (
        <div className="modal-overlay" onClick={close}>
          <div className="modal" style={{maxWidth:480}} onClick={e=>e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">{selected.name}</span>
              <button className="modal-close" onClick={close}>✕</button>
            </div>
            <div className="modal-body">
              <p><strong>Type:</strong> {selected.facilityType}</p>
              <p><strong>Address:</strong> {selected.address}</p>
              <p><strong>City/Province:</strong> {selected.city}, {selected.province}</p>
              <p><strong>Contact:</strong> {selected.contactNumber}</p>
              <p><strong>Hours:</strong> {selected.operatingHours}</p>
              <p><strong>Status:</strong> <span className={`badge ${STATUS_BADGE[selected.status]||'badge-gray'}`}>{selected.status}</span></p>
              <p><strong>Max Queue:</strong> {selected.maxQueueCapacity}</p>
              <p><strong>Walk-in:</strong> {selected.acceptsWalkIn ? 'Yes' : 'No'} &nbsp; <strong>Appointment:</strong> {selected.acceptsAppointment ? 'Yes' : 'No'}</p>
              <div style={{marginTop:12}}>
                <strong>Services ({(selected.services||[]).length}):</strong>
                {(selected.services||[]).length === 0
                  ? <p style={{color:'var(--muted)',fontSize:13}}>No services listed.</p>
                  : <ul style={{marginTop:6,paddingLeft:18}}>
                      {selected.services.map((s,i)=>(
                        <li key={i} style={{fontSize:13,color:'var(--text-2)',marginBottom:3}}>
                          {typeof s==='string' ? s : `${s.name}${s.durationMinutes ? ` (${s.durationMinutes} min)` : ''}`}
                        </li>
                      ))}
                    </ul>
                }
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={close}>Close</button>
              <button className="btn btn-primary" onClick={()=>{close();openEdit(selected)}}>Edit</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleting && (
        <div className="modal-overlay" onClick={()=>setDeleting(null)}>
          <div className="modal" style={{maxWidth:360}} onClick={e=>e.stopPropagation()}>
            <div className="modal-header"><span className="modal-title">Confirm Delete</span></div>
            <div className="modal-body"><p>Are you sure you want to remove this clinic? This action cannot be undone.</p></div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={()=>setDeleting(null)}>Cancel</button>
              <button className="btn" style={{background:'var(--error)',color:'#fff',border:'none'}} onClick={()=>remove(deleting)}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
