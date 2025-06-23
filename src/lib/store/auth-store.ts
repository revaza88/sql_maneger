import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

interface User {
  id: number
  email: string
  name: string
  role: string
}

interface AuthState {
  user: User | null
  token: string | null
  isHydrated: boolean
  setAuth: (user: User, token: string) => void
  clearAuth: () => void
  setHydrated: () => void
  isTokenExpired: () => boolean
  getTokenExpirationTime: () => number | null
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isHydrated: false,
      setAuth: (user, token) => set({ user, token }),
      clearAuth: () => set({ user: null, token: null }),
      setHydrated: () => set({ isHydrated: true }),
      isTokenExpired: () => {
        const { token } = get();
        if (!token) return true;
        
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          const currentTime = Math.floor(Date.now() / 1000);
          return payload.exp < currentTime;
        } catch {
          return true;
        }
      },
      getTokenExpirationTime: () => {
        const { token } = get();
        if (!token) return null;
        
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          return payload.exp * 1000; // Convert to milliseconds
        } catch {
          return null;
        }
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated?.();
      },
    }
  )
)
