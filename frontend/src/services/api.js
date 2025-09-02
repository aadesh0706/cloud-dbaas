import axios from 'axios'
import Cookies from 'js-cookie'
import toast from 'react-hot-toast'

// Create axios instance
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  timeout: 10000,
})

// Add auth token to requests
api.interceptors.request.use(
  (config) => {
    const token = Cookies.get('authToken')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Handle auth errors globally
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      Cookies.remove('authToken')
      window.location.href = '/login'
      toast.error('Session expired. Please login again.')
    }
    return Promise.reject(error)
  }
)

// Auth API
export const authAPI = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (userData) => api.post('/auth/register', userData),
  getCurrentUser: () => api.get('/auth/me'),
}

// Databases API
export const databasesAPI = {
  getAll: () => api.get('/databases'),
  getById: (id) => api.get(`/databases/${id}`),
  create: (databaseData) => api.post('/databases', databaseData),
  delete: (id) => api.delete(`/databases/${id}`),
  scale: (id, scaleData) => api.patch(`/databases/${id}/scale`, scaleData),
  getConnection: (id) => api.post(`/databases/${id}/connection`),
}

// Projects API
export const projectsAPI = {
  getAll: () => api.get('/projects'),
  getById: (id) => api.get(`/projects/${id}`),
  create: (projectData) => api.post('/projects', projectData),
  update: (id, projectData) => api.put(`/projects/${id}`, projectData),
  delete: (id) => api.delete(`/projects/${id}`),
  getStats: (id) => api.get(`/projects/${id}/stats`),
}

// Monitoring API
export const monitoringAPI = {
  getDatabaseMetrics: (id, timeRange = '1h') => 
    api.get(`/monitoring/databases/${id}/metrics`, { params: { timeRange } }),
  getDatabaseHistory: (id, metric = 'cpu', timeRange = '1h') => 
    api.get(`/monitoring/databases/${id}/metrics/history`, { 
      params: { metric, timeRange } 
    }),
  getDashboardUrl: (id) => api.get(`/monitoring/databases/${id}/dashboard`),
  getSystemMetrics: () => api.get('/monitoring/system/metrics'),
  getAlerts: () => api.get('/monitoring/alerts'),
}

export default api
