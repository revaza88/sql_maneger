"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import {
  Database,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Activity,
  Clock,
  Users,
  HardDrive,
  Cpu,
  MemoryStick,
  Zap,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Shield,
  Settings,
  Eye
} from "lucide-react";

interface DatabaseHealth {
  databaseName: string;
  overallScore: number;
  status: 'healthy' | 'warning' | 'critical' | 'offline';
  metrics: {
    performance: {
      score: number;
      avgResponseTime: number;
      slowQueries: number;
      blockedProcesses: number;
      waitStats: { type: string; waitTime: number }[];
    };
    availability: {
      score: number;
      uptime: number;
      lastDowntime: string | null;
      connectionSuccess: number;
    };
    integrity: {
      score: number;
      corruptPages: number;
      inconsistentIndexes: number;
      lastCheckTime: string;
    };
    maintenance: {
      score: number;
      lastBackup: string;
      lastIndexOptimize: string;
      lastStatisticsUpdate: string;
      fragmentationLevel: number;
    };
    security: {
      score: number;
      vulnerabilities: number;
      lastSecurityCheck: string;
      unauthorizedAccess: number;
    };
  };
  recommendations: {
    priority: 'high' | 'medium' | 'low';
    category: string;
    description: string;
    action: string;
  }[];
  alerts: {
    level: 'error' | 'warning' | 'info';
    message: string;
    timestamp: string;
  }[];
}

interface HealthMonitorProps {
  databaseName?: string;
  refreshInterval?: number;
  showRecommendations?: boolean;
  className?: string;
}

export const DatabaseHealthMonitor = ({
  databaseName,
  refreshInterval = 30000,
  showRecommendations = true,
  className = ""
}: HealthMonitorProps) => {
  const [healthData, setHealthData] = useState<DatabaseHealth[]>([]);
  const [selectedDatabase, setSelectedDatabase] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  useEffect(() => {
    fetchHealthData();
    
    let interval: NodeJS.Timeout;
    if (isMonitoring) {
      interval = setInterval(() => {
        fetchHealthData();
      }, refreshInterval);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isMonitoring, refreshInterval, databaseName]);

  const fetchHealthData = async () => {
    try {
      // Generate mock health data
      const mockDatabases = databaseName ? [databaseName] : ['UserDB_1', 'UserDB_2', 'SystemDB', 'TestDB'];
      
      const healthDataArray: DatabaseHealth[] = mockDatabases.map(dbName => {
        const performanceScore = Math.floor(Math.random() * 40 + 60);
        const availabilityScore = Math.floor(Math.random() * 20 + 80);
        const integrityScore = Math.floor(Math.random() * 30 + 70);
        const maintenanceScore = Math.floor(Math.random() * 50 + 50);
        const securityScore = Math.floor(Math.random() * 30 + 70);
        
        const overallScore = Math.floor((performanceScore + availabilityScore + integrityScore + maintenanceScore + securityScore) / 5);
        
        const getStatus = (score: number) => {
          if (score >= 90) return 'healthy';
          if (score >= 70) return 'warning';
          if (score >= 50) return 'critical';
          return 'offline';
        };

        return {
          databaseName: dbName,
          overallScore,
          status: getStatus(overallScore),
          metrics: {
            performance: {
              score: performanceScore,
              avgResponseTime: Math.floor(Math.random() * 200 + 50),
              slowQueries: Math.floor(Math.random() * 20),
              blockedProcesses: Math.floor(Math.random() * 5),
              waitStats: [
                { type: 'PAGEIOLATCH_SH', waitTime: Math.floor(Math.random() * 1000) },
                { type: 'LCK_M_S', waitTime: Math.floor(Math.random() * 500) },
                { type: 'ASYNC_NETWORK_IO', waitTime: Math.floor(Math.random() * 300) }
              ]
            },
            availability: {
              score: availabilityScore,
              uptime: 99.8 + Math.random() * 0.2,
              lastDowntime: Math.random() > 0.8 ? new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString() : null,
              connectionSuccess: 95 + Math.random() * 5
            },
            integrity: {
              score: integrityScore,
              corruptPages: Math.floor(Math.random() * 3),
              inconsistentIndexes: Math.floor(Math.random() * 5),
              lastCheckTime: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString()
            },
            maintenance: {
              score: maintenanceScore,
              lastBackup: new Date(Date.now() - Math.random() * 3 * 24 * 60 * 60 * 1000).toISOString(),
              lastIndexOptimize: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
              lastStatisticsUpdate: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString(),
              fragmentationLevel: Math.floor(Math.random() * 30 + 5)
            },
            security: {
              score: securityScore,
              vulnerabilities: Math.floor(Math.random() * 3),
              lastSecurityCheck: new Date(Date.now() - Math.random() * 2 * 24 * 60 * 60 * 1000).toISOString(),
              unauthorizedAccess: Math.floor(Math.random() * 2)
            }
          },          recommendations: [
            {
              priority: (performanceScore < 70 ? 'high' : 'medium') as 'high' | 'medium' | 'low',
              category: 'შესრულება',
              description: 'ინდექსების ოპტიმიზაცია საჭიროა',
              action: 'ხელახლა შექმენით ფრაგმენტირებული ინდექსები'
            },
            {
              priority: (maintenanceScore < 60 ? 'high' : 'low') as 'high' | 'medium' | 'low',
              category: 'მხარდაჭერა',
              description: 'სარეზერვო ასლი აღარ არის ახალი',
              action: 'შექმენით სარეზერვო ასლი'
            }
          ].filter(rec => Math.random() > 0.3),
          alerts: [
            {
              level: overallScore < 60 ? 'error' : overallScore < 80 ? 'warning' : 'info',
              message: overallScore < 60 ? 'კრიტიკული მდგომარეობა' : overallScore < 80 ? 'გაფრთხილება საჭიროა' : 'ნორმალური მუშაობა',
              timestamp: new Date().toISOString()
            }
          ]
        };
      });

      setHealthData(healthDataArray);
      setLastUpdate(new Date());
      setIsLoading(false);
    } catch (error) {
      console.error("Health data fetch error:", error);
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600 bg-green-100';
      case 'warning': return 'text-yellow-600 bg-yellow-100';
      case 'critical': return 'text-red-600 bg-red-100';
      case 'offline': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="w-4 h-4" />;
      case 'warning': return <AlertTriangle className="w-4 h-4" />;
      case 'critical': return <XCircle className="w-4 h-4" />;
      case 'offline': return <XCircle className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ka-GE');
  };

  const selectedDb = selectedDatabase ? healthData.find(db => db.databaseName === selectedDatabase) : null;

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Shield className="w-5 h-5 mr-2" />
            ბაზების ჯანმრთელობის მონიტორინგი
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
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center">
                <Shield className="w-5 h-5 mr-2" />
                ბაზების ჯანმრთელობის მონიტორინგი
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                ბოლო განახლება: {lastUpdate.toLocaleTimeString('ka-GE')}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={isMonitoring ? "default" : "outline"}
                size="sm"
                onClick={() => setIsMonitoring(!isMonitoring)}
              >
                <Activity className="w-4 h-4 mr-2" />
                {isMonitoring ? 'მონიტორინგი ჩართულია' : 'მონიტორინგი გამორთული'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchHealthData}
                disabled={isLoading}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                განახლება
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Health Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {healthData.map((db) => (
          <Card 
            key={db.databaseName}
            className={`cursor-pointer transition-all hover:shadow-lg ${
              selectedDatabase === db.databaseName ? 'ring-2 ring-blue-500' : ''
            }`}
            onClick={() => setSelectedDatabase(db.databaseName)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Database className="w-4 h-4 text-blue-600" />
                  <CardTitle className="text-lg">{db.databaseName}</CardTitle>
                </div>
                <Badge className={getStatusColor(db.status)}>
                  {getStatusIcon(db.status)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="text-center">
                  <div className={`text-3xl font-bold ${getScoreColor(db.overallScore)}`}>
                    {db.overallScore}
                  </div>
                  <p className="text-sm text-muted-foreground">ჯანმრთელობის ქულა</p>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span>შესრულება</span>
                    <span className={getScoreColor(db.metrics.performance.score)}>
                      {db.metrics.performance.score}
                    </span>
                  </div>
                  <Progress value={db.metrics.performance.score} className="h-1" />
                  
                  <div className="flex justify-between text-xs">
                    <span>ხელმისაწვდომობა</span>
                    <span className={getScoreColor(db.metrics.availability.score)}>
                      {db.metrics.availability.score}
                    </span>
                  </div>
                  <Progress value={db.metrics.availability.score} className="h-1" />
                  
                  <div className="flex justify-between text-xs">
                    <span>უსაფრთხოება</span>
                    <span className={getScoreColor(db.metrics.security.score)}>
                      {db.metrics.security.score}
                    </span>
                  </div>
                  <Progress value={db.metrics.security.score} className="h-1" />
                </div>

                {db.alerts.length > 0 && (
                  <div className="pt-2 border-t">
                    <div className="flex items-center text-xs">
                      <AlertTriangle className="w-3 h-3 mr-1 text-yellow-600" />
                      <span>{db.alerts.length} გაფრთხილება</span>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Detailed View */}
      {selectedDb && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Performance Metrics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Cpu className="w-4 h-4 mr-2" />
                შესრულების მეტრიკები - {selectedDb.databaseName}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">საშუალო პასუხის დრო</p>
                    <p className="text-lg font-semibold">{selectedDb.metrics.performance.avgResponseTime}ms</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">ნელი Query-ები</p>
                    <p className="text-lg font-semibold text-yellow-600">
                      {selectedDb.metrics.performance.slowQueries}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">დაბლოკილი პროცესები</p>
                    <p className="text-lg font-semibold text-red-600">
                      {selectedDb.metrics.performance.blockedProcesses}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">შესრულების ქულა</p>
                    <p className={`text-lg font-semibold ${getScoreColor(selectedDb.metrics.performance.score)}`}>
                      {selectedDb.metrics.performance.score}/100
                    </p>
                  </div>
                </div>
                
                {/* Wait Statistics */}
                <div>
                  <h4 className="font-medium mb-2">ლოდინის სტატისტიკა</h4>
                  <div className="space-y-2">
                    {selectedDb.metrics.performance.waitStats.map((wait, index) => (
                      <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                        <span className="text-sm font-mono">{wait.type}</span>
                        <span className="text-sm font-semibold">{wait.waitTime}ms</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Maintenance Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Settings className="w-4 h-4 mr-2" />
                მხარდაჭერის სტატუსი
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">ბოლო სარეზერვო ასლი</p>
                  <p className="text-sm font-semibold">{formatDate(selectedDb.metrics.maintenance.lastBackup)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">ინდექსების ოპტიმიზაცია</p>
                  <p className="text-sm font-semibold">{formatDate(selectedDb.metrics.maintenance.lastIndexOptimize)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">სტატისტიკის განახლება</p>
                  <p className="text-sm font-semibold">{formatDate(selectedDb.metrics.maintenance.lastStatisticsUpdate)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">ფრაგმენტაციის დონე</p>
                  <div className="flex items-center space-x-2">
                    <Progress value={selectedDb.metrics.maintenance.fragmentationLevel} className="flex-1" />
                    <span className="text-sm font-semibold">
                      {selectedDb.metrics.maintenance.fragmentationLevel}%
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recommendations */}
      {showRecommendations && selectedDb && selectedDb.recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>რეკომენდაციები - {selectedDb.databaseName}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {selectedDb.recommendations.map((rec, index) => (
                <div 
                  key={index} 
                  className={`p-3 rounded-lg border ${
                    rec.priority === 'high' ? 'border-red-200 bg-red-50' :
                    rec.priority === 'medium' ? 'border-yellow-200 bg-yellow-50' :
                    'border-blue-200 bg-blue-50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <Badge 
                          variant="outline"
                          className={
                            rec.priority === 'high' ? 'text-red-600 border-red-600' :
                            rec.priority === 'medium' ? 'text-yellow-600 border-yellow-600' :
                            'text-blue-600 border-blue-600'
                          }
                        >
                          {rec.priority === 'high' ? 'მაღალი' : rec.priority === 'medium' ? 'საშუალო' : 'დაბალი'}
                        </Badge>
                        <Badge variant="secondary">{rec.category}</Badge>
                      </div>
                      <h4 className="font-medium text-sm">{rec.description}</h4>
                      <p className="text-xs text-muted-foreground mt-1">{rec.action}</p>
                    </div>
                    <Button size="sm" variant="outline">
                      <Eye className="w-3 h-3 mr-1" />
                      დეტალები
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
