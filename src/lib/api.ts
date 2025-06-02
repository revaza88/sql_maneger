import axios from 'axios'
import { useAuthStore } from '@/lib/store/auth-store'
import { API_URL } from './config'; // Added import for API_URL

export const api = axios.create({
  baseURL: API_URL,
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
    const response = await api.post('/auth/login', { email, password }); // Removed /api
    return response.data;
  },
  register: async (email: string, password: string, name: string) => {
    const response = await api.post('/auth/register', { email, password, name }); // Removed /api
    return response.data;
  },
};

export const profileApi = {
  getProfile: async () => {
    const response = await api.get('/profile');
    return response.data;
  },
  updateProfile: async (updates: { name?: string; email?: string }) => {
    const response = await api.put('/profile', updates);
    return response.data;
  },
  updatePassword: async (currentPassword: string, newPassword: string) => {
    const response = await api.put('/profile/password', { currentPassword, newPassword });
    return response.data;
  },
}

export interface Database {
  name: string
  size_mb: number
  create_date: string
  state_desc: string
}

export interface BackupHistoryItem {
  databaseName: string
  startTime: string
  finishTime: string
  sizeInMB: number
  backupFile: string
  backupType: string
}

export interface UploadedBackup {
  name: string
  size: number
  uploadDate: string
}

export const databaseApi = {
  list: async () => {
    try {
      const response = await api.get('/databases/list'); // Removed /api
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
    const response = await api.get(`/databases/${name}`); // Removed /api
    return response.data;
  },
  create: async (name: string, collation?: string) => {
    const response = await api.post('/databases', { name, collation }); // Removed /api
    return response.data;
  },
  delete: async (name: string) => {
    const response = await api.delete(`/databases/${name}`); // Removed /api
    return response.data;
  },
  backup: async (name: string, backupPath?: string) => {
    const response = await api.post(`/databases/${name}/backup`, { backupPath }); // Removed /api
    return response.data;
  },
  restore: async (name: string, backupPath: string) => {
    const response = await api.post(`/databases/${name}/restore`, { backupPath }); // Removed /api
    return response.data;
  },
  getBackupHistory: async (databaseName?: string) => {
    const url = databaseName
      ? `/databases/${databaseName}/backup-history` // Removed /api
      : '/databases/backup-history'; // Removed /api
    const response = await api.get(url);
    return response.data;
  },
  getUploadedBackups: async () => {
    const response = await api.get('/databases/uploaded-backups'); // Removed /api
    return response.data;
  },
  // New file download/upload methods
  downloadBackup: async (databaseName: string) => {
    const response = await api.get(`/databases/${databaseName}/download-backup`, { // Removed /api
      responseType: 'blob',
    })

    // Create download link
    const url = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href = url
    link.download = `${databaseName}_backup_${new Date().toISOString().slice(0, 10)}.bak`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)

    return { status: 'success', message: 'Backup downloaded successfully' }
  },

  uploadBackup: async (file: File, onProgress?: (progress: number) => void) => {
    const formData = new FormData();
    formData.append('backupFile', file);

    const response = await api.post('/databases/upload-backup', formData, { // Removed /api
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total && onProgress) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total)
          onProgress(progress)
        }
      },
    })

    return response.data
  },

  restoreFromUpload: async (databaseName: string, filename: string) => {
    const response = await api.post(`/databases/${databaseName}/restore-from-upload`, { // Removed /api
      filename,
    });
    return response.data;
  },
}

// Add User interface
export interface User {
  id: string;
  email: string;
  name?: string;
  role: "USER" | "ADMIN";
  createdAt?: string;
  updatedAt?: string;
}

// Admin API
export const adminApi = {
  getUsers: async (token: string): Promise<User[]> => {
    const response = await api.get('/admin/users', { // Removed /api
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data.data;
  },
  updateUserRole: async (userId: string, role: "USER" | "ADMIN", token: string): Promise<User> => {
    const response = await api.put(`/admin/users/${userId}/role`, { role }, { // Removed /api
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data.data;
  },
  deleteUser: async (userId: string, token: string): Promise<void> => {
    await api.delete(`/admin/users/${userId}`, { // Removed /api
      headers: { Authorization: `Bearer ${token}` },
    });
  },
};
