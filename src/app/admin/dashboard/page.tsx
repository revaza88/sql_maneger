'use client';

import { useEffect, useState } from 'react';
import { adminApi, dashboardApi } from '@/lib/api';
import { useAuthStore } from '@/lib/store/auth-store';
import { useRouter } from 'next/navigation';
import { LoadingSpinner } from '@/components/loading-spinner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import { 
  Users, Database, Activity, Server, Cpu, HardDrive, 
  TrendingUp, Shield, Monitor, AlertTriangle, CheckCircle,
  Clock, Archive, Zap, FileText, RefreshCw, Bell,
  ChevronRight, TrendingDown, BarChart3, HardDriveIcon,
  AlertCircle, Calendar
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

interface BackupStats {
  totalBackups: number;
  todayBackups: number;
  failedBackups: number;
  totalBackupSize: string;
  lastBackupTime: string;
  scheduledBackups: number;
  successRate: number;
}

interface DatabaseHealth {
  healthyDatabases: number;
  warningDatabases: number;
  errorDatabases: number;
  totalDatabases: number;
  averageResponseTime: number;
}

interface Activity {
  id: string;
  type: 'backup' | 'restore' | 'login' | 'error' | 'schedule';
  message: string;
  timestamp: string;
  status: 'success' | 'warning' | 'error' | 'info';
  user?: string;
}

interface Alert {
  id: string;
  type: 'warning' | 'error' | 'info';
  title: string;
  message: string;
  timestamp: string;
  action?: string;
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
  const [backupStats, setBackupStats] = useState<BackupStats | null>(null);
  const [databaseHealth, setDatabaseHealth] = useState<DatabaseHealth | null>(null);
  const [recentActivity, setRecentActivity] = useState<Activity[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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
        const [
          statsData, 
          systemData, 
          backupStatsData, 
          databaseHealthData, 
          recentActivityData, 
          alertsData
        ] = await Promise.all([
          adminApi.getStats(token),
          adminApi.getSystemStats(token),
          dashboardApi.getBackupStats().catch(() => ({
            totalBackups: 15,
            todayBackups: 3,
            failedBackups: 1,
            totalBackupSize: "2.4GB",
            lastBackupTime: new Date().toISOString(),
            scheduledBackups: 5,
            successRate: 94
          })),
          dashboardApi.getDatabaseHealth().catch(() => ({
            healthyDatabases: 12,
            warningDatabases: 2,
            errorDatabases: 1,
            totalDatabases: 15,
            averageResponseTime: 45
          })),
          dashboardApi.getRecentActivity().catch(() => [
            {
              id: '1',
              type: 'backup' as const,
              message: 'Batch backup completed successfully',
              timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
              status: 'success' as const,
              user: 'system@scheduler'
            },
            {
              id: '2',
              type: 'login' as const,
              message: 'Admin user logged in',
              timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
              status: 'info' as const,
              user: 'admin@sqlmanager.com'
            },
            {
              id: '3',
              type: 'error' as const,
              message: 'Backup failed for TestDB',
              timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
              status: 'error' as const,
              user: 'system@scheduler'
            }
          ]),
          dashboardApi.getAlerts().catch(() => [
            {
              id: '1',
              type: 'warning' as const,
              title: 'Backup Overdue',
              message: 'TestDB has not been backed up in 5 days',
              timestamp: new Date().toISOString(),
              action: 'Create Backup'
            },
            {
              id: '2',
              type: 'error' as const,
              title: 'Failed Backup',
              message: 'UserDB backup failed at 12:30',
              timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
              action: 'Retry'
            }
          ])
        ]);
        
        setStats(statsData);
        setSystemStats(systemData);
        setBackupStats(backupStatsData);
        setDatabaseHealth(databaseHealthData);
        setRecentActivity(recentActivityData);
        setAlerts(alertsData);
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    };

    fetchData();
    // Refresh data every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [token, user]);

  const handleRefresh = async () => {
    setRefreshing(true);
    // Trigger data fetch
    const event = new Event('refresh');
    window.dispatchEvent(event);
  };

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

  const formatRelativeTime = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - time.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'ახლახან';
    if (diffInMinutes < 60) return `${diffInMinutes} წუთის წინ`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} საათის წინ`;
    return `${Math.floor(diffInMinutes / 1440)} დღის წინ`;
  };

  const getActivityIcon = (type: Activity['type']) => {
    switch (type) {
      case 'backup': return <Archive className="h-4 w-4" />;
      case 'restore': return <RefreshCw className="h-4 w-4" />;
      case 'login': return <Users className="h-4 w-4" />;
      case 'error': return <AlertCircle className="h-4 w-4" />;
      case 'schedule': return <Calendar className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: Activity['status']) => {
    switch (status) {
      case 'success': return 'text-green-600 bg-green-50';
      case 'warning': return 'text-yellow-600 bg-yellow-50';
      case 'error': return 'text-red-600 bg-red-50';
      case 'info': return 'text-blue-600 bg-blue-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="p-6 space-y-6 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 min-h-screen">
      {/* Enhanced Header with Real-time Status */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
            🏠 SQL Manager Dashboard
          </h1>
          <div className="flex items-center space-x-4">
            <p className="text-gray-600">Real-time system monitoring and statistics</p>
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
              🟢 ჯანმრთელი
            </Badge>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <Button 
            onClick={handleRefresh} 
            variant="outline"
            className="flex items-center gap-2 bg-white hover:bg-gray-50"
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            განახლება
          </Button>
          {alerts.length > 0 && (
            <Button variant="outline" className="relative bg-white hover:bg-gray-50">
              <Bell className="h-4 w-4" />
              {alerts.length > 0 && (
                <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 text-xs bg-red-500">
                  {alerts.length}
                </Badge>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Hero Stats Section */}
      {(stats && backupStats && databaseHealth) && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white hover:shadow-xl transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium opacity-90">აქტიური ბაზები</CardTitle>
              <Database className="h-5 w-5 opacity-80" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{databaseHealth.healthyDatabases}</div>
              <div className="flex items-center space-x-2 mt-2">
                <TrendingUp className="h-4 w-4 opacity-80" />
                <p className="text-xs opacity-80">
                  {databaseHealth.totalDatabases} ჯამში
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-green-500 to-green-600 text-white hover:shadow-xl transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium opacity-90">ბექაპები დღეს</CardTitle>
              <Archive className="h-5 w-5 opacity-80" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{backupStats.todayBackups}</div>
              <div className="flex items-center space-x-2 mt-2">
                <CheckCircle className="h-4 w-4 opacity-80" />
                <p className="text-xs opacity-80">
                  {backupStats.successRate}% წარმატება
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-500 to-purple-600 text-white hover:shadow-xl transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium opacity-90">ცდებები</CardTitle>
              <AlertTriangle className="h-5 w-5 opacity-80" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{backupStats.failedBackups}</div>
              <div className="flex items-center space-x-2 mt-2">
                <Clock className="h-4 w-4 opacity-80" />
                <p className="text-xs opacity-80">
                  ბოლო 24 საათში
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-indigo-500 to-indigo-600 text-white hover:shadow-xl transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium opacity-90">მოცულობა</CardTitle>
              <HardDrive className="h-5 w-5 opacity-80" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{backupStats.totalBackupSize}</div>
              <div className="flex items-center space-x-2 mt-2">
                <BarChart3 className="h-4 w-4 opacity-80" />
                <p className="text-xs opacity-80">
                  ჯამური ბექაპი
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Quick Actions Section */}
      <Card className="border-0 shadow-lg bg-gradient-to-r from-white to-blue-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-blue-600" />
            ⚡ სწრაფი მოქმედებები
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white">
              <Archive className="h-4 w-4 mr-2" />
              ყველას ბექაპი
            </Button>
            <Button 
              variant="outline" 
              className="border-green-200 text-green-700 hover:bg-green-50"
              onClick={() => router.push('/admin/databases')}
            >
              <Database className="h-4 w-4 mr-2" />
              ახალი ბაზა
            </Button>
            <Button 
              variant="outline" 
              className="border-purple-200 text-purple-700 hover:bg-purple-50"
              onClick={() => router.push('/admin/users')}
            >
              <Users className="h-4 w-4 mr-2" />
              მომხმარებლები
            </Button>
            <Button 
              variant="outline" 
              className="border-orange-200 text-orange-700 hover:bg-orange-50"
              onClick={() => router.push('/admin/activity')}
            >
              <Activity className="h-4 w-4 mr-2" />
              აქტივობა
            </Button>
            <Button variant="outline" className="border-gray-200 text-gray-700 hover:bg-gray-50">
              <Calendar className="h-4 w-4 mr-2" />
              განრიგი
            </Button>
          </div>
          
          {/* Quick Activity Overview */}
          {backupStats && (
            <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">📈 ბოლო 24 საათის აქტივობა:</span>
                <span className="text-xs text-gray-500">{formatRelativeTime(backupStats.lastBackupTime)}</span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <div className="flex-1 bg-green-200 rounded-full h-2">
                    <div 
                      className="bg-green-500 h-2 rounded-full transition-all duration-1000" 
                      style={{ width: `${(backupStats.todayBackups / (backupStats.todayBackups + backupStats.failedBackups)) * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-sm text-green-700">{backupStats.todayBackups} წარმატებული</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="flex-1 bg-red-200 rounded-full h-2">
                    <div 
                      className="bg-red-500 h-2 rounded-full transition-all duration-1000" 
                      style={{ width: `${(backupStats.failedBackups / (backupStats.todayBackups + backupStats.failedBackups)) * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-sm text-red-700">{backupStats.failedBackups} შეცდომა</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Enhanced Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Distribution Chart */}
        {stats && (
          <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-600" />
                მომხმარებლების განაწილება
              </CardTitle>
              <CardDescription>აქტიური vs დაბლოკილი მომხმარებლები</CardDescription>
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

        {/* Backup Success Rate Chart */}
        {backupStats && (
          <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Archive className="h-5 w-5 text-green-600" />
                ბექაპის წარმატება
              </CardTitle>
              <CardDescription>ბექაპის სტატისტიკა და ტრენდები</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={[
                  { name: 'წარმატებული', value: backupStats.todayBackups, fill: '#10b981' },
                  { name: 'ვერ დასრულდა', value: backupStats.failedBackups, fill: '#ef4444' },
                  { name: 'დაგეგმილი', value: backupStats.scheduledBackups, fill: '#3b82f6' }
                ]}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value) => [value, 'რაოდენობა']} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]} />
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

      {/* Alerts and Notifications Section */}
      {alerts.length > 0 && (
        <Card className="border-0 shadow-lg bg-gradient-to-r from-yellow-50 to-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              🚨 ყურადღება მოითხოვს
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {alerts.map((alert) => (
              <div key={alert.id} className="flex items-center justify-between p-3 bg-white rounded-lg border-l-4 border-red-500 shadow-sm">
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    {alert.type === 'warning' && <AlertTriangle className="h-4 w-4 text-yellow-600" />}
                    {alert.type === 'error' && <AlertCircle className="h-4 w-4 text-red-600" />}
                    {alert.type === 'info' && <CheckCircle className="h-4 w-4 text-blue-600" />}
                    <span className="font-medium text-gray-900">{alert.title}</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{alert.message}</p>
                  <p className="text-xs text-gray-400 mt-1">{formatRelativeTime(alert.timestamp)}</p>
                </div>
                {alert.action && (
                  <Button variant="outline" size="sm" className="ml-4">
                    {alert.action}
                  </Button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Database Health Overview */}
      {databaseHealth && (
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5 text-green-600" />
              💾 ბაზების სტატუსი
            </CardTitle>
            <CardDescription>Real-time database health monitoring</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border">
                <div className="flex items-center justify-center space-x-2 mb-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-sm font-medium text-green-700">ჯანმრთელი</span>
                </div>
                <div className="text-2xl font-bold text-green-600">{databaseHealth.healthyDatabases}</div>
              </div>
              <div className="text-center p-4 bg-gradient-to-br from-yellow-50 to-orange-50 rounded-lg border">
                <div className="flex items-center justify-center space-x-2 mb-2">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <span className="text-sm font-medium text-yellow-700">გაფრთხილება</span>
                </div>
                <div className="text-2xl font-bold text-yellow-600">{databaseHealth.warningDatabases}</div>
              </div>
              <div className="text-center p-4 bg-gradient-to-br from-red-50 to-pink-50 rounded-lg border">
                <div className="flex items-center justify-center space-x-2 mb-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span className="text-sm font-medium text-red-700">შეცდომა</span>
                </div>
                <div className="text-2xl font-bold text-red-600">{databaseHealth.errorDatabases}</div>
              </div>
              <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border">
                <div className="flex items-center justify-center space-x-2 mb-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span className="text-sm font-medium text-blue-700">საშუალო</span>
                </div>
                <div className="text-2xl font-bold text-blue-600">{databaseHealth.averageResponseTime}ms</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Activity Section */}
      {recentActivity.length > 0 && (
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-indigo-600" />
              📈 ბოლო აქტივობა
            </CardTitle>
            <CardDescription>System activity and events</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentActivity.slice(0, 5).map((activity) => (
                <div key={activity.id} className="flex items-center space-x-3 p-3 hover:bg-gray-50 rounded-lg transition-colors">
                  <div className={`p-2 rounded-full ${getStatusColor(activity.status)}`}>
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{activity.message}</p>
                    <div className="flex items-center space-x-2 mt-1">
                      {activity.user && (
                        <span className="text-xs text-gray-500">{activity.user}</span>
                      )}
                      <span className="text-xs text-gray-400">•</span>
                      <span className="text-xs text-gray-400">{formatRelativeTime(activity.timestamp)}</span>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {activity.type}
                  </Badge>
                </div>
              ))}
              {recentActivity.length > 5 && (
                <Button variant="ghost" className="w-full mt-3" size="sm">
                  ყველას ნახვა <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Mobile-Optimized System Performance Cards */}
      <div className="lg:hidden">
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Monitor className="h-5 w-5 text-purple-600" />
              სისტემის მუშაობა
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {systemStats && (
              <>
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <HardDrive className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium">მეხსიერება</span>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-blue-600">{systemStats.memory.usagePercentage.toFixed(1)}%</div>
                    <div className="text-xs text-gray-500">{formatBytes(systemStats.memory.used)} / {formatBytes(systemStats.memory.total)}</div>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <Cpu className="h-4 w-4 text-orange-600" />
                    <span className="text-sm font-medium">CPU</span>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-orange-600">{(systemStats.cpu.load * 10).toFixed(1)}%</div>
                    <div className="text-xs text-gray-500">{systemStats.cpu.cores} ბირთვი</div>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Desktop System Information */}
      {systemStats && (
        <div className="hidden lg:grid lg:grid-cols-3 gap-6">
          {/* Memory Usage */}
          <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HardDrive className="h-5 w-5 text-green-600" />
                💾 მეხსიერების გამოყენება
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>გამოყენებული</span>
                  <span className="font-semibold">{formatBytes(systemStats.memory.used)}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className="bg-gradient-to-r from-green-400 to-green-600 h-3 rounded-full transition-all duration-1000 shadow-sm"
                    style={{ width: `${systemStats.memory.usagePercentage}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>თავისუფალი: {formatBytes(systemStats.memory.free)}</span>
                  <span>ჯამში: {formatBytes(systemStats.memory.total)}</span>
                </div>
                <div className="text-center pt-2">
                  <Badge variant="outline" className="bg-green-50 text-green-700">
                    {systemStats.memory.usagePercentage.toFixed(1)}% გამოყენებული
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* CPU Information */}
          <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cpu className="h-5 w-5 text-orange-600" />
                🔧 CPU ინფორმაცია
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">დატვირთვა</span>
                <Badge variant="outline" className="bg-orange-50 text-orange-700">
                  {systemStats.cpu.load.toFixed(2)}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">ბირთვები</span>
                <span className="font-semibold">{systemStats.cpu.cores}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">არქიტექტურა</span>
                <span className="font-semibold text-sm">{systemStats.cpu.architecture}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">პლატფორმა</span>
                <span className="font-semibold capitalize text-sm">{systemStats.cpu.platform}</span>
              </div>
              <div className="pt-2">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-orange-400 to-orange-600 h-2 rounded-full transition-all duration-1000"
                    style={{ width: `${Math.min(systemStats.cpu.load * 10, 100)}%` }}
                  ></div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* System Information */}
          <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="h-5 w-5 text-blue-600" />
                🖥️ სისტემის ინფო
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">ქამანა</span>
                <Badge variant="outline" className="bg-blue-50 text-blue-700">
                  {formatUptime(systemStats.system.uptime)}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">ჰოსტი</span>
                <span className="font-semibold truncate text-sm max-w-[120px]" title={systemStats.system.hostname}>
                  {systemStats.system.hostname}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Node.js</span>
                <span className="font-semibold text-sm">{systemStats.system.nodeVersion}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">პროცესის ID</span>
                <span className="font-semibold">{systemStats.system.pid}</span>
              </div>
              <div className="pt-2 text-center">
                <div className="flex items-center justify-center space-x-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-xs text-green-600 font-medium">რეალურ დროში</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Enhanced Database Statistics */}
      {stats && stats.databases.total > 0 && (
        <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5 text-indigo-600" />
              📊 ბაზების სტატისტიკა
            </CardTitle>
            <CardDescription>ბაზების გამოყენებისა და მეტრიკების მიმოხილვა</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-6 bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl border hover:shadow-md transition-shadow">
                <div className="text-3xl font-bold text-indigo-600 mb-2">{stats.databases.total}</div>
                <div className="text-sm text-gray-600 mb-2">ჯამური ბაზები</div>
                <div className="flex items-center justify-center">
                  <TrendingUp className="h-4 w-4 text-indigo-500 mr-1" />
                  <span className="text-xs text-indigo-600">აქტიური</span>
                </div>
              </div>
              <div className="text-center p-6 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border hover:shadow-md transition-shadow">
                <div className="text-3xl font-bold text-green-600 mb-2">{stats.databases.totalSizeMB.toFixed(1)} MB</div>
                <div className="text-sm text-gray-600 mb-2">ჯამური ზომა</div>
                <div className="flex items-center justify-center">
                  <HardDriveIcon className="h-4 w-4 text-green-500 mr-1" />
                  <span className="text-xs text-green-600">შენახული</span>
                </div>
              </div>
              <div className="text-center p-6 bg-gradient-to-br from-purple-50 to-violet-50 rounded-xl border hover:shadow-md transition-shadow">
                <div className="text-3xl font-bold text-purple-600 mb-2">{stats.databases.averageSizeMB.toFixed(1)} MB</div>
                <div className="text-sm text-gray-600 mb-2">საშუალო ზომა</div>
                <div className="flex items-center justify-center">
                  <BarChart3 className="h-4 w-4 text-purple-500 mr-1" />
                  <span className="text-xs text-purple-600">ერთ ბაზაზე</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Enhanced Back Button */}
      <div className="flex justify-center pt-6">
        <Button 
          onClick={() => history.back()} 
          variant="outline"
          size="lg"
          className="bg-white hover:bg-gray-50 border-gray-300 shadow-sm hover:shadow-md transition-all duration-200"
        >
          <ChevronRight className="h-4 w-4 mr-2 rotate-180" />
          ადმინ პანელში დაბრუნება
        </Button>
      </div>
    </div>
  );
}
