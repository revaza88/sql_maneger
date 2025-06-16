'use client';
import { useEffect, useState } from 'react';
import { adminApi } from '@/lib/api';
import { useAuthStore } from '@/lib/store/auth-store';
import { Button } from '@/components/ui/button';

export default function AdminDashboard() {
  const { token, user } = useAuthStore();
  const [stats, setStats] = useState<{ totalUsers: number; blockedUsers: number } | null>(null);
  const [systemStats, setSystemStats] = useState<{ freeMem: number; totalMem: number; load: number } | null>(null);

  useEffect(() => {
    if (!token || user?.role?.toLowerCase() !== 'admin') return;
    adminApi.getStats(token).then(setStats);
    adminApi.getSystemStats(token).then(setSystemStats);
  }, [token, user]);

  if (!token) return <div className="p-4">Unauthorized</div>;

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">System Statistics</h1>
      {stats && (
        <div>
          <p>Total Users: {stats.totalUsers}</p>
          <p>Blocked Users: {stats.blockedUsers}</p>
        </div>
      )}
      {systemStats && (
        <div>
          <p>Free Memory: {Math.round(systemStats.freeMem / (1024 * 1024))} MB</p>
          <p>Total Memory: {Math.round(systemStats.totalMem / (1024 * 1024))} MB</p>
          <p>Load Average: {systemStats.load}</p>
        </div>
      )}
      <Button onClick={() => history.back()}>Back</Button>
    </div>
  );
}
