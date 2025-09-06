import axios from 'axios'
import Cookies from 'js-cookie'
import toast from 'react-hot-toast'

// Create axios instance
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  timeout: 30000, // Increased to 30 seconds for performance operations
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
  login: (email, password) => api.post('/api/auth/login', { email, password }),
  register: (userData) => api.post('/api/auth/register', userData),
  verifyOTP: (otpData) => api.post('/api/auth/verify-otp', otpData),
  resendOTP: (emailData) => api.post('/api/auth/resend-otp', emailData),
  getCurrentUser: () => api.get('/api/auth/me'),
}

// Databases API
export const databasesAPI = {
  getAll: () => api.get('/api/databases'),
  getById: (id) => api.get(`/api/databases/${id}`),
  create: (databaseData) => api.post('/api/databases', databaseData),
  delete: (id) => api.delete(`/api/databases/${id}`),
  scale: (id, scaleData) => api.patch(`/api/databases/${id}/scale`, scaleData),
  getConnection: (id) => api.post(`/api/databases/${id}/connection`),
  getSchema: (id) => api.get(`/api/databases/${id}/schema`),
  getTableDetails: (id, tableName) => api.get(`/api/databases/${id}/schema/tables/${tableName}`),
  executeQuery: (id, query, limit) => api.post(`/api/databases/${id}/query`, { query, limit }),
  getCollectionData: (id, collectionName, options = {}) => {
    const { limit = 10, skip = 0, filter = '{}' } = options;
    return api.get(`/api/databases/${id}/data/${collectionName}`, { 
      params: { limit, skip, filter } 
    });
  },
}

// Projects API
export const projectsAPI = {
  getAll: () => api.get('/api/projects'),
  getById: (id) => api.get(`/api/projects/${id}`),
  create: (projectData) => api.post('/api/projects', projectData),
  update: (id, projectData) => api.put(`/api/projects/${id}`, projectData),
  delete: (id) => api.delete(`/api/projects/${id}`),
  getStats: (id) => api.get(`/api/projects/${id}/stats`),
}

// Monitoring API
export const monitoringAPI = {
  getDatabaseMetrics: (id, timeRange = '1h') => 
    api.get(`/api/monitoring/databases/${id}/metrics`, { params: { timeRange } }),
  getDatabaseHistory: (id, metric = 'cpu', timeRange = '1h') => 
    api.get(`/api/monitoring/databases/${id}/metrics/history`, { 
      params: { metric, timeRange } 
    }),
  getDashboardUrl: (id) => api.get(`/api/monitoring/databases/${id}/dashboard`),
  getSystemMetrics: () => api.get('/api/monitoring/system/metrics'),
  getAlerts: () => api.get('/api/monitoring/alerts'),
}

// AI Assistant API
export const aiAssistantAPI = {
  chat: (message, context = {}) => api.post('/api/ai-assistant/chat', { message, context }),
  getCapabilities: () => api.get('/api/ai-assistant/capabilities'),
  getHistory: (limit = 20) => api.get(`/api/ai-assistant/history?limit=${limit}`),
  suggestSchema: (purpose, industry, expectedLoad) => 
    api.post('/api/ai-assistant/suggest-schema', { purpose, industry, expectedLoad }),
  generateCode: (databaseId, language = 'nodejs', operation = 'connect') =>
    api.post('/api/ai-assistant/generate-code', { databaseId, language, operation })
}

export default api
