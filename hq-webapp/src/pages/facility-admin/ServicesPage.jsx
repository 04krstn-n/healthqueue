import { useState, useEffect, useCallback } from 'react'
import { clinicsApi } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import { useToast, CommonModal, FormField } from '../../components/ui/CommonModal'
import styles from './facility-admin.module.css'

const EMPTY_SVC = { name: '', description: '', durationMinutes: 30, isAvailable: true, errors: {} }

export default function ServicesPage() {
  const { user } = useAuth()
  const { toast, showToast } = useToast()
  const [clinic, setClinic] = useState(null)
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [selected, setSelected] = useState(null)
  const [form, setForm] = useState(EMPTY_SVC)
  const [saving, setSaving] = useState(false)
  const [editingInfo, setEditingInfo] = useState(false)
  const [infoForm, setInfoForm] = useState({})

  const clinicId = user?.clinicId

  const loadClinic = useCallback(async () => {
    if (!clinicId) return setLoading(false)
    setLoading(true)
    try {
      const res = await clinicsApi.get(clinicId)
      setClinic(res.data)
      setInfoForm(res.data)
    } catch {
      showToast('Failed to load clinic data')
    } finally {
      setLoading(false)
    }
  }, [clinicId, showToast])

  useEffect(() => { loadClinic() }, [loadClinic])

  const saveInfo = async () => {
    try {
      const res = await clinicsApi.update(clinic._id, infoForm)
      setClinic(res.data)
      setEditingInfo(false)
      showToast('Clinic info updated')
    } catch {
      showToast('Failed to update clinic info')
    }
  }

  const openAdd = () => { setSelected(null); setForm(EMPTY_SVC); setModal('add') }
  const openEdit = (svc, idx) => {
    setSelected({ svc, idx })
    setForm({
      name: svc.name || '',
      description: svc.description || '',
      durationMinutes: svc.durationMinutes ?? 30,
      isAvailable: svc.isAvailable ?? true,
      errors: {},
    })
    setModal('edit')
  }
  const openView = (svc, idx) => { setSelected({ svc, idx }); setModal('view') }
  const closeModal = () => { setModal(null); setSelected(null); setForm(EMPTY_SVC) }

  const saveService = async () => {
    if (!form.name.trim()) {
      setForm((p) => ({ ...p, errors: { ...p.errors, name: 'Service name is required' } }))
      return
    }
    setSaving(true)
    try {
      const services = [...(clinic.services || [])]
      const payload = {
        name: form.name.trim(),
        description: form.description || '',
        durationMinutes: Number(form.durationMinutes) || 30,
        isAvailable: !!form.isAvailable,
      }
      if (modal === 'edit' && selected !== null) {
        services[selected.idx] = { ...services[selected.idx], ...payload }
      } else {
        services.push(payload)
      }
      const res = await clinicsApi.update(clinic._id, { services })
      setClinic(res.data)
      showToast(modal === 'edit' ? 'Service updated' : 'Service added')
      closeModal()
    } catch {
      showToast('Failed to save service')
    } finally {
      setSaving(false)
    }
  }

  const deleteService = async (idx) => {
    if (!window.confirm('Remove this service?')) return
    const services = [...(clinic.services || [])]
    services.splice(idx, 1)
    try {
      const res = await clinicsApi.update(clinic._id, { services })
      setClinic(res.data)
      showToast('Service removed')
    } catch {
      showToast('Failed to remove service')
    }
  }

  const toggleAvailable = async (idx) => {
    const services = [...(clinic.services || [])]
    services[idx] = { ...services[idx], isAvailable: !services[idx].isAvailable }
    try {
      const res = await clinicsApi.update(clinic._id, { services })
      setClinic(res.data)
    } catch {
      showToast('Failed to update service')
    }
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>Loading clinic info…</div>
  if (!clinic) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>No clinic assigned to your account.</div>

  const services = clinic.services || []

  return (
    <div className={styles.page}>
      {toast && <div className={styles.toast}>{toast}</div>}

      <div className={styles.header}>
        <div>
          <div className={styles.title}>{clinic.name}</div>
          <div className={styles.sub}>{clinic.facilityType || 'Diagnostic Center'} · {clinic.city}, {clinic.province}</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {editingInfo ? (
            <>
              <button className="btn btn-outline" onClick={() => setEditingInfo(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={saveInfo}>Save Info</button>
            </>
          ) : (
            <button className="btn btn-outline" onClick={() => setEditingInfo(true)}>Edit Clinic Info</button>
          )}
          <button className="btn btn-primary" onClick={openAdd}>+ Add Service</button>
        </div>
      </div>

      {editingInfo && (
        <div className="card" style={{ padding: 20, marginBottom: 16 }}>
          <div style={{ fontWeight: 700, marginBottom: 14, color: 'var(--text)' }}>Edit Clinic Information</div>
          <div className={styles.formGrid2}>
            {[['address', 'Address'], ['contactNumber', 'Contact Number'], ['email', 'Email'], ['operatingHours', 'Operating Hours']].map(([f, l]) => (
              <FormField key={f} label={l} name={f} value={infoForm[f]} onChange={(e) => setInfoForm((p) => ({ ...p, [f]: e.target.value }))} />
            ))}
          </div>
        </div>
      )}

      <div className="card" style={{ padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <span style={{ fontWeight: 700, color: 'var(--text)', fontSize: 14 }}>
            Services Offered <span style={{ color: 'var(--muted)', fontWeight: 400 }}>({services.length})</span>
          </span>
        </div>

        {services.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--muted)' }}>
            No services added yet. Click <strong>+ Add Service</strong> to get started.
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr><th>Service Name</th><th>Description</th><th>Duration</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {services.map((svc, idx) => (
                <tr key={svc._id || idx}>
                  <td><strong>{svc.name || '—'}</strong></td>
                  <td style={{ color: 'var(--muted)', fontSize: 13 }}>{svc.description || '—'}</td>
                  <td>{svc.durationMinutes || 30} min</td>
                  <td>
                    <span className={`badge ${svc.isAvailable ? 'badge-green' : 'badge-gray'}`}>
                      {svc.isAvailable ? 'Available' : 'Unavailable'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-outline" style={{ fontSize: 11, padding: '3px 8px' }} onClick={() => openView(svc, idx)}>View</button>
                      <button className="btn btn-outline" style={{ fontSize: 11, padding: '3px 8px' }} onClick={() => openEdit(svc, idx)}>Edit</button>
                      <button className="btn btn-outline" style={{ fontSize: 11, padding: '3px 8px', color: svc.isAvailable ? 'var(--muted)' : 'var(--success)' }} onClick={() => toggleAvailable(idx)}>
                        {svc.isAvailable ? 'Disable' : 'Enable'}
                      </button>
                      <button className="btn" style={{ fontSize: 11, padding: '3px 8px', color: 'var(--error)', background: 'var(--error-lt)', border: 'none' }} onClick={() => deleteService(idx)}>Remove</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={modal === 'add' || modal === 'edit'}
        onClose={closeModal}
        title={modal === 'edit' ? 'Edit Service' : 'Add New Service'}
        maxWidth={440}
        footer={
          <>
            <button className="btn btn-outline" onClick={closeModal}>Cancel</button>
            <button className="btn btn-primary" onClick={saveService} disabled={saving}>
              {saving ? 'Saving…' : modal === 'edit' ? 'Save Changes' : 'Add Service'}
            </button>
          </>
        }
      >
        <FormField label="Service Name" name="name" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value, errors: { ...p.errors, name: '' } }))} error={form.errors?.name} required placeholder="e.g. Laboratory" />
        <div className="form-group">
          <label className="form-label">Description</label>
          <textarea className="form-input" rows={2} value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} placeholder="Brief description of this service" />
        </div>
        <FormField label="Duration (minutes)" name="durationMinutes" type="number" min={5} max={480} value={form.durationMinutes} onChange={(e) => setForm((p) => ({ ...p, durationMinutes: Number(e.target.value) }))} />
        <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <input type="checkbox" id="avail" checked={!!form.isAvailable} onChange={(e) => setForm((p) => ({ ...p, isAvailable: e.target.checked }))} />
          <label htmlFor="avail" style={{ cursor: 'pointer', color: 'var(--text-2)', fontSize: 13 }}>Currently available to patients</label>
        </div>
      </Modal>

      {/* View Modal */}
      <Modal
        isOpen={modal === 'view' && !!selected}
        onClose={closeModal}
        title={selected?.svc.name}
        maxWidth={380}
        footer={
          <>
            <button className="btn btn-outline" onClick={closeModal}>Close</button>
            <button className="btn btn-primary" onClick={() => { closeModal(); openEdit(selected.svc, selected.idx) }}>Edit</button>
          </>
        }
      >
        <p><strong>Description:</strong> {selected?.svc.description || '—'}</p>
        <p><strong>Duration:</strong> {selected?.svc.durationMinutes || 30} minutes</p>
        <p><strong>Status:</strong>{' '}
          <span className={`badge ${selected?.svc.isAvailable ? 'badge-green' : 'badge-gray'}`}>
            {selected?.svc.isAvailable ? 'Available' : 'Unavailable'}
          </span>
        </p>
      </Modal>
    </div>
  )
}