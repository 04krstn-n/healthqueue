import { useState, useEffect, useCallback, useMemo } from 'react'
import api from '../../services/api'
import { useToast, CommonModal, FormField, SelectField } from '../../components/ui/CommonModal'
import styles from './facility-admin.module.css'

const PER_PAGE = 10
const TYPES = ['All', 'Regular', 'Senior Citizen', 'PWD', 'Pregnant', 'Priority']
const GENDERS = ['Male', 'Female', 'Other']
const BLOOD_TYPES = ['', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown']
const PATIENT_TYPES = ['Regular', 'Senior Citizen', 'PWD', 'Pregnant', 'Priority']

const TYPE_BADGES = { Regular: 'badge-blue', 'Senior Citizen': 'badge-orange', PWD: 'badge-purple', Pregnant: 'badge-teal', Priority: 'badge-red' }
const GENDER_BADGES = { Male: 'badge-blue', Female: 'badge-teal', Other: 'badge-gray' }

const EMPTY_FORM = {
  fullName: '', email: '', phone: '', dob: '', gender: 'Male',
  address: '', patientType: 'Regular', philHealthNumber: '',
  hmoProvider: '', bloodType: '', allergies: '', medicalNotes: '', errors: {},
}

export default function PatientsPage() {
  const { toast, showToast } = useToast()
  const [patients, setPatients] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('All')
  const [page, setPage] = useState(1)
  const [modal, setModal] = useState(null)
  const [selected, setSelected] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const loadPatients = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/api/patients')
      setPatients(res.data || [])
    } catch {
      setPatients([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadPatients() }, [loadPatients])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setForm((f) => ({
      ...f,
      [name]: value,
      errors: { ...f.errors, [name]: '' },
    }))
  }

  const openAdd = () => { setSelected(null); setForm(EMPTY_FORM); setModal('add') }
  const openView = (p) => { setSelected(p); setModal('view') }
  const openEdit = (p) => {
    setSelected(p)
    setForm({
      fullName: p.fullName || '',
      email: p.email || '',
      phone: p.phone || '',
      dob: p.dob ? new Date(p.dob).toISOString().slice(0, 10) : '',
      gender: p.gender || 'Male',
      address: p.address || '',
      patientType: p.patientType || 'Regular',
      philHealthNumber: p.philHealthNumber || '',
      hmoProvider: p.hmoProvider || '',
      bloodType: p.bloodType || '',
      allergies: p.allergies || '',
      medicalNotes: p.medicalNotes || '',
      errors: {},
    })
    setModal('edit')
  }
  const closeModal = () => { setModal(null); setSelected(null) }

  const savePatient = async () => {
    if (!form.fullName.trim()) {
      setForm((f) => ({ ...f, errors: { ...f.errors, fullName: 'Full name is required' } }))
      return
    }
    setSaving(true)
    try {
      if (modal === 'edit') {
        await api.put(`/api/patients/${selected._id}`, form)
      } else {
        await api.post('/api/patients', form)
      }
      showToast(modal === 'edit' ? 'Patient updated' : 'Patient added')
      closeModal()
      loadPatients()
    } catch (e) {
      showToast(e?.response?.data?.message || 'Failed to save patient')
    } finally {
      setSaving(false)
    }
  }

  const deactivatePatient = async (id) => {
    if (!window.confirm('Deactivate this patient?')) return
    try {
      await api.delete(`/api/patients/${id}`)
      showToast('Patient deactivated')
      loadPatients()
    } catch {
      showToast('Failed to deactivate')
    }
  }

  const filteredPatients = useMemo(() => {
    const q = search.trim().toLowerCase()
    return patients.filter((p) => {
      const matchType = typeFilter === 'All' || p.patientType === typeFilter
      const matchSearch = !q || p.fullName?.toLowerCase().includes(q) || p.phone?.includes(q) || p.email?.toLowerCase().includes(q) || p.philHealthNumber?.toLowerCase().includes(q)
      return matchType && matchSearch
    })
  }, [patients, search, typeFilter])

  const pageCount = Math.max(1, Math.ceil(filteredPatients.length / PER_PAGE))
  const paginatedPatients = filteredPatients.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  const exportCSV = () => {
    const rows = [['Name', 'Type', 'Gender', 'Phone', 'Email', 'PhilHealth', 'Blood Type', 'Last Visit']]
    filteredPatients.forEach((p) => rows.push([
      p.fullName, p.patientType || 'Regular', p.gender || '',
      p.phone || '', p.email || '', p.philHealthNumber || '',
      p.bloodType || '', p.updatedAt ? new Date(p.updatedAt).toLocaleDateString('en-PH') : '',
    ]))
    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `patients_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    showToast('Exported to CSV')
  }

  return (
    <div className={styles.page}>
      {toast && <div className={styles.toast}>{toast}</div>}

      <div className="card">
        <div className={styles.header} style={{ padding: '20px 24px', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div className={styles.title}>Patient Records</div>
            <div className={styles.sub}>{patients.length} total patients</div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginTop: 4 }}>
            <button className="btn btn-outline" onClick={exportCSV}>Export CSV</button>
            <button className="btn btn-primary" onClick={openAdd}>+ Add Patient</button>
          </div>
        </div>

        <div className={styles.toolbar} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 24px 20px', borderBottom: '1px solid var(--border)' }}>
          <input
            className="form-input"
            style={{ flex: 1, minWidth: 0 }}
            placeholder="Search name, phone, email…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          />
          <select className="form-select" style={{ width: 180, flexShrink: 0 }} value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1) }}>
            {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <button className="btn btn-outline" onClick={loadPatients}>Refresh</button>
        </div>

        <table className="table">
          <thead>
            <tr>
              <th>Name</th><th>Type</th><th>Gender</th><th>Phone</th><th>PhilHealth #</th><th>Blood Type</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: 32, color: 'var(--muted)' }}>Loading…</td></tr>
            ) : paginatedPatients.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: 32, color: 'var(--muted)' }}>No patients found.</td></tr>
            ) : (
              paginatedPatients.map((p) => (
                <tr key={p._id}>
                  <td>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{p.fullName}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>{p.email}</div>
                  </td>
                  <td><span className={`badge ${TYPE_BADGES[p.patientType] || 'badge-gray'}`}>{p.patientType || 'Regular'}</span></td>
                  <td><span className={`badge ${GENDER_BADGES[p.gender] || 'badge-gray'}`}>{p.gender || '—'}</span></td>
                  <td style={{ fontSize: 13 }}>{p.phone || '—'}</td>
                  <td style={{ fontSize: 13 }}>{p.philHealthNumber || '—'}</td>
                  <td style={{ fontSize: 13 }}>{p.bloodType || '—'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-outline" style={{ fontSize: 11, padding: '3px 8px' }} onClick={() => openView(p)}>View</button>
                      <button className="btn btn-outline" style={{ fontSize: 11, padding: '3px 8px' }} onClick={() => openEdit(p)}>Edit</button>
                      <button className="btn" style={{ fontSize: 11, padding: '3px 8px', color: 'var(--error)', background: 'var(--error-lt)', border: 'none' }} onClick={() => deactivatePatient(p._id)}>Deactivate</button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {pageCount > 1 && (
          <div className={styles.pagination} style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <button className="btn btn-outline" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>← Prev</button>
            <span style={{ fontSize: 13, color: 'var(--muted)' }}>Page {page} of {pageCount}</span>
            <button className="btn btn-outline" disabled={page === pageCount} onClick={() => setPage((p) => p + 1)}>Next →</button>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      <Modal
        isOpen={modal === 'add' || modal === 'edit'}
        onClose={closeModal}
        title={modal === 'edit' ? 'Edit Patient' : 'Add New Patient'}
        footer={
          <>
            <button className="btn btn-outline" onClick={closeModal}>Cancel</button>
            <button className="btn btn-primary" onClick={savePatient} disabled={saving}>
              {saving ? 'Saving…' : modal === 'edit' ? 'Save Changes' : 'Add Patient'}
            </button>
          </>
        }
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
          <FormField label="Full Name" name="fullName" value={form.fullName} onChange={handleInputChange} error={form.errors?.fullName} required />
          <FormField label="Email Address" name="email" type="email" value={form.email} onChange={handleInputChange} />
          <FormField label="Phone Number" name="phone" value={form.phone} onChange={handleInputChange} />
          <FormField label="Date of Birth" name="dob" type="date" value={form.dob} onChange={handleInputChange} />
          <SelectField label="Gender" name="gender" value={form.gender} onChange={handleInputChange} options={GENDERS} />
          <SelectField label="Patient Type" name="patientType" value={form.patientType} onChange={handleInputChange} options={PATIENT_TYPES} />
          <SelectField label="Blood Type" name="bloodType" value={form.bloodType} onChange={handleInputChange} options={BLOOD_TYPES} />
          <FormField label="PhilHealth #" name="philHealthNumber" value={form.philHealthNumber} onChange={handleInputChange} />
          <FormField label="HMO Provider" name="hmoProvider" value={form.hmoProvider} onChange={handleInputChange} />
          <div className="form-group" style={{ gridColumn: '1/-1' }}>
            <label className="form-label">Address</label>
            <input className="form-input" name="address" value={form.address || ''} onChange={handleInputChange} />
          </div>
          <div className="form-group" style={{ gridColumn: '1/-1' }}>
            <label className="form-label">Allergies</label>
            <input className="form-input" name="allergies" value={form.allergies || ''} onChange={handleInputChange} />
          </div>
          <div className="form-group" style={{ gridColumn: '1/-1' }}>
            <label className="form-label">Medical Notes</label>
            <textarea className="form-input" name="medicalNotes" rows={2} value={form.medicalNotes || ''} onChange={handleInputChange} />
          </div>
        </div>
      </Modal>

      {/* View Modal */}
      <Modal
        isOpen={modal === 'view' && !!selected}
        onClose={closeModal}
        title={selected?.fullName}
        maxWidth={480}
        footer={
          <>
            <button className="btn btn-outline" onClick={closeModal}>Close</button>
            <button className="btn btn-primary" onClick={() => { closeModal(); openEdit(selected) }}>Edit</button>
          </>
        }
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 24px' }}>
          {[
            ['Patient Type', <span className={`badge ${TYPE_BADGES[selected?.patientType] || 'badge-gray'}`}>{selected?.patientType || 'Regular'}</span>],
            ['Gender', <span className={`badge ${GENDER_BADGES[selected?.gender] || 'badge-gray'}`}>{selected?.gender || '—'}</span>],
            ['Date of Birth', selected?.dob ? new Date(selected.dob).toLocaleDateString('en-PH') : '—'],
            ['Blood Type', selected?.bloodType || '—'],
            ['Phone', selected?.phone || '—'],
            ['Email', selected?.email || '—'],
            ['PhilHealth #', selected?.philHealthNumber || '—'],
            ['HMO Provider', selected?.hmoProvider || '—'],
          ].map(([label, val]) => (
            <div key={label}>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 2 }}>{label}</div>
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{val}</div>
            </div>
          ))}
          {selected?.address && (
            <div style={{ gridColumn: '1/-1' }}>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 2 }}>Address</div>
              <div style={{ fontSize: 13, color: 'var(--text)' }}>{selected.address}</div>
            </div>
          )}
          {selected?.allergies && (
            <div style={{ gridColumn: '1/-1' }}>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 2 }}>Allergies</div>
              <div style={{ fontSize: 13, color: 'var(--text)' }}>{selected.allergies}</div>
            </div>
          )}
          {selected?.medicalNotes && (
            <div style={{ gridColumn: '1/-1' }}>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 2 }}>Medical Notes</div>
              <div style={{ fontSize: 13, color: 'var(--text)' }}>{selected.medicalNotes}</div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  )
}