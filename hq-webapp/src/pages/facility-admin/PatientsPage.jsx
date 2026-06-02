import { useState, useEffect } from 'react'
import api from '../../services/api'
import styles from './facility-admin.module.css'

const PER_PAGE     = 10
const TYPES        = ['All','Regular','Senior Citizen','PWD','Pregnant','Priority']
const GENDERS      = ['Male','Female','Other']
const BLOOD_TYPES  = ['','A+','A-','B+','B-','AB+','AB-','O+','O-','Unknown']
const PATIENT_TYPES= ['Regular','Senior Citizen','PWD','Pregnant','Priority']

const typeBadge = (t) => {
  const map = { Regular:'badge-blue','Senior Citizen':'badge-orange',PWD:'badge-purple',Pregnant:'badge-teal',Priority:'badge-red' }
  return <span className={`badge ${map[t]||'badge-gray'}`}>{t||'Regular'}</span>
}

const genderBadge = (g) => {
  const map = { Male:'badge-blue', Female:'badge-teal', Other:'badge-gray' }
  return <span className={`badge ${map[g]||'badge-gray'}`}>{g||'—'}</span>
}

const EMPTY_FORM = {
  fullName:'', email:'', phone:'', dob:'', gender:'Male',
  address:'', patientType:'Regular', philHealthNumber:'',
  hmoProvider:'', bloodType:'', allergies:'', medicalNotes:'', errors:{},
}

export default function PatientsPage() {
  const [patients,   setPatients]  = useState([])
  const [loading,    setLoading]   = useState(true)
  const [search,     setSearch]    = useState('')
  const [typeFilter, setType]      = useState('All')
  const [page,       setPage]      = useState(1)
  const [modal,      setModal]     = useState(null)
  const [selected,   setSelected]  = useState(null)
  const [form,       setForm]      = useState(EMPTY_FORM)
  const [saving,     setSaving]    = useState(false)
  const [toast,      setToast]     = useState('')

  const showToast = (m) => { setToast(m); setTimeout(() => setToast(''), 3000) }

  const load = () => {
    setLoading(true)
    api.get('/api/patients')
      .then(r => setPatients(r.data || []))
      .catch(() => setPatients([]))
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  const openAdd  = () => { setSelected(null); setForm(EMPTY_FORM); setModal('add') }
  const openView = (p) => { setSelected(p); setModal('view') }
  const openEdit = (p) => {
    setSelected(p)
    setForm({
      fullName:         p.fullName         || '',
      email:            p.email            || '',
      phone:            p.phone            || '',
      dob:              p.dob ? new Date(p.dob).toISOString().slice(0,10) : '',
      gender:           p.gender           || 'Male',
      address:          p.address          || '',
      patientType:      p.patientType      || 'Regular',
      philHealthNumber: p.philHealthNumber || '',
      hmoProvider:      p.hmoProvider      || '',
      bloodType:        p.bloodType        || '',
      allergies:        p.allergies        || '',
      medicalNotes:     p.medicalNotes     || '',
    })
    setModal('edit')
  }
  const close = () => { setModal(null); setSelected(null) }

  const save = async () => {
    const errors = {}
      if (!form.fullName.trim()) {
        errors.fullName = 'Full name is required'
      }

      if (Object.keys(errors).length > 0) {
        setForm(f => ({ ...f, errors }))
        return
      }
    setSaving(true)
    try {
      if (modal === 'edit') await api.put(`/api/patients/${selected._id}`, form)
      else                  await api.post('/api/patients', form)
      showToast(modal === 'edit' ? 'Patient updated' : 'Patient added')
      close(); load()
    } catch (e) { showToast(e?.response?.data?.message || 'Failed to save patient') }
    finally { setSaving(false) }
  }

  const deactivate = async (id) => {
    if (!confirm('Deactivate this patient?')) return
    await api.delete(`/api/patients/${id}`).catch(() => {})
    showToast('Patient deactivated'); load()
  }

  const exportCSV = () => {
    const rows = [['Name','Type','Gender','Phone','Email','PhilHealth','Blood Type','Last Visit']]
    filtered.forEach(p => rows.push([
      p.fullName, p.patientType||'Regular', p.gender||'',
      p.phone||'', p.email||'', p.philHealthNumber||'',
      p.bloodType||'', p.updatedAt ? new Date(p.updatedAt).toLocaleDateString('en-PH') : '',
    ]))
    const csv  = rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type:'text/csv' })
    const a    = document.createElement('a')
    a.href = URL.createObjectURL(blob); a.download = `patients_${new Date().toISOString().slice(0,10)}.csv`; a.click()
    showToast('Exported to CSV')
  }

  const filtered  = patients.filter(p => {
    const matchType   = typeFilter === 'All' || p.patientType === typeFilter
    const q           = search.toLowerCase()
    const matchSearch = !q ||
      p.fullName?.toLowerCase().includes(q) ||
      p.phone?.includes(q) ||
      p.email?.toLowerCase().includes(q) ||
      p.philHealthNumber?.toLowerCase().includes(q)
    return matchType && matchSearch
  })
  const pageCount = Math.max(1, Math.ceil(filtered.length / PER_PAGE))
  const paginated = filtered.slice((page-1)*PER_PAGE, page*PER_PAGE)

  const fld = (field, label, type='text') => (
    <div className="form-group">
      <label className="form-label">{label}</label>
      <>
  <input
    className="form-input"
    type={type}
    value={form[field] || ''}
    style={{
      border: form.errors?.[field]
        ? '1px solid #DC2626'
        : undefined
    }}
    onChange={e =>
      setForm(f => ({
        ...f,
        [field]: e.target.value,
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
    </div>
  )

  const sel = (field, label, options) => (
    <div className="form-group">
      <label className="form-label">{label}</label>
      <select className="form-select" value={form[field] || ''}
        onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}>
        {options.map(o => <option key={o} value={o}>{o || '— select —'}</option>)}
      </select>
    </div>
  )

  return (
    <div className={styles.page}>
      {toast && <div className={styles.toast}>{toast}</div>}

      <div className="card">
        {/* Header */}
        <div className={styles.header}style={{ padding: '20px 24px', justifyContent: 'space-between', alignItems: 'center',}} >
          <div>
            <div className={styles.title}>Patient Records</div>
            <div className={styles.sub}>{patients.length} total patients</div>
          </div>
          <div style={{ display:'flex', gap:8, alignItems:'flex-start', marginTop:4, }}>
            <button className="btn btn-outline" onClick={exportCSV}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Export CSV</button>
            <button className="btn btn-primary" onClick={openAdd}>+ Add Patient</button>
          </div>
        </div>

        {/* Filters */}
        <div className={styles.toolbar} 
        style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 24px 20px', borderBottom: '1px solid var(--border)', }}>
          <input className="form-input" 
          style={{ flex: 1, minWidth: 0, }}
            placeholder="Search name, phone, email…"
            value={search}
            onChange={e => {
              setSearch(e.target.value)
              setPage(1)
            }}
          />

          <select
            className="form-select"
            style={{ width: 180, flexShrink: 0, }}
            value={typeFilter}
            onChange={e => {
              setType(e.target.value)
              setPage(1)
            }}
          >
            {TYPES.map(t => ( <option key={t}>{t}</option>
            ))}
          </select>

          <button className="btn btn-outline" style={{ flexShrink: 0, whiteSpace: 'nowrap', }} onClick={load}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
            Refresh
          </button>
        </div>

        {/* Table */}
        <table className="table">
          <thead>
            <tr>
              <th>Name</th><th>Type</th><th>Gender</th>
              <th>Phone</th><th>PhilHealth #</th><th>Blood Type</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading
              ? <tr><td colSpan={7} style={{ textAlign:'center', padding:32, color:'var(--muted)' }}>Loading…</td></tr>
              : paginated.length === 0
                ? <tr><td colSpan={7} style={{ textAlign:'center', padding:32, color:'var(--muted)' }}>No patients found.</td></tr>
                : paginated.map(p => (
                    <tr key={p._id}>
                      <td>
                        <div style={{ fontWeight:600, fontSize:13 }}>{p.fullName}</div>
                        <div style={{ fontSize:11, color:'var(--muted)' }}>{p.email}</div>
                      </td>
                      <td>{typeBadge(p.patientType)}</td>
                      <td>{genderBadge(p.gender)}</td>
                      <td style={{ fontSize:13 }}>{p.phone || '—'}</td>
                      <td style={{ fontSize:13 }}>{p.philHealthNumber || '—'}</td>
                      <td style={{ fontSize:13 }}>{p.bloodType || '—'}</td>
                      <td>
                        <div style={{ display:'flex', gap:4 }}>
                          <button className="btn btn-outline" style={{ fontSize:11, padding:'3px 8px' }}
                            onClick={() => openView(p)}>View</button>
                          <button className="btn btn-outline" style={{ fontSize:11, padding:'3px 8px' }}
                            onClick={() => openEdit(p)}>Edit</button>
                          <button className="btn" style={{ fontSize:11, padding:'3px 8px', color:'var(--error)', background:'var(--error-lt)', border:'none' }}
                            onClick={() => deactivate(p._id)}>Deactivate</button>
                        </div>
                      </td>
                    </tr>
                  ))
            }
          </tbody>
        </table>

        {/* Pagination */}
        {pageCount > 1 && (
          <div className={styles.pagination} style={{ padding:'12px 16px', display:'flex', alignItems:'center', gap:8 }}>
            <button className="btn btn-outline" disabled={page===1} onClick={() => setPage(p=>p-1)}>← Prev</button>
            <span style={{ fontSize:13, color:'var(--muted)' }}>Page {page} of {pageCount}</span>
            <button className="btn btn-outline" disabled={page===pageCount} onClick={() => setPage(p=>p+1)}>Next →</button>
          </div>
        )}
      </div>

      {/* ADD / EDIT MODAL */}
      {(modal === 'add' || modal === 'edit') && (
        <div className="modal-overlay" onClick={close}>
          <div className="modal" style={{ maxWidth:520 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">{modal === 'edit' ? 'Edit Patient' : 'Add New Patient'}</span>
              <button className="modal-close" onClick={close}>✕</button>
            </div>
            <div className="modal-body" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 16px' }}>
              {fld('fullName',  'Full Name *')}
              {fld('email',     'Email Address', 'email')}
              {fld('phone',     'Phone Number')}
              {fld('dob',       'Date of Birth', 'date')}
              {sel('gender',    'Gender',        GENDERS)}
              {sel('patientType','Patient Type', PATIENT_TYPES)}
              {sel('bloodType', 'Blood Type',    BLOOD_TYPES)}
              {fld('philHealthNumber', 'PhilHealth #')}
              {fld('hmoProvider',      'HMO Provider')}
              <div className="form-group" style={{ gridColumn:'1/-1' }}>
                <label className="form-label">Address</label>
                <input className="form-input" value={form.address || ''}
                  onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
              </div>
              <div className="form-group" style={{ gridColumn:'1/-1' }}>
                <label className="form-label">Allergies</label>
                <input className="form-input" value={form.allergies || ''}
                  onChange={e => setForm(f => ({ ...f, allergies: e.target.value }))} />
              </div>
              <div className="form-group" style={{ gridColumn:'1/-1' }}>
                <label className="form-label">Medical Notes</label>
                <textarea className="form-input" rows={2} value={form.medicalNotes || ''}
                  onChange={e => setForm(f => ({ ...f, medicalNotes: e.target.value }))} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={close}>Cancel</button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>
                {saving ? 'Saving…' : modal === 'edit' ? 'Save Changes' : 'Add Patient'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW MODAL */}
      {modal === 'view' && selected && (
        <div className="modal-overlay" onClick={close}>
          <div className="modal" style={{ maxWidth:480 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">{selected.fullName}</span>
              <button className="modal-close" onClick={close}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px 24px' }}>
                {[
                  ['Patient Type', typeBadge(selected.patientType)],
                  ['Gender',       genderBadge(selected.gender)],
                  ['Date of Birth',selected.dob ? new Date(selected.dob).toLocaleDateString('en-PH') : '—'],
                  ['Blood Type',   selected.bloodType || '—'],
                  ['Phone',        selected.phone     || '—'],
                  ['Email',        selected.email     || '—'],
                  ['PhilHealth #', selected.philHealthNumber || '—'],
                  ['HMO Provider', selected.hmoProvider     || '—'],
                ].map(([label, val]) => (
                  <div key={label}>
                    <div style={{ fontSize:11, color:'var(--muted)', marginBottom:2 }}>{label}</div>
                    <div style={{ fontSize:13, fontWeight:500, color:'var(--text)' }}>{val}</div>
                  </div>
                ))}
                {selected.address && (
                  <div style={{ gridColumn:'1/-1' }}>
                    <div style={{ fontSize:11, color:'var(--muted)', marginBottom:2 }}>Address</div>
                    <div style={{ fontSize:13, color:'var(--text)' }}>{selected.address}</div>
                  </div>
                )}
                {selected.allergies && (
                  <div style={{ gridColumn:'1/-1' }}>
                    <div style={{ fontSize:11, color:'var(--muted)', marginBottom:2 }}>Allergies</div>
                    <div style={{ fontSize:13, color:'var(--text)' }}>{selected.allergies}</div>
                  </div>
                )}
                {selected.medicalNotes && (
                  <div style={{ gridColumn:'1/-1' }}>
                    <div style={{ fontSize:11, color:'var(--muted)', marginBottom:2 }}>Medical Notes</div>
                    <div style={{ fontSize:13, color:'var(--text)' }}>{selected.medicalNotes}</div>
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={close}>Close</button>
              <button className="btn btn-primary" onClick={() => { close(); openEdit(selected) }}>Edit</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
