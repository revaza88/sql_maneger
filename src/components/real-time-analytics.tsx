"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import {
  Activity,
  Database,
  Users,
  Server,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Cpu,
  MemoryStick,
  HardDrive,
  Network,
  Clock,
  Zap,
  RefreshCw
} from "lucide-react";

interface AnalyticsData {
  timestamp: string;
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  networkIO: number;
  activeConnections: number;
  queriesPerSecond: number;
  errorRate: number;
}

interface SystemMetrics {
  cpu: {
    current: number;
    average: number;
    trend: 'up' | 'down' | 'stable';
  };
  memory: {
    current: number;
    average: number;
    trend: 'up' | 'down' | 'stable';
  };
  disk: {
    current: number;
    average: number;
    trend: 'up' | 'down' | 'stable';
  };
  network: {
    current: number;
    average: number;
    trend: 'up' | 'down' | 'stable';
  };
  connections: {
    current: number;
    peak: number;
    average: number;
  };
  performance: {
    queriesPerSecond: number;
    avgResponseTime: number;
    slowQueries: number;
    errorRate: number;
  };
}

interface RealTimeAnalyticsProps {
  title?: string;
  refreshInterval?: number;
  showDetailed?: boolean;
  className?: string;
}

export const RealTimeAnalytics = ({ 
  title = "რეალურ დროში ანალიტიკა",
  refreshInterval = 5000,
  showDetailed = true,
  className = ""
}: RealTimeAnalyticsProps) => {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData[]>([]);
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRealTime, setIsRealTime] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  useEffect(() => {
    fetchAnalyticsData();
    
    let interval: NodeJS.Timeout;
    if (isRealTime) {
      interval = setInterval(() => {
        fetchAnalyticsData();
      }, refreshInterval);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRealTime, refreshInterval]);

  const fetchAnalyticsData = async () => {
    try {
      // Generate mock real-time data
      const now = new Date();
      const newDataPoint: AnalyticsData = {
        timestamp: now.toISOString(),
        cpuUsage: Math.floor(Math.random() * 80 + 10),
        memoryUsage: Math.floor(Math.random() * 70 + 20),
        diskUsage: Math.floor(Math.random() * 60 + 30),
        networkIO: Math.floor(Math.random() * 100 + 50),
        activeConnections: Math.floor(Math.random() * 50 + 10),
        queriesPerSecond: Math.floor(Math.random() * 500 + 100),
        errorRate: Math.random() * 5
      };

      setAnalyticsData(prev => {
        const newData = [...prev, newDataPoint];
        // Keep only last 20 data points
        return newData.slice(-20);
      });

      // Update system metrics
      const currentMetrics: SystemMetrics = {
        cpu: {
          current: newDataPoint.cpuUsage,
          average: 45,
          trend: newDataPoint.cpuUsage > 50 ? 'up' : newDataPoint.cpuUsage < 30 ? 'down' : 'stable'
        },
        memory: {
          current: newDataPoint.memoryUsage,
          average: 55,
          trend: newDataPoint.memoryUsage > 60 ? 'up' : newDataPoint.memoryUsage < 40 ? 'down' : 'stable'
        },
        disk: {
          current: newDataPoint.diskUsage,
          average: 65,
          trend: newDataPoint.diskUsage > 70 ? 'up' : newDataPoint.diskUsage < 50 ? 'down' : 'stable'
        },
        network: {
          current: newDataPoint.networkIO,
          average: 125,
          trend: newDataPoint.networkIO > 150 ? 'up' : newDataPoint.networkIO < 100 ? 'down' : 'stable'
        },
        connections: {
          current: newDataPoint.activeConnections,
          peak: 75,
          average: 35
        },
        performance: {
          queriesPerSecond: newDataPoint.queriesPerSecond,
          avgResponseTime: Math.floor(Math.random() * 200 + 50),
          slowQueries: Math.floor(Math.random() * 10),
          errorRate: newDataPoint.errorRate
        }
      };

      setMetrics(currentMetrics);
      setLastUpdate(now);
      setIsLoading(false);
    } catch (error) {
      console.error("Analytics data fetch error:", error);
      setIsLoading(false);
    }
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-red-600" />;
      case 'down':
        return <TrendingDown className="w-4 h-4 text-green-600" />;
      default:
        return <Activity className="w-4 h-4 text-blue-600" />;
    }
  };

  const getUsageColor = (usage: number) => {
    if (usage >= 80) return 'text-red-600';
    if (usage >= 60) return 'text-yellow-600';
    return 'text-green-600';
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('ka-GE', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  if (isLoading && !metrics) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Activity className="w-5 h-5 mr-2" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center">
                <Activity className="w-5 h-5 mr-2" />
                {title}
              </CardTitle>
              <CardDescription>
                ბოლო განახლება: {lastUpdate.toLocaleTimeString('ka-GE')}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={isRealTime ? "default" : "outline"}
                size="sm"
                onClick={() => setIsRealTime(!isRealTime)}
              >
                <Zap className="w-4 h-4 mr-2" />
                {isRealTime ? 'ჩართული' : 'გამორთული'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchAnalyticsData}
                disabled={isLoading}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                განახლება
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Key Metrics */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">CPU გამოყენება</CardTitle>
              <Cpu className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                <span className={getUsageColor(metrics.cpu.current)}>
                  {metrics.cpu.current}%
                </span>
              </div>
              <div className="flex items-center justify-between mt-2">
                <Progress value={metrics.cpu.current} className="flex-1 mr-2" />
                {getTrendIcon(metrics.cpu.trend)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                საშუალო: {metrics.cpu.average}%
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">მეხსიერება</CardTitle>
              <MemoryStick className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                <span className={getUsageColor(metrics.memory.current)}>
                  {metrics.memory.current}%
                </span>
              </div>
              <div className="flex items-center justify-between mt-2">
                <Progress value={metrics.memory.current} className="flex-1 mr-2" />
                {getTrendIcon(metrics.memory.trend)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                საშუალო: {metrics.memory.average}%
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">აქტიური კონექციები</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.connections.current}</div>
              <div className="flex justify-between text-xs text-muted-foreground mt-2">
                <span>პიკი: {metrics.connections.peak}</span>
                <span>საშუალო: {metrics.connections.average}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Query-ები/წამში</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.performance.queriesPerSecond}</div>
              <div className="flex justify-between text-xs text-muted-foreground mt-2">
                <span>ნელი: {metrics.performance.slowQueries}</span>
                <span>შეცდომები: {metrics.performance.errorRate.toFixed(1)}%</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Detailed Charts */}
      {showDetailed && analyticsData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* System Resources Chart */}
          <Card>
            <CardHeader>
              <CardTitle>სისტემური რესურსები</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={analyticsData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="timestamp" 
                    tickFormatter={formatTime}
                    interval="preserveStartEnd"
                  />
                  <YAxis domain={[0, 100]} />
                  <Tooltip 
                    labelFormatter={(value) => formatTime(value)}
                    formatter={(value, name) => [
                      `${value}%`,
                      name === 'cpuUsage' ? 'CPU' : 
                      name === 'memoryUsage' ? 'მეხსიერება' : 'დისკი'
                    ]}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="cpuUsage" 
                    stroke="#ef4444" 
                    strokeWidth={2}
                    name="cpuUsage"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="memoryUsage" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    name="memoryUsage"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="diskUsage" 
                    stroke="#10b981" 
                    strokeWidth={2}
                    name="diskUsage"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Performance Chart */}
          <Card>
            <CardHeader>
              <CardTitle>შესრულება და კონექციები</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={analyticsData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="timestamp" 
                    tickFormatter={formatTime}
                    interval="preserveStartEnd"
                  />
                  <YAxis />
                  <Tooltip 
                    labelFormatter={(value) => formatTime(value)}
                    formatter={(value, name) => [
                      value,
                      name === 'activeConnections' ? 'კონექციები' : 'Query-ები/წმ'
                    ]}
                  />
                  <Area
                    type="monotone"
                    dataKey="activeConnections"
                    stackId="1"
                    stroke="#8b5cf6"
                    fill="#8b5cf6"
                    fillOpacity={0.6}
                    name="activeConnections"
                  />
                  <Area
                    type="monotone"
                    dataKey="queriesPerSecond"
                    stackId="2"
                    stroke="#f59e0b"
                    fill="#f59e0b"
                    fillOpacity={0.6}
                    name="queriesPerSecond"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Performance Summary */}
      {metrics && (
        <Card>
          <CardHeader>
            <CardTitle>შესრულების მიმოხილვა</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <h4 className="font-medium flex items-center">
                  <Clock className="w-4 h-4 mr-2" />
                  პასუხის დრო
                </h4>
                <div className="text-2xl font-bold">{metrics.performance.avgResponseTime}ms</div>
                <div className="text-sm text-muted-foreground">საშუალო პასუხის დრო</div>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium flex items-center">
                  <Database className="w-4 h-4 mr-2" />
                  ნელი Query-ები
                </h4>
                <div className="text-2xl font-bold text-yellow-600">
                  {metrics.performance.slowQueries}
                </div>
                <div className="text-sm text-muted-foreground">ბოლო წუთში</div>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium flex items-center">
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  შეცდომების მაჩვენებელი
                </h4>
                <div className="text-2xl font-bold">
                  <span className={getUsageColor(metrics.performance.errorRate * 20)}>
                    {metrics.performance.errorRate.toFixed(2)}%
                  </span>
                </div>
                <div className="text-sm text-muted-foreground">შეცდომების სიხშირე</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Alerts */}
      {metrics && (
        <div className="space-y-2">
          {metrics.cpu.current > 80 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center">
              <AlertTriangle className="w-5 h-5 text-red-600 mr-2" />
              <span className="text-red-800">მაღალი CPU გამოყენება: {metrics.cpu.current}%</span>
            </div>
          )}
          
          {metrics.memory.current > 85 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-center">
              <AlertTriangle className="w-5 h-5 text-yellow-600 mr-2" />
              <span className="text-yellow-800">მაღალი მეხსიერების გამოყენება: {metrics.memory.current}%</span>
            </div>
          )}
          
          {metrics.performance.errorRate > 2 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center">
              <AlertTriangle className="w-5 h-5 text-red-600 mr-2" />
              <span className="text-red-800">მაღალი შეცდომების მაჩვენებელი: {metrics.performance.errorRate.toFixed(1)}%</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
