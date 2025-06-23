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
  console.log(`Making API request to: ${config.url}`);
  
  // Get token from localStorage directly as a fallback for SSR issues
  const authStorage = localStorage.getItem('auth-storage');
  if (authStorage) {
    try {
      const parsed = JSON.parse(authStorage);
      const token = parsed.state?.token;
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.warn('Failed to parse auth storage:', error);
    }
  }
  return config;
});

// Handle auth errors and token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 429) {
      console.error('Rate limit exceeded. Headers:', error.response.headers);
      console.error('Request URL:', error.config?.url);
    }
    
    if (error.response?.status === 401 && error.response?.data?.code === 'TOKEN_EXPIRED' && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        // Try to refresh the token
        const authStorage = localStorage.getItem('auth-storage');
        if (authStorage) {
          const parsed = JSON.parse(authStorage);
          const oldToken = parsed.state?.token;
          
          if (oldToken) {
            // Make refresh request with old token
            const refreshResponse = await axios.post(`${API_URL}/auth/refresh`, {}, {
              headers: { Authorization: `Bearer ${oldToken}` }
            });
            
            const { token, user } = refreshResponse.data;
            
            // Update auth store with new token
            useAuthStore.getState().setAuth(user, token);
            
            // Retry original request with new token
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          }
        }
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
        // Refresh failed, redirect to login
        useAuthStore.getState().clearAuth();
        window.location.href = '/admin/login';
        return Promise.reject(refreshError);
      }
    }
    
    if (error.response?.status === 401) {
      useAuthStore.getState().clearAuth();
      window.location.href = '/admin/login';
    }
    
    return Promise.reject(error);
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
  refresh: async () => {
    const response = await api.post('/auth/refresh', {});
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
  
  rename: async (oldName: string, newName: string) => {
    // Mock implementation until backend endpoint is ready
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          status: 'success',
          message: `Database renamed from ${oldName} to ${newName}`,
          data: {
            oldName,
            newName,
            timestamp: new Date().toISOString()
          }
        });
      }, 1500); // Simulate 1.5 seconds of processing time
    });
    
    // Real API call (commented until backend implements this endpoint)
    // const response = await api.put(`/databases/${oldName}/rename`, { newName });
    // return response.data;
  },
}

// Add User interface
export interface User {
  id: string;
  email: string;
  name?: string;
  role: "USER" | "ADMIN";
  isBlocked?: boolean;
  isPaused?: boolean; // Added paused status
  lastLogin?: string; // Added lastLogin property
  createdAt?: string;
  updatedAt?: string;
}

// Admin API
export const adminApi = {
  getUsers: async (params?: { page?: number; limit?: number; search?: string }): Promise<User[]> => {
    // Clean up params to avoid axios issues
    const cleanParams = params && Object.keys(params).length > 0 ? 
      Object.fromEntries(Object.entries(params).filter(([_, value]) => value !== undefined && value !== null)) : 
      undefined;
    
    const response = await api.get('/admin/users', cleanParams ? { params: cleanParams } : {});
    return response.data.data;
  },
  createUser: async (userData: { email: string; name: string; password: string; role: "USER" | "ADMIN" }): Promise<User> => {
    const response = await api.post('/admin/users', userData);
    return response.data.data;
  },
  updateUserRole: async (userId: string, role: "USER" | "ADMIN"): Promise<User> => {
    const response = await api.put(`/admin/users/${userId}/role`, { role });
    return response.data.data;
  },
  deleteUser: async (userId: string): Promise<void> => {
    await api.delete(`/admin/users/${userId}`);
  },
  blockUser: async (userId: string): Promise<void> => {
    await api.put(`/admin/users/${userId}/block`, {});
  },
  unblockUser: async (userId: string): Promise<void> => {
    await api.put(`/admin/users/${userId}/unblock`, {});
  },
  pauseUser: async (userId: string): Promise<void> => {
    await api.put(`/admin/users/${userId}/pause`, {});
  },
  unpauseUser: async (userId: string): Promise<void> => {
    await api.put(`/admin/users/${userId}/unpause`, {});
  },
  resetPassword: async (userId: string, newPassword: string): Promise<void> => {
    await api.put(`/admin/users/${userId}/password`, { newPassword });
  },
  getStats: async () => {
    const response = await api.get('/admin/stats');
    return response.data.data;
  },
  getLoginHistory: async () => {
    const response = await api.get('/admin/login-history');
    return response.data.data;
  },
  getAuditLogs: async () => {
    const response = await api.get('/admin/audit-logs');
    return response.data.data;
  },
  listNotifications: async () => {
    const response = await api.get('/admin/notifications');
    return response.data.data;
  },
  createNotification: async (data: { message: string; type?: string; isActive?: boolean }) => {
    const response = await api.post('/admin/notifications', data);
    return response.data.data;
  },
  updateNotification: async (id: number, data: { message: string; type?: string; isActive?: boolean }) => {
    await api.put(`/admin/notifications/${id}`, data);
  },
  deleteNotification: async (id: number) => {
    await api.delete(`/admin/notifications/${id}`);
  },
  getSystemStats: async () => {
    const response = await api.get('/admin/system-stats');
    return response.data.data;
  },
  listRoles: async () => {
    const response = await api.get('/admin/roles');
    return response.data.data;
  },
  createRole: async (data: { name: string; description?: string }) => {
    const response = await api.post('/admin/roles', data);
    return response.data.data;
  },
  // Database management methods
  getDatabases: async () => {
    const response = await api.get('/admin/databases');
    return response.data;
  },
  createDatabase: async (data: { databaseName: string; userId: string; template?: string; collation?: string; initialSize?: number }) => {
    const response = await api.post('/admin/databases', data);
    return response.data;
  },
  deleteDatabase: async (databaseName: string) => {
    const response = await api.delete(`/admin/databases/${encodeURIComponent(databaseName)}`);
    return response.data;
  },
  backupDatabase: async (databaseName: string) => {
    const response = await api.post(`/admin/databases/${encodeURIComponent(databaseName)}/backup`, {});
    return response.data;
  },
  getDatabaseDetails: async (databaseName: string) => {
    const response = await api.get(`/admin/databases/${encodeURIComponent(databaseName)}/details`);
    return response.data;
  },
};

export const sqlServerConfigApi = {
  getConnections: async () => {
    const response = await api.get('/sql-server-config');
    return response.data;
  },
  addConnection: async (connectionData: {
    serverName: string;
    serverAddress: string;
    port?: string;
    username: string;
    password: string;
    database?: string;
    connectionTimeout?: string;
    requestTimeout?: string;
    trustServerCertificate?: boolean;
    encrypt?: boolean;
  }) => {
    const response = await api.post('/sql-server-config', connectionData);
    return response.data;
  },
  getConnection: async (id: string) => {
    const response = await api.get(`/sql-server-config/${id}`);
    return response.data;
  },
  updateConnection: async (id: string, connectionData: {
    serverName: string;
    serverAddress: string;
    port?: string;
    username: string;
    password: string;
    database?: string;
    connectionTimeout?: string;
    requestTimeout?: string;
    trustServerCertificate?: boolean;
    encrypt?: boolean;
  }) => {
    const response = await api.put(`/sql-server-config/${id}`, connectionData);
    return response.data;
  },
  testConnection: async (id: string) => {
    const response = await api.post(`/sql-server-config/${id}/test`);
    return response.data;
  },
  deleteConnection: async (id: string) => {
    const response = await api.delete(`/sql-server-config/${id}`);
    return response.data;
  },
};

export const backupApi = {
  // Backup configurations
  getConfigs: async () => {
    const response = await api.get('/backup/configs');
    return response.data;
  },
  createConfig: async (configData: {
    name: string;
    schedule: string;
    databases: string[];
    retentionDays: number;
    enabled: boolean;
  }) => {
    const response = await api.post('/backup/configs', configData);
    return response.data;
  },
  updateConfig: async (id: string, configData: any) => {
    const response = await api.put(`/backup/configs/${id}`, configData);
    return response.data;
  },
  deleteConfig: async (id: string) => {
    const response = await api.delete(`/backup/configs/${id}`);
    return response.data;
  },
  runConfigBackup: async (id: string) => {
    const response = await api.post(`/backup/configs/${id}/run`);
    return response.data;
  },

  // Backup files
  getFiles: async (database?: string) => {
    const params = database ? { database } : {};
    const response = await api.get('/backup/files', { params });
    return response.data;
  },
  createManualBackup: async (database: string, connectionId: string) => {
    const response = await api.post('/backup/backup', { database, connectionId });
    return response.data;
  },
  restoreFromBackup: async (backupFileId: string, newDatabaseName?: string, connectionId?: string) => {
    const response = await api.post('/backup/restore', {
      backupFileId,
      newDatabaseName,
      connectionId
    });
    return response.data;
  },
  deleteFile: async (id: string) => {
    const response = await api.delete(`/backup/files/${id}`);
    return response.data;
  },

  // Databases
  getDatabases: async (connectionId: string) => {
    const response = await api.get(`/backup/databases/${connectionId}`);
    return response.data;
  },

  // Batch backups
  createBatchBackup: async () => {
    const response = await api.post('/backup/batch-backup');
    return response.data;
  },
  getBatchBackups: async () => {
    const response = await api.get('/backup/batch-backups');
    return response.data;
  },
  getBatchBackupDetails: async (batchId: string) => {
    const response = await api.get(`/backup/batch-backups/${batchId}`);
    return response.data;
  },
  restoreBatchBackup: async (batchId: string) => {
    const response = await api.post(`/backup/batch-restore/${batchId}`);
    return response.data;
  },
  restoreSingleFromBatch: async (batchId: string, database: string) => {
    const response = await api.post(`/backup/batch-restore/${batchId}/${database}`);
    return response.data;
  },
  deleteBatchBackup: async (batchId: string) => {
    const response = await api.delete(`/backup/batch-backups/${batchId}`);
    return response.data;
  },
  getRestoreStatus: async (operationId: string) => {
    const response = await api.get(`/backup/restore-status/${operationId}`);
    return response.data;
  },
};

export const dashboardApi = {
  getOverviewStats: async () => {
    const response = await api.get('/dashboard/overview');
    return response.data;
  },
  getBackupStats: async () => {
    const response = await api.get('/dashboard/backup-stats');
    return response.data;
  },
  getDatabaseHealth: async () => {
    const response = await api.get('/dashboard/database-health');
    return response.data;
  },
  getRecentActivity: async (limit: number = 10) => {
    const response = await api.get(`/dashboard/recent-activity?limit=${limit}`);
    return response.data;
  },
  getAlerts: async () => {
    const response = await api.get('/dashboard/alerts');
    return response.data;
  }
};
