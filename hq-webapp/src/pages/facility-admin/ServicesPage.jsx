import { useState, useEffect } from 'react'
import { clinicsApi } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import styles from './facility-admin.module.css'

// Schema: { name, description, durationMinutes, isAvailable }
const EMPTY_SVC = { name: '', description: '', durationMinutes: 30, isAvailable: true, errors: {} }

export default function ServicesPage() {
  const { user }    = useAuth()
  const [clinic,    setClinic]     = useState(null)
  const [loading,   setLoading]    = useState(true)
  const [toast,     setToast]      = useState('')
  const [modal,     setModal]      = useState(null)
  const [selected,  setSelected]   = useState(null)
  const [form,      setForm]       = useState(EMPTY_SVC)
  const [saving,    setSaving]     = useState(false)
  const [editingInfo, setEditingInfo] = useState(false)
  const [infoForm,  setInfoForm]   = useState({})

  const showToast = (m) => { setToast(m); setTimeout(() => setToast(''), 3000) }
  const clinicId  = user?.clinicId

  const load = () => {
    if (!clinicId) { setLoading(false); return }
    setLoading(true)
    clinicsApi.get(clinicId)
      .then(r => { setClinic(r.data); setInfoForm(r.data) })
      .catch(() => showToast('Failed to load clinic data'))
      .finally(() => setLoading(false))
  }
  useEffect(load, [clinicId])

  const saveInfo = async () => {
    try {
      const r = await clinicsApi.update(clinic._id, infoForm)
      setClinic(r.data); setEditingInfo(false)
      showToast('Clinic info updated')
    } catch { showToast('Failed to update clinic info') }
  }

  const openAdd  = () => { setSelected(null); setForm(EMPTY_SVC); setModal('add') }
  const openEdit = (svc, idx) => {
    setSelected({ svc, idx })
    setForm({
      name:            svc.name            || '',
      description:     svc.description     || '',
      durationMinutes: svc.durationMinutes ?? 30,
      isAvailable:     svc.isAvailable     ?? true,
    })
    setModal('edit')
  }
  const openView = (svc, idx) => { setSelected({ svc, idx }); setModal('view') }
  const close    = () => { setModal(null); setSelected(null);  setForm(EMPTY_SVC) }

  const saveService = async () => {
    if (!form.name.trim()) { setForm(p => ({ ...p,
    errors: { ...p.errors, name: 'Service name is required' }
  }))
  return
}
    setSaving(true)
    try {
      const services = [...(clinic.services || [])]
      const payload  = {
        name:            form.name.trim(),
        description:     form.description || '',
        durationMinutes: Number(form.durationMinutes) || 30,
        isAvailable:     !!form.isAvailable,
      }
      if (modal === 'edit' && selected !== null) {
        services[selected.idx] = { ...services[selected.idx], ...payload }
      } else {
        services.push(payload)
      }
      const r = await clinicsApi.update(clinic._id, { services })
      setClinic(r.data)
      showToast(modal === 'edit' ? 'Service updated' : 'Service added')
      close(); load()
    } catch { showToast('Failed to save service') }
    finally { setSaving(false) }
  }

  const deleteService = async (idx) => {
    if (!confirm('Remove this service?')) return
    const services = [...(clinic.services || [])]
    services.splice(idx, 1)
    try {
      const r = await clinicsApi.update(clinic._id, { services })
      setClinic(r.data)
      showToast('Service removed')
    } catch { showToast('Failed to remove service') }
  }

  const toggleAvailable = async (idx) => {
    const services = [...(clinic.services || [])]
    services[idx] = { ...services[idx], isAvailable: !services[idx].isAvailable }
    try {
      const r = await clinicsApi.update(clinic._id, { services })
      setClinic(r.data)
    } catch { showToast('Failed to update service') }
  }

  if (loading) return <div style={{ padding:40, textAlign:'center', color:'var(--muted)' }}>Loading clinic info…</div>
  if (!clinic) return <div style={{ padding:40, textAlign:'center', color:'var(--muted)' }}>No clinic assigned to your account.</div>

  const services = clinic.services || []

  return (
    <div className={styles.page}>
      {toast && <div className={styles.toast}>{toast}</div>}

      {/* Header */}
      <div className={styles.header}>
        <div>
          <div className={styles.title}>{clinic.name}</div>
          <div className={styles.sub}>{clinic.facilityType || 'Diagnostic Center'} · {clinic.city}, {clinic.province}</div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          {editingInfo
            ? <>
                <button className="btn btn-outline" onClick={() => setEditingInfo(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={saveInfo}>Save Info</button>
              </>
            : <button className="btn btn-outline" onClick={() => setEditingInfo(true)}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            Edit Clinic Info
            </button>
          }
          <button className="btn btn-primary" onClick={openAdd}>+ Add Service</button>
        </div>
      </div>

      {/* Editable clinic info */}
      {editingInfo && (
        <div className="card" style={{ padding:20, marginBottom:16 }}>
          <div style={{ fontWeight:700, marginBottom:14, color:'var(--text)' }}>Edit Clinic Information</div>
          <div className={styles.formGrid2}>
            {[['address','Address'],['contactNumber','Contact Number'],['email','Email'],['operatingHours','Operating Hours']].map(([f,l]) => (
              <div key={f} className="form-group">
                <label className="form-label">{l}</label>
                <input className="form-input" value={infoForm[f]||''} onChange={e => setInfoForm(p => ({ ...p, [f]: e.target.value }))} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Services list */}
      <div className="card" style={{ padding:20 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
          <span style={{ fontWeight:700, color:'var(--text)', fontSize:14 }}>
            Services Offered <span style={{ color:'var(--muted)', fontWeight:400 }}>({services.length})</span>
          </span>
        </div>

        {services.length === 0
          ? <div style={{ textAlign:'center', padding:'30px 0', color:'var(--muted)' }}>
              No services added yet. Click <strong>+ Add Service</strong> to get started.
            </div>
          : <table className="table">
              <thead>
                <tr>
                  <th>Service Name</th>
                  <th>Description</th>
                  <th>Duration</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {services.map((svc, idx) => (
                  <tr key={svc._id || idx}>
                    <td><strong>{svc.name || '—'}</strong></td>
                    <td style={{ color:'var(--muted)', fontSize:13 }}>{svc.description || '—'}</td>
                    <td>{svc.durationMinutes || 30} min</td>
                    <td>
                      <span className={`badge ${svc.isAvailable ? 'badge-green' : 'badge-gray'}`}>
                        {svc.isAvailable ? 'Available' : 'Unavailable'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display:'flex', gap:6 }}>
                        <button className="btn btn-outline" style={{ fontSize:11, padding:'3px 8px' }} onClick={() => openView(svc, idx)}>View</button>
                        <button className="btn btn-outline" style={{ fontSize:11, padding:'3px 8px' }} onClick={() => openEdit(svc, idx)}>Edit</button>
                        <button className="btn btn-outline" style={{ fontSize:11, padding:'3px 8px', color: svc.isAvailable ? 'var(--muted)' : 'var(--success)' }}
                          onClick={() => toggleAvailable(idx)}>
                          {svc.isAvailable ? 'Disable' : 'Enable'}
                        </button>
                        <button className="btn" style={{ fontSize:11, padding:'3px 8px', color:'var(--error)', background:'var(--error-lt)', border:'none' }}
                          onClick={() => deleteService(idx)}>Remove</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
        }
      </div>

      {/* Add / Edit Modal */}
      {(modal === 'add' || modal === 'edit') && (
        <div className="modal-overlay" onClick={close}>
          <div className="modal" style={{ maxWidth:440 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">{modal === 'edit' ? 'Edit Service' : 'Add New Service'}</span>
              <button className="modal-close" onClick={close}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Service Name <span style={{ color:'var(--error)' }}>*</span></label>
                <input className="form-input" value={form.name} style={{ border: form.errors?.name ? '1px solid #DC2626'  : undefined  }}
                  onChange={e => setForm(p => ({ ...p,  name: e.target.value,  errors: {  ...p.errors,   name: ''  }  }))
                  }
                  placeholder="e.g. Laboratory"
                />

                {form.errors?.name && (
                  <div  style={{  color: '#DC2626',  fontSize: 12,  marginTop: 6,  fontWeight: 500,  }}  >
                    {form.errors.name}
                  </div>
                )}
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea className="form-input" rows={2} value={form.description}
                  onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  placeholder="Brief description of this service" />
              </div>
              <div className="form-group">
                <label className="form-label">Duration (minutes)</label>
                <input className="form-input" type="number" min={5} max={480}
                  value={form.durationMinutes}
                  onChange={e => setForm(p => ({ ...p, durationMinutes: Number(e.target.value) }))} />
              </div>
              <div className="form-group" style={{ display:'flex', alignItems:'center', gap:10 }}>
                <input type="checkbox" id="avail" checked={!!form.isAvailable}
                  onChange={e => setForm(p => ({ ...p, isAvailable: e.target.checked }))} />
                <label htmlFor="avail" style={{ cursor:'pointer', color:'var(--text-2)', fontSize:13 }}>Currently available to patients</label>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={close}>Cancel</button>
              <button className="btn btn-primary" onClick={saveService} disabled={saving}>
                {saving ? 'Saving…' : modal === 'edit' ? 'Save Changes' : 'Add Service'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Modal */}
      {modal === 'view' && selected && (
        <div className="modal-overlay" onClick={close}>
          <div className="modal" style={{ maxWidth:380 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">{selected.svc.name}</span>
              <button className="modal-close" onClick={close}>✕</button>
            </div>
            <div className="modal-body">
              <p><strong>Description:</strong> {selected.svc.description || '—'}</p>
              <p><strong>Duration:</strong> {selected.svc.durationMinutes || 30} minutes</p>
              <p><strong>Status:</strong>{' '}
                <span className={`badge ${selected.svc.isAvailable ? 'badge-green' : 'badge-gray'}`}>
                  {selected.svc.isAvailable ? 'Available' : 'Unavailable'}
                </span>
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={close}>Close</button>
              <button className="btn btn-primary" onClick={() => { close(); openEdit(selected.svc, selected.idx) }}>Edit</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
