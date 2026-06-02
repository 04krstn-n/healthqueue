import { useState, useEffect } from 'react'
import { patientsApi } from '../../services/api'
import styles from './PatientsPage.module.css'

const PER_PAGE = 10
const TYPES    = ['all','Regular','Senior Citizen','PWD','Pregnant','Priority']
const GENDERS  = ['Male','Female','Other']
const EMPTY_FORM = { fullName:'', email:'', phone:'', dateOfBirth:'', gender:'Male', address:'', patientType:'Regular', philHealthNumber:'', bloodType:'', emergencyContact:{ name:'', phone:'' } }

const typeBadge = (t) => {
  const map = { Regular:'badge-blue','Senior Citizen':'badge-orange',PWD:'badge-purple',Pregnant:'badge-teal',Priority:'badge-red' }
  return <span className={`badge ${map[t]||'badge-gray'}`}>{t||'Regular'}</span>
}

export default function PatientsPage() {
  const [patients,   setPatients]   = useState([])
  const [loading,    setLoading]    = useState(true)
  const [search,     setSearch]     = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [page,       setPage]       = useState(1)
  const [modal,      setModal]      = useState(null)
  const [selected,   setSelected]   = useState(null)
  const [form,       setForm]       = useState(EMPTY_FORM)
  const [saving,     setSaving]     = useState(false)
  const [toast,      setToast]      = useState('')

  const showToast = (m) => { setToast(m); setTimeout(() => setToast(''), 3000) }

  const load = () => {
    setLoading(true)
    patientsApi.list()
      .then(r => setPatients(r.data || []))
      .catch(() => showToast('Failed to load patients'))
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  const openView  = (p) => { setSelected(p); setModal('view') }
  const openEdit  = (p) => { setSelected(p); setForm({ ...EMPTY_FORM, ...p, emergencyContact: p.emergencyContact||{name:'',phone:''} }); setModal('edit') }
  const openAdd   = () =>  { setSelected(null); setForm(EMPTY_FORM); setModal('add') }
  const close     = () =>  { setModal(null); setSelected(null) }

  const save = async () => {
    if (!form.fullName) { showToast('Full name is required'); return }
    setSaving(true)
    try {
      if (modal === 'edit') await patientsApi.update(selected._id, form)
      else                  await patientsApi.list().then(() => fetch('/api/patients',{ method:'POST', headers:{'Content-Type':'application/json',Authorization:`Bearer ${localStorage.getItem('hq_token')}`}, body: JSON.stringify(form) }))
      showToast(modal === 'edit' ? 'Patient updated' : 'Patient added')
      close(); load()
    } catch (e) { showToast(e?.response?.data?.message || 'Failed to save') }
    finally { setSaving(false) }
  }

  const deactivate = async (p) => {
    if (!confirm(`Deactivate ${p.fullName}?`)) return
    try {
      await patientsApi.deactivate(p._id)
      showToast('Patient deactivated'); load()
    } catch { showToast('Failed to deactivate') }
  }

  const exportCSV = () => {
    const rows = [['Name','Type','Gender','Phone','Email','PhilHealth #','Total Visits']]
    filtered.forEach(p => rows.push([p.fullName,p.patientType||'Regular',p.gender||'',p.phone||'',p.email||'',p.philHealthNumber||'',p.totalVisits||0]))
    const csv  = rows.map(r => r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type:'text/csv' })
    const a    = document.createElement('a')
    a.href     = URL.createObjectURL(blob)
    a.download = `patients_${new Date().toISOString().slice(0,10)}.csv`
    a.click(); showToast('Exported to CSV')
  }

  const filtered  = patients.filter(p => {
    const matchType   = typeFilter === 'all' || p.patientType === typeFilter
    const q           = search.toLowerCase()
    const matchSearch = !q || p.fullName?.toLowerCase().includes(q) || p.phone?.includes(q) || p.email?.toLowerCase().includes(q)
    return matchType && matchSearch
  })
  const pageCount = Math.max(1, Math.ceil(filtered.length / PER_PAGE))
  const paginated = filtered.slice((page-1)*PER_PAGE, page*PER_PAGE)

  const F = (field, label, type='text', nested=null) => (
    <div className="form-group">
      <label className="form-label">{label}</label>
      <input className="form-input" type={type}
        value={nested ? (form[nested]?.[field]||'') : (form[field]||'')}
        onChange={e => nested
          ? setForm(f=>({...f,[nested]:{...f[nested],[field]:e.target.value}}))
          : setForm(f=>({...f,[field]:e.target.value}))
        }
      />
    </div>
  )

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16, position:'relative' }}>
      {toast && <div style={{ position:'fixed', top:20, right:24, zIndex:9999, background:'#1F2937', color:'#fff', padding:'10px 18px', borderRadius:8, fontSize:13, fontWeight:500 }}>{toast}</div>}

      <div className="card">
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', padding:'18px 20px 0' }}>
          <div>
            <div style={{ fontSize:16, fontWeight:700 }}>Patient Records</div>
            <div style={{ fontSize:12, color:'var(--muted)', marginTop:2 }}>{patients.length} total patients</div>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button className="btn btn-outline btn-sm" onClick={exportCSV}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Export CSV
            </button>
            <button className="btn btn-primary btn-sm" onClick={openAdd}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Add Patient
            </button>
          </div>
        </div>

        <div style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 20px', borderBottom:'1px solid var(--border-lt)' }}>
          <div className="search-bar" style={{ flex:1, maxWidth:320 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input placeholder="Search name, phone, email..." value={search} onChange={e=>{setSearch(e.target.value);setPage(1)}} />
          </div>
          <select className="dropdown-select" value={typeFilter} onChange={e=>{setTypeFilter(e.target.value);setPage(1)}}>
            {TYPES.map(t=><option key={t} value={t}>{t==='all'?'All Types':t}</option>)}
          </select>
          <button className="btn btn-outline btn-sm" onClick={load}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
            Refresh
          </button>
        </div>

        <div className="table-wrap" style={{ borderRadius:0, border:'none' }}>
          <table>
            <thead><tr><th>Name</th><th>Type</th><th>Gender</th><th>Contact</th><th>PhilHealth #</th><th>Visits</th><th>Actions</th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={7} style={{textAlign:'center',padding:32,color:'var(--muted)'}}>Loading…</td></tr>
              : paginated.length === 0 ? <tr><td colSpan={7} style={{textAlign:'center',padding:32,color:'var(--muted)'}}>No patients found</td></tr>
              : paginated.map(p=>(
                <tr key={p._id}>
                  <td><div style={{fontWeight:600,fontSize:13}}>{p.fullName}</div><div style={{fontSize:11,color:'var(--muted)'}}>{p.email}</div></td>
                  <td>{typeBadge(p.patientType)}</td>
                  <td style={{fontSize:13}}>{p.gender||'—'}</td>
                  <td style={{fontSize:13}}>{p.phone||'—'}</td>
                  <td style={{fontSize:13}}>{p.philHealthNumber||'—'}</td>
                  <td style={{fontSize:13}}>{p.totalVisits||0}</td>
                  <td>
                    <div style={{display:'flex',gap:4}}>
                      <button className="btn btn-icon btn-outline" title="View" onClick={()=>openView(p)}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                      </button>
                      <button className="btn btn-icon btn-outline" title="Edit" onClick={()=>openEdit(p)}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                      <button className="btn btn-icon" style={{background:'var(--error-lt)',color:'var(--error)'}} title="Deactivate" onClick={()=>deactivate(p)}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {pageCount > 1 && (
          <div style={{display:'flex',alignItems:'center',gap:12,justifyContent:'center',padding:14}}>
            <button className="btn btn-outline btn-sm" disabled={page===1} onClick={()=>setPage(p=>p-1)}>← Prev</button>
            <span style={{fontSize:13,color:'var(--muted)'}}>Page {page} of {pageCount}</span>
            <button className="btn btn-outline btn-sm" disabled={page===pageCount} onClick={()=>setPage(p=>p+1)}>Next →</button>
          </div>
        )}
      </div>

      {/* VIEW */}
      {modal==='view' && selected && (
        <div className="modal-overlay" onClick={close}>
          <div className="modal" style={{maxWidth:460}} onClick={e=>e.stopPropagation()}>
            <div className="modal-header"><div className="modal-title">Patient Profile</div><button className="modal-close" onClick={close}>×</button></div>
            <div className="modal-body">
              {[['Full Name',selected.fullName],['Type',selected.patientType||'Regular'],['Gender',selected.gender||'—'],['Date of Birth',selected.dateOfBirth?new Date(selected.dateOfBirth).toLocaleDateString():'—'],['Phone',selected.phone||'—'],['Email',selected.email||'—'],['Address',selected.address||'—'],['PhilHealth #',selected.philHealthNumber||'—'],['Blood Type',selected.bloodType||'—'],['Total Visits',selected.totalVisits||0]].map(([l,v])=>(
                <div key={l} style={{display:'flex',padding:'8px 0',borderBottom:'1px solid var(--border-lt)',gap:12}}>
                  <div style={{minWidth:140,fontSize:12,fontWeight:600,color:'var(--muted)'}}>{l}</div>
                  <div style={{fontSize:13}}>{v}</div>
                </div>
              ))}
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={close}>Close</button>
              <button className="btn btn-primary" onClick={()=>{close();setTimeout(()=>openEdit(selected),50)}}>Edit</button>
            </div>
          </div>
        </div>
      )}

      {/* ADD / EDIT */}
      {(modal==='add'||modal==='edit') && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&close()}>
          <div className="modal" style={{maxWidth:540}}>
            <div className="modal-header"><div className="modal-title">{modal==='edit'?'Edit Patient':'Add New Patient'}</div><button className="modal-close" onClick={close}>×</button></div>
            <div className="modal-body" style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 16px'}}>
              <div style={{gridColumn:'1/-1'}}>{F('fullName','Full Name *')}</div>
              {F('email','Email','email')}
              {F('phone','Phone')}
              {F('dateOfBirth','Date of Birth','date')}
              <div className="form-group"><label className="form-label">Gender</label><select className="form-select" value={form.gender} onChange={e=>setForm(f=>({...f,gender:e.target.value}))}>{GENDERS.map(g=><option key={g}>{g}</option>)}</select></div>
              <div className="form-group"><label className="form-label">Patient Type</label><select className="form-select" value={form.patientType} onChange={e=>setForm(f=>({...f,patientType:e.target.value}))}>{TYPES.filter(t=>t!=='all').map(t=><option key={t}>{t}</option>)}</select></div>
              <div style={{gridColumn:'1/-1'}}>{F('address','Address')}</div>
              {F('philHealthNumber','PhilHealth #')}
              {F('bloodType','Blood Type')}
              {F('name','Emergency Contact Name','text','emergencyContact')}
              {F('phone','Emergency Contact Phone','text','emergencyContact')}
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={close}>Cancel</button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>{saving?'Saving…':modal==='edit'?'Save Changes':'Add Patient'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
