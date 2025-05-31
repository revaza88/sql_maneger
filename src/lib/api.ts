import axios from 'axios'
import { useAuthStore } from '@/lib/store/auth-store'

const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

export const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().clearAuth()
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export const authApi = {
  login: async (email: string, password: string) => {
    const response = await api.post('/api/auth/login', { email, password })
    return response.data
  },
  register: async (email: string, password: string, name: string) => {
    const response = await api.post('/api/auth/register', { email, password, name })
    return response.data
  },
}

export const databaseApi = {
  list: async () => {
    try {
      const response = await api.get('/api/databases/list')
      console.log('API Response:', response.data)
      if (response.data.status === 'success' && Array.isArray(response.data.data)) {
        return response.data.data
      }
      console.error('Invalid API response format:', response.data)
      return []
    } catch (error) {
      console.error('API Error:', error)
      throw error
    }
  },
  getInfo: async (name: string) => {
    const response = await api.get(`/api/databases/${name}`)
    return response.data
  },
  create: async (name: string, collation?: string) => {
    const response = await api.post('/api/databases', { name, collation })
    return response.data
  },
  delete: async (name: string) => {
    const response = await api.delete(`/api/databases/${name}`)
    return response.data
  },
  backup: async (name: string, backupPath?: string) => {
    const response = await api.post(`/api/databases/${name}/backup`, { backupPath })
    return response.data
  },
  restore: async (name: string, backupPath: string) => {
    const response = await api.post(`/api/databases/${name}/restore`, { backupPath })
    return response.data
  },
  getBackupHistory: async (databaseName?: string) => {
    const url = databaseName 
      ? `/api/databases/${databaseName}/backup-history` 
      : '/api/databases/backup-history'
    const response = await api.get(url)
    return response.data
  },
}
