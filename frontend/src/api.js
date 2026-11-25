import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
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

// When the API rejects the saved token (expired or revoked), clear it and
// tell the app so it can return to the login screen.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url || ''
    const isCredentialCheck =
      url.includes('/auth/login') || url.includes('/auth/register')

    if (
      error.response?.status === 401 &&
      !isCredentialCheck &&
      localStorage.getItem('fintrack_token')
    ) {
      localStorage.removeItem('fintrack_token')
      window.dispatchEvent(new Event('fintrack:session-expired'))
    }

    return Promise.reject(error)
  },
)

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