import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor - add token to headers
api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token')
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor - handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Unauthorized - clear token and redirect to login
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      if (typeof window !== 'undefined') {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default api


// AUTH APIs

export const authAPI = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),

  getMe: () => api.get('/auth/me'),
}


// USER APIs

export const userAPI = {
  getAll: () => api.get('/users'),
  getById: (id: number) => api.get(`/users/${id}`),
  create: (data: any) => api.post('/users', data),
  update: (id: number, data: any) => api.put(`/users/${id}`, data),
  delete: (id: number) => api.delete(`/users/${id}`),
}


// CARD APIs

export const cardAPI = {
  getAll: (userId?: number) =>
    api.get('/cards', { params: userId ? { user_id: userId } : {} }),
  getById: (id: number) => api.get(`/cards/${id}`),
  create: (data: any) => api.post('/cards', data),
  update: (id: number, data: any) => api.put(`/cards/${id}`, data),
  activate: (id: number) => api.put(`/cards/${id}/activate`),
  deactivate: (id: number) => api.put(`/cards/${id}/deactivate`),
  delete: (id: number) => api.delete(`/cards/${id}`),
}


// DOOR APIs

export const doorAPI = {
  getAll: (accessLevel?: string, departmentId?: number) =>
    api.get('/doors', {
      params: { access_level: accessLevel, department_id: departmentId },
    }),
  getById: (id: number) => api.get(`/doors/${id}`),
  create: (data: any) => api.post('/doors', data),
  update: (id: number, data: any) => api.put(`/doors/${id}`, data),
  lock: (id: number) => api.put(`/doors/${id}/lock`),
  unlock: (id: number) => api.put(`/doors/${id}/unlock`),
  delete: (id: number) => api.delete(`/doors/${id}`),
}


// DEPARTMENT APIs

export const departmentAPI = {
  getAll: (withCount?: boolean) =>
    api.get('/departments', { params: withCount ? { with_count: 'true' } : {} }),
  getById: (id: number) => api.get(`/departments/${id}`),
}


// PERMISSION APIs
export const permissionAPI = {
  // Permission Templates
  getAll: (activeOnly?: boolean) =>
    api.get('/permissions', { params: activeOnly ? { active_only: true } : {} }),
  getById: (id: number) => api.get(`/permissions/${id}`),
  create: (data: any) => api.post('/permissions', data),
  update: (id: number, data: any) => api.put(`/permissions/${id}`, data),
  delete: (id: number, hardDelete?: boolean) =>
    api.delete(`/permissions/${id}`, { params: hardDelete ? { hard_delete: true } : {} }),
  getCards: (id: number) => api.get(`/permissions/${id}/cards`),

  // Card Permission Assignment
  getCardPermissions: (cardId: number) => api.get(`/cards/${cardId}/permissions`),
  assignToCard: (cardId: number, data: any) => api.post(`/cards/${cardId}/permissions`, data),
  updateCardPermission: (id: number, data: any) => api.put(`/card-permissions/${id}`, data),
  removeFromCard: (id: number) => api.delete(`/card-permissions/${id}`),
  removeAllFromCard: (cardId: number) => api.delete(`/cards/${cardId}/permissions`),
}





// ACCESS CONTROL APIs

export const accessAPI = {
  requestAccess: (data: { card_uid: string; door_id: number }) =>
    api.post('/access/request', data),

  // Tôi thêm API để scan QR code
  scanQR: (data: { qr_data: any; door_id: number }) =>
    api.post('/access/scan-qr', data),

  getLogs: (filters?: any) =>
    api.get('/access/logs', { params: filters }),

  getMyLogs: (params?: any) => api.get('/access/my-logs', { params }),

  getRecent: (limit?: number) =>
    api.get('/access/recent', { params: limit ? { limit } : {} }),

  getStats: () => api.get('/access/stats'),
}
