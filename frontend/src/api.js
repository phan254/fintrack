
import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('fintrack_token')

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
}

export const portfolioAPI = {
  getAll: () => api.get('/portfolios'),
  getOne: (id) => api.get(`/portfolios/${id}`),
  create: (data) => api.post('/portfolios', data),
  update: (id, data) => api.put(`/portfolios/${id}`, data),
  delete: (id) => api.delete(`/portfolios/${id}`),
  getSummary: (id) => api.get(`/portfolios/${id}/summary`),
}

export const transactionAPI = {
  getAll: (params = {}) => api.get('/transactions', { params }),
  create: (data) => api.post('/transactions', data),
  update: (id, data) => api.put(`/transactions/${id}`, data),
  delete: (id) => api.delete(`/transactions/${id}`),
}

export const holdingAPI = {
  getAll: (params = {}) => api.get('/holdings', { params }),
  create: (data) => api.post('/holdings', data),
  update: (id, data) => api.put(`/holdings/${id}`, data),
  delete: (id) => api.delete(`/holdings/${id}`),
}

export default api
