'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { AdminLayout } from '@/components/admin-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Database, 
  Activity, 
  Users, 
  Cpu, 
  MemoryStick, 
  RefreshCw, 
  Settings, 
  AlertTriangle,
  HardDrive,
  Clock
} from 'lucide-react';

interface DatabaseDetails {
  name: string;
  status: 'online' | 'offline' | 'maintenance';
  userEmail: string;
  size_mb: number;
  connectionCount: number;
  health: {
    status: 'healthy' | 'warning' | 'critical';
    score: number;
    issues: string[];
  };
  performance: {
    cpuUsage: number;
    memoryUsage: number;
  };
  lastBackup: string;
  createdAt: string;
}

const DatabaseDetailPage = () => {
  const params = useParams();
  const databaseName = params.name as string;
  const [database, setDatabase] = useState<DatabaseDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    fetchDatabaseDetails();
  }, [databaseName]);

  const fetchDatabaseDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/databases/${databaseName}`);
      if (response.ok) {
        const data = await response.json();
        setDatabase(data);
      } else {
        // Mock data for demonstration
        setDatabase({
          name: decodeURIComponent(databaseName),
          status: 'online',
          userEmail: 'user@example.com',
          size_mb: 256,
          connectionCount: 5,
          health: {
            status: 'healthy',
            score: 85,
            issues: []
          },
          performance: {
            cpuUsage: 45,
            memoryUsage: 62
          },
          lastBackup: '2024-01-15T10:30:00Z',
          createdAt: '2024-01-01T00:00:00Z'
        });
      }
    } catch (error) {
      console.error('Error fetching database details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchDatabaseDetails();
    setIsRefreshing(false);
  };

  const handleQuickBackup = async () => {
    try {
      const response = await fetch(`/api/admin/databases/${databaseName}/backup`, {
        method: 'POST'
      });
      if (response.ok) {
        alert('Backup started successfully');
      }
    } catch (error) {
      console.error('Error starting backup:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      online: 'default',
      offline: 'destructive',
      maintenance: 'secondary'
    } as const;
    
    return (
      <Badge variant={variants[status as keyof typeof variants] || 'default'}>
        {status}
      </Badge>
    );
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };
  if (loading) {
    return (
      <AdminLayout
        title="Database Details"
        description="Loading database information"
        icon={<Database className="h-6 w-6 text-blue-600" />}
      >
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  if (!database) {
    return (
      <AdminLayout
        title="Database Details"
        description="Database not found"
        icon={<Database className="h-6 w-6 text-blue-600" />}
      >
        <div className="text-center py-8">
          <p className="text-gray-500">Database not found</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      title={`Database: ${database.name}`}
      description="Database analytics and management"
      icon={<Database className="h-6 w-6 text-blue-600" />}
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Database className="w-8 h-8" />
              {database.name}
            </h1>
            <div className="flex items-center gap-4 mt-2">
              {getStatusBadge(database.status)}
              <span className="text-sm text-gray-500">
                Owner: {database.userEmail}
              </span>
              <span className="text-sm text-gray-500">
                Size: {formatBytes(database.size_mb * 1024 * 1024)}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button 
              variant="outline"
              onClick={handleQuickBackup}
            >
              Quick Backup
            </Button>
            <Button variant="outline">
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </Button>
          </div>
        </div>

        {/* Health Warning */}
        {database.health.status !== 'healthy' && (
          <Card className="border-yellow-200 bg-yellow-50">
            <CardContent className="pt-6">
              <div className="flex items-center">
                <AlertTriangle className="w-5 h-5 text-yellow-600 mr-2" />
                <span className="font-medium">Database Health Issues Detected</span>
              </div>
              {database.health.issues.length > 0 && (
                <ul className="mt-2 text-sm text-yellow-700">
                  {database.health.issues.map((issue, index) => (
                    <li key={index}>• {issue}</li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        )}

        {/* Metrics Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Health Score</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{database.health.score}/100</div>
              <Progress value={database.health.score} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Connections</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{database.connectionCount}</div>
              <p className="text-xs text-muted-foreground">Current active sessions</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">CPU Usage</CardTitle>
              <Cpu className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{database.performance.cpuUsage}%</div>
              <Progress value={database.performance.cpuUsage} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Memory Usage</CardTitle>
              <MemoryStick className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{database.performance.memoryUsage}%</div>
              <Progress value={database.performance.memoryUsage} className="mt-2" />
            </CardContent>
          </Card>
        </div>

        {/* Database Information */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HardDrive className="w-5 h-5" />
                Database Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Database Name</label>
                <p className="text-sm">{database.name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Owner</label>
                <p className="text-sm">{database.userEmail}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Size</label>
                <p className="text-sm">{formatBytes(database.size_mb * 1024 * 1024)}</p>
              </div>              <div>
                <label className="text-sm font-medium text-gray-500">Status</label>
                <div className="text-sm">{getStatusBadge(database.status)}</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Backup Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Last Backup</label>
                <p className="text-sm">{formatDate(database.lastBackup)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Created</label>
                <p className="text-sm">{formatDate(database.createdAt)}</p>
              </div>
              <div className="pt-2">
                <Button onClick={handleQuickBackup} className="w-full">
                  Create Backup Now
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
};

export default DatabaseDetailPage;
