"use client";

import { useEffect } from 'react';
import { useAuthStore } from '@/lib/store/auth-store';
import { authApi } from '@/lib/api';

export function TokenRefreshProvider({ children }: { children: React.ReactNode }) {
  const { token, user, isTokenExpired, getTokenExpirationTime, setAuth, clearAuth } = useAuthStore();

  useEffect(() => {
    if (!token || !user) return;

    // Check if token is already expired
    if (isTokenExpired()) {
      console.log('Token is already expired, clearing auth');
      clearAuth();
      return;
    }

    const expirationTime = getTokenExpirationTime();
    if (!expirationTime) return;

    // Calculate time until token expires (refresh 5 minutes before expiration)
    const timeUntilExpiry = expirationTime - Date.now();
    const refreshTime = Math.max(timeUntilExpiry - 5 * 60 * 1000, 1000); // 5 minutes before or 1 second minimum

    console.log(`Token expires in ${Math.round(timeUntilExpiry / 1000)} seconds, will refresh in ${Math.round(refreshTime / 1000)} seconds`);

    const refreshTimer = setTimeout(async () => {
      try {
        console.log('Attempting to refresh token...');
        const response = await authApi.refresh();
        setAuth(response.user, response.token);
        console.log('Token refreshed successfully');
      } catch (error) {
        console.error('Token refresh failed:', error);
        clearAuth();
      }
    }, refreshTime);

    return () => clearTimeout(refreshTimer);
  }, [token, user, isTokenExpired, getTokenExpirationTime, setAuth, clearAuth]);

  return <>{children}</>;
}
