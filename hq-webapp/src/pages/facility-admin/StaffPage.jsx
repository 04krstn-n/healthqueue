import { useState, useEffect, useCallback, useMemo } from 'react'
import api from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import { useToast, CommonModal, FormField, SelectField } from '../../components/ui/CommonModal'
import styles from './facility-admin.module.css'

const ROLES = ['doctor', 'nurse', 'midwife', 'med_tech', 'pharmacist', 'admin']
const ROLE_LABELS = { doctor: 'Doctor', nurse: 'Nurse', midwife: 'Midwife', med_tech: 'Med Tech', pharmacist: 'Pharmacist', admin: 'Admin Staff' }
const ROLE_BADGES = { doctor: 'badge-blue', nurse: 'badge-green', midwife: 'badge-teal', med_tech: 'badge-purple', pharmacist: 'badge-orange', admin: 'badge-gray' }
const GENDERS = ['Male', 'Female', 'Other', 'Prefer not to say']

const EMPTY_STAFF = {
  fullName: '', email: '', phone: '', gender: 'Male',
  role: 'doctor', specialization: '', licenseNumber: '', status: 'active', errors: {},
}

export default function StaffPage() {
  const { user } = useAuth()
  const { toast, showToast } = useToast()
  const [staff, setStaff] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('All')
  const [modal, setModal] = useState(null)
  const [selected, setSelected] = useState(null)
  const [form, setForm] = useState(EMPTY_STAFF)
  const [saving, setSaving] = useState(false)

  const clinicId = user?.clinicId

  const loadStaff = useCallback(async () => {
    if (!clinicId) return setLoading(false)
    setLoading(true)
    try {
      const res = await api.get('/api/staff', { params: { clinicId } })
      setStaff(res.data || [])
    } catch {
      setStaff([])
    } finally {
      setLoading(false)
    }
  }, [clinicId])

  useEffect(() => { loadStaff() }, [loadStaff])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setForm((f) => ({ ...f, [name]: value, errors: { ...f.errors, [name]: '' } }))
  }

  const openAdd = () => { setSelected(null); setForm(EMPTY_STAFF); setModal('add') }
  const openEdit = (s) => {
    setSelected(s)
    setForm({
      fullName: s.fullName || '',
      email: s.email || '',
      phone: s.phone || '',
      gender: s.gender || 'Male',
      role: s.role || 'doctor',
      specialization: s.specialization || '',
      licenseNumber: s.licenseNumber || '',
      status: s.isActive ? 'active' : 'inactive',
      errors: {},
    })
    setModal('edit')
  }
  const openView = (s) => { setSelected(s); setModal('view') }
  const closeModal = () => { setModal(null); setSelected(null) }

  const saveStaff = async () => {
    if (!clinicId) {
      showToast('Your account is not linked to a clinic.')
      return
    }
    const errors = {}
    if (!form.fullName.trim()) errors.fullName = 'Full name is required'
    if (!form.email.trim()) errors.email = 'Email is required'

    if (Object.keys(errors).length > 0) {
      setForm((f) => ({ ...f, errors }))
      return
    }
    setSaving(true)
    try {
      const payload = {
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        gender: form.gender,
        role: form.role,
        specialization: form.specialization.trim(),
        licenseNumber: form.licenseNumber.trim(),
        isActive: form.status === 'active',
        clinicId,
      }
      if (modal === 'edit') {
        await api.put(`/api/staff/${selected._id}`, payload)
        showToast('Staff member updated')
      } else {
        await api.post('/api/staff', payload)
        showToast('Staff member added — default password: Staff@123')
      }
      closeModal()
      loadStaff()
    } catch (e) {
      showToast(e?.response?.data?.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const removeStaff = async (id) => {
    if (!window.confirm('Deactivate this staff member?')) return
    try {
      await api.delete(`/api/staff/${id}`)
      showToast('Staff member deactivated')
      loadStaff()
    } catch {
      showToast('Failed to deactivate')
    }
  }

  const filteredStaff = useMemo(() => {
    const q = search.trim().toLowerCase()
    return staff.filter((s) => {
      const matchRole = roleFilter === 'All' || s.role === roleFilter
      const matchSearch = !q || s.fullName?.toLowerCase().includes(q) || s.email?.toLowerCase().includes(q)
      return matchRole && matchSearch
    })
  }, [staff, search, roleFilter])

  const exportCSV = () => {
    const rows = [['Name', 'Gender', 'Role', 'Specialization', 'Phone', 'Email', 'License #', 'Status']]
    filteredStaff.forEach((s) => rows.push([
      s.fullName, s.gender || '—', ROLE_LABELS[s.role] || s.role,
      s.specialization || '', s.phone || '', s.email || '',
      s.licenseNumber || '', s.isActive ? 'Active' : 'Inactive',
    ]))
    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `staff_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    showToast('Exported to CSV')
  }

  return (
    <div className={styles.page}>
      {toast && <div className={styles.toast}>{toast}</div>}
      {!clinicId && (
        <div style={{ padding: '12px 16px', background: '#FEF3C7', border: '1px solid #F59E0B', borderRadius: 8, marginBottom: 12, fontSize: 13, color: '#92400E' }}>
          <strong>No clinic assigned.</strong> Your facility admin account is not linked to a clinic.
        </div>
      )}

      <div className="card">
        <div className={styles.header} style={{ padding: '20px 24px' }}>
          <div>
            <div className={styles.title}>Staff Management</div>
            <div className={styles.sub}>{staff.length} staff members in this facility</div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginTop: 4 }}>
            <button className="btn btn-outline" onClick={exportCSV}>Export CSV</button>
            <button className="btn btn-primary" onClick={openAdd}>+ Add Staff</button>
          </div>
        </div>

        <div className={styles.toolbar} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 24px 20px', borderBottom: '1px solid var(--border)' }}>
          <input className="form-input" style={{ flex: 1, minWidth: 0 }} placeholder="Search by name or email..." value={search} onChange={(e) => setSearch(e.target.value)} />
          <select className="form-select" style={{ width: 180, flexShrink: 0 }} value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
            <option value="All">All Roles</option>
            {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
          </select>
          <button className="btn btn-outline" onClick={loadStaff}>Refresh</button>
        </div>

        <div className="table-wrap" style={{ borderRadius: 0, border: 'none', borderTop: '1px solid var(--border)' }}>
          <table>
            <thead>
              <tr><th>Name</th><th>Gender</th><th>Role</th><th>Specialization</th><th>Contact</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 32, color: 'var(--muted)' }}>Loading staff…</td></tr>
              ) : filteredStaff.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 32, color: 'var(--muted)' }}>No staff found</td></tr>
              ) : (
                filteredStaff.map((s) => (
                  <tr key={s._id}>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{s.fullName}</div>
                      <div style={{ fontSize: 11, color: 'var(--muted)' }}>{s.email}</div>
                    </td>
                    <td style={{ fontSize: 13 }}>{s.gender || '—'}</td>
                    <td><span className={`badge ${ROLE_BADGES[s.role] || 'badge-gray'}`}>{ROLE_LABELS[s.role] || s.role}</span></td>
                    <td style={{ fontSize: 13 }}>{s.specialization || '—'}</td>
                    <td style={{ fontSize: 13 }}>{s.phone || '—'}</td>
                    <td><span className={`badge ${s.isActive ? 'badge-green' : 'badge-gray'}`}>{s.isActive ? 'Active' : 'Inactive'}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-outline btn-sm" onClick={() => openView(s)}>View</button>
                        <button className="btn btn-outline btn-sm" onClick={() => openEdit(s)}>Edit</button>
                        <button className="btn btn-sm" style={{ background: 'var(--error-lt)', color: 'var(--error)' }} onClick={() => removeStaff(s._id)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* View Modal */}
      <Modal
        isOpen={modal === 'view' && !!selected}
        onClose={closeModal}
        title="Staff Profile"
        maxWidth={440}
        footer={
          <>
            <button className="btn btn-outline" onClick={closeModal}>Close</button>
            <button className="btn btn-primary" onClick={() => openEdit(selected)}>Edit</button>
          </>
        }
      >
        {[
          ['Full Name', selected?.fullName],
          ['Gender', selected?.gender || '—'],
          ['Role', ROLE_LABELS[selected?.role] || selected?.role],
          ['Specialization', selected?.specialization || '—'],
          ['Phone', selected?.phone || '—'],
          ['Email', selected?.email || '—'],
          ['License #', selected?.licenseNumber || '—'],
          ['Status', selected?.isActive ? 'Active' : 'Inactive'],
        ].map(([l, v]) => (
          <div key={l} style={{ display: 'flex', padding: '8px 0', borderBottom: '1px solid var(--border-lt)', gap: 12 }}>
            <span style={{ minWidth: 130, fontSize: 12, color: 'var(--muted)', fontWeight: 500 }}>{l}</span>
            <span style={{ fontSize: 13 }}>{v}</span>
          </div>
        ))}
      </Modal>

      {/* Add / Edit Modal */}
      <Modal
        isOpen={modal === 'add' || modal === 'edit'}
        onClose={closeModal}
        title={modal === 'edit' ? 'Edit Staff Member' : 'Add New Staff'}
        footer={
          <>
            <button className="btn btn-outline" onClick={closeModal}>Cancel</button>
            <button className="btn btn-primary" onClick={saveStaff} disabled={saving}>
              {saving ? 'Saving…' : modal === 'edit' ? 'Save Changes' : 'Add Staff'}
            </button>
          </>
        }
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
          <FormField label="Full Name" name="fullName" value={form.fullName} onChange={handleInputChange} error={form.errors?.fullName} required />
          <FormField label="Email Address" name="email" type="email" value={form.email} onChange={handleInputChange} error={form.errors?.email} required />
          <FormField label="Phone Number" name="phone" type="tel" value={form.phone} onChange={handleInputChange} />
          <SelectField label="Gender" name="gender" value={form.gender} onChange={handleInputChange} options={GENDERS} />
          <SelectField label="Role" name="role" value={form.role} onChange={handleInputChange} options={ROLES.map((r) => ({ value: r, label: ROLE_LABELS[r] }))} />
          <FormField label="Specialization" name="specialization" value={form.specialization} onChange={handleInputChange} />
          <FormField label="License Number" name="licenseNumber" value={form.licenseNumber} onChange={handleInputChange} />
          <SelectField label="Status" name="status" value={form.status} onChange={handleInputChange} options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]} />
        </div>
      </Modal>
    </div>
  )
}