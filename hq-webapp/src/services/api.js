import axios from 'axios'

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000'

const api = axios.create({ baseURL: BASE })

// Attach token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('hq_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Handle 401s — but ONLY redirect if we are not on the login page
// Do NOT transform the error — let it pass through so callers can read .response.data
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      const onLoginPage = window.location.pathname.startsWith('/login')
      if (!onLoginPage) {
        localStorage.removeItem('hq_token')
        localStorage.removeItem('hq_user')
        window.location.href = '/login'
      }
    }
    // Re-throw the original axios error so callers can read err.response.data.message
    return Promise.reject(err)
  }
)

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authApi = {
  login: (email, password) => api.post('/api/auth/login', { email, password }),
  me:    ()                => api.get('/api/auth/me'),
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
export const dashboardApi = {
  superAdmin: ()         => api.get('/api/dashboard/super-admin'),
  facility:   (clinicId) => api.get('/api/dashboard/facility', { params: { clinicId } }),
}

// ── Clinics ───────────────────────────────────────────────────────────────────
export const clinicsApi = {
  list:   ()         => api.get('/api/clinics'),
  get:    (id)       => api.get(`/api/clinics/${id}`),
  create: (data)     => api.post('/api/clinics', data),
  update: (id, data) => api.put(`/api/clinics/${id}`, data),
  delete: (id)       => api.delete(`/api/clinics/${id}`),
}

// ── Users ─────────────────────────────────────────────────────────────────────
export const usersApi = {
  list:       (params)   => api.get('/api/users', { params }),
  get:        (id)       => api.get(`/api/users/${id}`),
  create:     (data)     => api.post('/api/users/create', data),
  update:     (id, data) => api.put(`/api/users/${id}`, data),
  deactivate: (id)       => api.delete(`/api/users/${id}`),
}

// ── Staff ─────────────────────────────────────────────────────────────────────
export const staffApi = {
  list:       (params)   => api.get('/api/staff', { params }),
  get:        (id)       => api.get(`/api/staff/${id}`),
  create:     (data)     => api.post('/api/staff', data),
  update:     (id, data) => api.put(`/api/staff/${id}`, data),
  deactivate: (id)       => api.delete(`/api/staff/${id}`),
}

// ── Patients ──────────────────────────────────────────────────────────────────
export const patientsApi = {
  list:       (params)   => api.get('/api/patients', { params }),
  get:        (id)       => api.get(`/api/patients/${id}`),
  create:     (data)     => api.post('/api/patients', data),
  update:     (id, data) => api.put(`/api/patients/${id}`, data),
  deactivate: (id)       => api.delete(`/api/patients/${id}`),
}

// ── Services ──────────────────────────────────────────────────────────────────
export const servicesApi = {
  list:   (clinicId)                  => api.get('/api/services', { params: { clinicId } }),
  add:    (data)                      => api.post('/api/services', data),
  update: (clinicId, serviceId, data) => api.put(`/api/services/${clinicId}/${serviceId}`, data),
  delete: (clinicId, serviceId)       => api.delete(`/api/services/${clinicId}/${serviceId}`),
}

// ── Queue ─────────────────────────────────────────────────────────────────────
export const queueApi = {
  list:      (params)  => api.get('/api/queues', { params }),
  metrics:   (clinicId) => api.get('/api/queues/metrics', { params: { clinicId } }),
  call:      (id)      => api.put(`/api/queues/${id}/call`),
  complete:  (id)      => api.put(`/api/queues/${id}/complete`),
  skip:      (id)      => api.put(`/api/queues/${id}/skip`),
  noShow:    (id)      => api.put(`/api/queues/${id}/no-show`),
  addWalkin: (data)    => api.post('/api/queues/add-walkin', data),
}

// ── Appointments ──────────────────────────────────────────────────────────────
export const appointmentsApi = {
  list:         (params)     => api.get('/api/appointments', { params }),
  today:        (clinicId)   => api.get('/api/appointments/today', { params: { clinicId } }),
  updateStatus: (id, status) => api.put(`/api/appointments/${id}/status`, { status }),
}

// ── Time Slots ────────────────────────────────────────────────────────────────
export const timeSlotsApi = {
  list:   (params)   => api.get('/api/appointments/timeslots', { params }),
  create: (data)     => api.post('/api/appointments/timeslots', data),
  update: (id, data) => api.put(`/api/appointments/timeslots/${id}`, data),
  delete: (id)       => api.delete(`/api/appointments/timeslots/${id}`),
}

// ── Chatbot Admin ─────────────────────────────────────────────────────────────
export const chatbotAdminApi = {
  getFAQs:   (params)   => api.get('/api/chatbot-admin/faqs', { params }),
  createFAQ: (data)     => api.post('/api/chatbot-admin/faqs', data),
  updateFAQ: (id, data) => api.put(`/api/chatbot-admin/faqs/${id}`, data),
  deleteFAQ: (id)       => api.delete(`/api/chatbot-admin/faqs/${id}`),
  getLogs:   (params)   => api.get('/api/chatbot-admin/logs', { params }),
}

// ── System Config ─────────────────────────────────────────────────────────────
export const systemConfigApi = {
  get:        ()           => api.get('/api/config'),
  update:     (key, value) => api.put(`/api/config/${key}`, { value }),
  bulkUpdate: (configs)    => api.put('/api/config/bulk', { configs }),
}

// ── Notifications ─────────────────────────────────────────────────────────────
export const notificationsApi = {
  list:       ()   => api.get('/api/notifications'),
  markRead:   (id) => api.put(`/api/notifications/${id}/read`),
  markAllRead: ()  => api.put('/api/notifications/read-all'),
}

export default api
