'use client';

import { useEffect, useState } from 'react';
import { adminApi } from '@/lib/api';
import { useAuthStore } from '@/lib/store/auth-store';
import { useRouter } from 'next/navigation';
import { LoadingSpinner } from '@/components/loading-spinner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { 
  Users, Database, Activity, Server, Cpu, HardDrive, 
  TrendingUp, Shield, Monitor 
} from 'lucide-react';

interface Stats {
  users: {
    total: number;
    active: number;
    blocked: number;
    activePercentage: number;
  };
  databases: {
    total: number;
    totalSizeMB: number;
    averageSizeMB: number;
  };
  activity: {
    recentLogins: number;
    onlineUsers: number;
  };
}

interface SystemStats {
  memory: {
    free: number;
    total: number;
    used: number;
    usagePercentage: number;
  };
  cpu: {
    load: number;
    cores: number;
    architecture: string;
    platform: string;
  };
  system: {
    uptime: number;
    hostname: string;
    nodeVersion: string;
    pid: number;
  };
  network: {
    interfaces: number;
  };
}

const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6'];

export default function AdminDashboard() {
  const { token, user } = useAuthStore();
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Authorization check
  useEffect(() => {
    if (!token || !user || user.role?.toLowerCase() !== 'admin') {
      router.push('/admin/login');
      return;
    }
  }, [token, user, router]);

  useEffect(() => {
    if (!token || user?.role?.toLowerCase() !== 'admin') return;
    
    const fetchData = async () => {
      try {
        setLoading(true);
        const [statsData, systemData] = await Promise.all([
          adminApi.getStats(token),
          adminApi.getSystemStats(token)
        ]);
        setStats(statsData);
        setSystemStats(systemData);
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    // Refresh data every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [token, user]);

  // Show loading if user is not authenticated or not admin
  if (!token || !user || user.role?.toLowerCase() !== 'admin') {
    return <LoadingSpinner />;
  }

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-64 bg-gray-200 rounded"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  // Prepare chart data
  const userDistributionData = stats ? [
    { name: 'Active Users', value: stats.users.active, color: '#10b981' },
    { name: 'Blocked Users', value: stats.users.blocked, color: '#ef4444' }
  ] : [];

  const systemMetricsData = systemStats ? [
    { name: 'Memory Usage', value: systemStats.memory.usagePercentage, color: '#3b82f6' },
    { name: 'CPU Load', value: Math.min(systemStats.cpu.load * 10, 100), color: '#f59e0b' }
  ] : [];

  const formatBytes = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  };

  return (
    <div className="p-6 space-y-6 bg-gradient-to-br from-slate-50 to-blue-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            System Dashboard
          </h1>
          <p className="text-gray-600 mt-1">Real-time system monitoring and statistics</p>
        </div>
        <Button 
          onClick={() => window.location.reload()} 
          variant="outline"
          className="flex items-center gap-2"
        >
          <Activity className="h-4 w-4" />
          Refresh Data
        </Button>
      </div>

      {/* Overview Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 opacity-80" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.users.total}</div>
              <p className="text-xs opacity-80">
                {stats.users.activePercentage}% active users
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-green-500 to-green-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Users</CardTitle>
              <TrendingUp className="h-4 w-4 opacity-80" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.users.active}</div>
              <p className="text-xs opacity-80">
                Currently online
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-500 to-purple-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Databases</CardTitle>
              <Database className="h-4 w-4 opacity-80" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.databases.total}</div>
              <p className="text-xs opacity-80">
                {stats.databases.totalSizeMB.toFixed(1)} MB total
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-red-500 to-red-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Blocked Users</CardTitle>
              <Shield className="h-4 w-4 opacity-80" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.users.blocked}</div>
              <p className="text-xs opacity-80">
                Security measures active
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Distribution Chart */}
        {stats && (
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-600" />
                User Distribution
              </CardTitle>
              <CardDescription>Active vs Blocked Users</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={userDistributionData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {userDistributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* System Performance Chart */}
        {systemStats && (
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Monitor className="h-5 w-5 text-purple-600" />
                System Performance
              </CardTitle>
              <CardDescription>Real-time system metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={systemMetricsData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip formatter={(value) => [`${value}%`, 'Usage']} />
                  <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* System Information */}
      {systemStats && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Memory Usage */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HardDrive className="h-5 w-5 text-green-600" />
                Memory Usage
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Used</span>
                  <span>{formatBytes(systemStats.memory.used)}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-green-400 to-green-600 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${systemStats.memory.usagePercentage}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Free: {formatBytes(systemStats.memory.free)}</span>
                  <span>Total: {formatBytes(systemStats.memory.total)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* CPU Information */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cpu className="h-5 w-5 text-orange-600" />
                CPU Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Load Average</span>
                <span className="font-semibold">{systemStats.cpu.load.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Cores</span>
                <span className="font-semibold">{systemStats.cpu.cores}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Architecture</span>
                <span className="font-semibold">{systemStats.cpu.architecture}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Platform</span>
                <span className="font-semibold capitalize">{systemStats.cpu.platform}</span>
              </div>
            </CardContent>
          </Card>

          {/* System Information */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="h-5 w-5 text-blue-600" />
                System Info
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Uptime</span>
                <span className="font-semibold">{formatUptime(systemStats.system.uptime)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Hostname</span>
                <span className="font-semibold truncate">{systemStats.system.hostname}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Node.js</span>
                <span className="font-semibold">{systemStats.system.nodeVersion}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Process ID</span>
                <span className="font-semibold">{systemStats.system.pid}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Database Statistics */}
      {stats && stats.databases.total > 0 && (
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5 text-indigo-600" />
              Database Statistics
            </CardTitle>
            <CardDescription>Overview of database usage and metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-4 bg-gradient-to-br from-indigo-50 to-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-indigo-600">{stats.databases.total}</div>
                <div className="text-sm text-gray-600">Total Databases</div>
              </div>
              <div className="text-center p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{stats.databases.totalSizeMB.toFixed(1)} MB</div>
                <div className="text-sm text-gray-600">Total Size</div>
              </div>
              <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-violet-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">{stats.databases.averageSizeMB.toFixed(1)} MB</div>
                <div className="text-sm text-gray-600">Average Size</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Back Button */}
      <div className="flex justify-center pt-6">
        <Button 
          onClick={() => history.back()} 
          variant="outline"
          size="lg"
          className="bg-white hover:bg-gray-50"
        >
          Back to Admin Panel
        </Button>
      </div>
    </div>
  );
}
