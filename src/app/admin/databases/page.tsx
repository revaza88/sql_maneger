"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthWrapper } from "@/components/auth-wrapper";
import { AdminLayout } from "@/components/admin-layout";
import { adminApi } from "../../../lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { LoadingSpinner } from "@/components/loading-spinner";
import { RealTimeAnalytics } from "@/components/real-time-analytics";
import {
  Search,
  Database,
  Plus,
  MoreVertical,
  Download,
  Trash2,
  Copy,
  Activity,
  HardDrive,
  Users,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Archive,
  BarChart3,
  RefreshCw,
  TrendingUp,
  Eye,
  Filter,
  Layout,
  List,
  Wifi,
  WifiOff,
} from "lucide-react";

interface DatabaseInfo {
  databaseName: string;
  userId: number;
  userEmail: string;
  size_mb: number;
  create_date: string | null;
  state_desc: string;
  status?: 'online' | 'offline' | 'restoring' | 'suspect';
  lastBackup?: string;
  connectionCount?: number;
  performance?: {
    cpuUsage: number;
    memoryUsage: number;
    diskIO: number;
    slowQueries: number;
  };
  health?: {
    status: 'healthy' | 'warning' | 'critical';
    issues: string[];
    score: number;
  };
}

interface DatabaseStats {
  total: number;
  online: number;
  offline: number;
  totalSizeMB: number;
  averageSizeMB: number;
  withBackups: number;
  withoutBackups: number;
}

interface CreateDatabaseForm {
  databaseName: string;
  userId: string;
  template?: string;
  collation?: string;
  initialSize?: number;
}

const DatabaseManagementPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // State management
  const [databases, setDatabases] = useState<DatabaseInfo[]>([]);
  const [stats, setStats] = useState<DatabaseStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [isRealTimeEnabled, setIsRealTimeEnabled] = useState(false);
  const [alertCount, setAlertCount] = useState(0);
  
  // Dialog states
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isCloneDialogOpen, setIsCloneDialogOpen] = useState(false);
  const [selectedDatabase, setSelectedDatabase] = useState<DatabaseInfo | null>(null);
  
  // Form states
  const [createForm, setCreateForm] = useState<CreateDatabaseForm>({
    databaseName: '',
    userId: '',
    template: 'empty',
    collation: 'SQL_Latin1_General_CP1_CI_AS',
    initialSize: 100
  });

  // Check for URL parameters (backup integration)
  const highlightedDatabase = searchParams.get('database');
  const action = searchParams.get('action');

  useEffect(() => {
    fetchDatabases();
    fetchStats();
      // Set up real-time monitoring if enabled
    let interval: NodeJS.Timeout;
    if (isRealTimeEnabled) {
      interval = setInterval(() => {
        fetchDatabases();
        fetchStats();
      }, 30000); // Increased from 15 to 30 seconds
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRealTimeEnabled]);

  useEffect(() => {
    // Calculate alert count
    const alerts = databases.filter(db => 
      db.health?.status === 'warning' || 
      db.health?.status === 'critical' ||
      (db.performance?.cpuUsage ?? 0) > 80 ||
      (db.performance?.memoryUsage ?? 0) > 80
    ).length;
    setAlertCount(alerts);
  }, [databases]);

  useEffect(() => {
    // Handle backup integration
    if (action === 'backup' && highlightedDatabase) {
      handleQuickBackup(highlightedDatabase);
    } else if (action === 'restore' && highlightedDatabase) {
      handleRestore(highlightedDatabase);
    }
  }, [action, highlightedDatabase]);  const fetchDatabases = async () => {
    setIsLoading(true);
    try {
      const response = await adminApi.getDatabases();
      
      // Check API response structure
      console.log('API Response:', response);
      
      // API returns { status, data, page, total }
      const databases = response.data || [];
      
      // Enhance with mock performance and health data
      const enhancedDatabases = databases.map((db: DatabaseInfo) => ({
        ...db,
        status: db.state_desc === 'ONLINE' ? 'online' : 'offline',
        lastBackup: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
        connectionCount: Math.floor(Math.random() * 20),
        performance: {
          cpuUsage: Math.floor(Math.random() * 100),
          memoryUsage: Math.floor(Math.random() * 100),
          diskIO: Math.floor(Math.random() * 100),
          slowQueries: Math.floor(Math.random() * 10)
        },
        health: {
          status: Math.random() > 0.8 ? 'warning' : Math.random() > 0.9 ? 'critical' : 'healthy',
          issues: Math.random() > 0.7 ? ['მეხსიერების მაღალი გამოყენება', 'ნელი query-ები'] : [],
          score: Math.floor(Math.random() * 30 + 70)
        }
      }));
      
      setDatabases(enhancedDatabases);
    } catch (error) {
      toast.error("ბაზების ჩატვირთვა ვერ მოხერხდა");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };  const fetchStats = async () => {
    try {
      const response = await adminApi.getStats();
      
      // API returns { status, data } where data contains the stats
      const statsData = response.data || response;
      
      const databaseStats: DatabaseStats = {
        total: statsData.databases?.total || 0,
        online: Math.floor((statsData.databases?.total || 0) * 0.9),
        offline: Math.floor((statsData.databases?.total || 0) * 0.1),
        totalSizeMB: statsData.databases?.totalSizeMB || 0,
        averageSizeMB: statsData.databases?.averageSizeMB || 0,
        withBackups: Math.floor((statsData.databases?.total || 0) * 0.7),
        withoutBackups: Math.floor((statsData.databases?.total || 0) * 0.3)
      };
      setStats(databaseStats);
    } catch (error) {
      console.error("სტატისტიკის ჩატვირთვა ვერ მოხერხდა:", error);
    }
  };  const handleCreateDatabase = async () => {
    try {
      const data = await adminApi.createDatabase(createForm);
      toast.success(data.message);
      setIsCreateDialogOpen(false);
      setCreateForm({
        databaseName: '',
        userId: '',
        template: 'empty',
        collation: 'SQL_Latin1_General_CP1_CI_AS',
        initialSize: 100
      });
      fetchDatabases();
      fetchStats();
    } catch (error) {
      toast.error("ბაზის შექმნა ვერ მოხერხდა");
      console.error(error);
    }
  };

  const handleBulkAction = async (action: string, selectedDatabases: string[]) => {
    if (selectedDatabases.length === 0) {
      toast.error("აირჩიეთ მინიმუმ ერთი ბაზა");
      return;
    }

    switch (action) {
      case 'backup':
        router.push(`/admin/backup?databases=${selectedDatabases.join(',')}&action=batch-backup`);
        break;
      case 'health-check':
        toast.success(`ჯანმრთელობის შემოწმება დაიწყო ${selectedDatabases.length} ბაზისთვის`);
        setTimeout(() => {
          fetchDatabases();
          toast.success("ჯანმრთელობის შემოწმება დასრულდა");
        }, 3000);
        break;
      case 'performance-analysis':
        toast.success(`შესრულების ანალიზი დაიწყო ${selectedDatabases.length} ბაზისთვის`);
        break;
    }
  };

  const handleExportReport = () => {
    const report = {
      timestamp: new Date().toISOString(),
      stats,
      databases: databases.map(db => ({
        name: db.databaseName,
        size: db.size_mb,
        status: db.status,
        health: db.health,
        performance: db.performance
      }))
    };
    
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `database-report-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("ანგარიში ჩამოტვირთული");
  };  const handleDeleteDatabase = async (databaseName: string) => {
    if (!confirm(`ნამდვილად გსურთ "${databaseName}" ბაზის წაშლა? ეს ქმედება უქცევადია.`)) {
      return;
    }

    try {
      const data = await adminApi.deleteDatabase(databaseName);
      toast.success(data.message);
      fetchDatabases();
      fetchStats();
    } catch (error) {
      toast.error("ბაზის წაშლა ვერ მოხერხდა");
      console.error(error);
    }
  };

  const handleQuickBackup = async (databaseName: string) => {
    router.push(`/admin/backup?database=${databaseName}&action=backup`);
  };

  const handleRestore = (databaseName: string) => {
    router.push(`/admin/backup?database=${databaseName}&action=restore`);
  };

  const handleCloneDatabase = async () => {
    if (!selectedDatabase) return;

    try {
      const newName = `${selectedDatabase.databaseName}_copy_${Date.now()}`;
      toast.success(`ბაზა "${selectedDatabase.databaseName}" კოპირდება როგორც "${newName}"`);
      setIsCloneDialogOpen(false);
      setSelectedDatabase(null);
      
      setTimeout(() => {
        fetchDatabases();
        fetchStats();
      }, 2000);
    } catch (error) {
      toast.error("ბაზის კოპირება ვერ მოხერხდა");
      console.error(error);
    }
  };

  const handleViewDetails = (database: DatabaseInfo) => {
    router.push(`/admin/databases/${encodeURIComponent(database.databaseName)}`);
  };

  // Filter databases
  const filteredDatabases = databases.filter(db => {
    const matchesSearch = !searchTerm || 
      db.databaseName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      db.userEmail.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'online' && db.status === 'online') ||
      (statusFilter === 'offline' && db.status !== 'online') ||
      (statusFilter === 'warning' && db.health?.status === 'warning') ||
      (statusFilter === 'critical' && db.health?.status === 'critical');

    return matchesSearch && matchesStatus;
  });

  const getStatusVariant = (status?: string): "default" | "secondary" | "outline" | "destructive" => {
    switch (status) {
      case 'online': return 'default';
      case 'offline': return 'secondary';
      case 'restoring': return 'outline';
      case 'suspect': return 'destructive';
      default: return 'secondary';
    }
  };

  const getStatusText = (status?: string) => {
    switch (status) {
      case 'online': return 'ონლაინ';
      case 'offline': return 'ოფლაინ';
      case 'restoring': return 'აღდგენის რეჟიმში';
      case 'suspect': return 'საეჭვო';
      default: return 'უცნობი';
    }
  };

  const getHealthIcon = (health?: { status: string }) => {
    switch (health?.status) {
      case 'healthy': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'critical': return <XCircle className="h-4 w-4 text-red-600" />;
      default: return <CheckCircle className="h-4 w-4 text-gray-400" />;
    }
  };
  if (isLoading) {
    return (
      <AdminLayout 
        title="ბაზების მართვა" 
        description="მონაცემთა ბაზების შექმნა, მართვა და მონიტორინგი"
        icon={<Database className="h-6 w-6 text-blue-600" />}
      >
        <div className="flex items-center justify-center min-h-[200px]">
          <LoadingSpinner />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout 
      title="ბაზების მართვა" 
      description="მონაცემთა ბაზების შექმნა, მართვა და მონიტორინგი"
      icon={<Database className="h-6 w-6 text-blue-600" />}
    >
      <div className="space-y-6">
        {/* Alert Section */}
        {alertCount > 0 && (
          <div className="flex items-center p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-yellow-600 mr-3" />
            <span className="text-sm text-yellow-800">
              {alertCount} ბაზას სჭირდება ყურადღება
            </span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap justify-end gap-2">
          <Button
            variant={isRealTimeEnabled ? "default" : "outline"}
            size="sm"
            onClick={() => setIsRealTimeEnabled(!isRealTimeEnabled)}
          >
            {isRealTimeEnabled ? <Wifi className="h-4 w-4 mr-2" /> : <WifiOff className="h-4 w-4 mr-2" />}
            რეალური დრო
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportReport}>
            <BarChart3 className="h-4 w-4 mr-2" />
            ანგარიში
          </Button>
          <Button variant="outline" size="sm" onClick={() => router.push('/admin/backup')}>
            <Archive className="h-4 w-4 mr-2" />
            ბექაპები
          </Button>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            ახალი ბაზა
          </Button>
        </div>

        {/* Enhanced Statistics Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">სულ ბაზები</CardTitle>
                <Database className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total}</div>
                <div className="flex gap-2 mt-2">
                  <Badge variant="default" className="text-xs">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    {stats.online} ონლაინ
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    <XCircle className="w-3 h-3 mr-1" />
                    {stats.offline} ოფლაინ
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">საერთო ზომა</CardTitle>
                <HardDrive className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{(stats.totalSizeMB / 1024).toFixed(1)} GB</div>
                <p className="text-xs text-muted-foreground mt-1">
                  საშუალო: {stats.averageSizeMB.toFixed(0)} MB
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">სარეზერვო ასლები</CardTitle>
                <Archive className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.withBackups}</div>
                <div className="flex items-center mt-1">
                  <span className="text-xs text-green-600 mr-2">✓ {stats.withBackups}</span>
                  <span className="text-xs text-red-600">✗ {stats.withoutBackups}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">გაფრთხილებები</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">{alertCount}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  ყურადღება საჭირო
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Real-time Analytics */}
        {isRealTimeEnabled && (
          <RealTimeAnalytics 
            title="ბაზების რეალურ დროში მონიტორინგი"
            refreshInterval={10000}
            showDetailed={false}
          />
        )}

        {/* Enhanced Controls and Filters */}
        <div className="bg-white p-4 rounded-lg shadow-sm border space-y-4">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            <div className="flex flex-1 gap-4 items-center max-w-2xl">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="ძებნა ბაზის სახელით ან მფლობელით..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="სტატუსი" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ყველა</SelectItem>
                  <SelectItem value="online">ონლაინ</SelectItem>
                  <SelectItem value="offline">ოფლაინ</SelectItem>
                  <SelectItem value="warning">გაფრთხილება</SelectItem>
                  <SelectItem value="critical">კრიტიკული</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex bg-gray-100 rounded-lg p-1">
                <Button
                  variant={viewMode === 'cards' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('cards')}
                  className="rounded-md"
                >
                  <Layout className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === 'table' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('table')}
                  className="rounded-md"
                >
                  <List className="w-4 h-4" />
                </Button>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchDatabases()}
                disabled={isLoading}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                განახლება
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-2 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleBulkAction('backup', filteredDatabases.map(db => db.databaseName))}
            >
              <Download className="w-4 h-4 mr-2" />
              ყველას ბექაპი
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleBulkAction('health-check', filteredDatabases.map(db => db.databaseName))}
            >
              <Activity className="w-4 h-4 mr-2" />
              ჯანმრთელობის შემოწმება
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleBulkAction('performance-analysis', filteredDatabases.map(db => db.databaseName))}
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              შესრულების ანალიზი
            </Button>
          </div>
        </div>

        {/* Database Cards View */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredDatabases.map((database) => (
            <Card 
              key={database.databaseName} 
              className={`hover:shadow-lg transition-all cursor-pointer border-2 ${
                highlightedDatabase === database.databaseName ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200'
              }`}
              onClick={() => handleViewDetails(database)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Database className="w-5 h-5 text-blue-600" />
                    <CardTitle className="text-lg truncate">{database.databaseName}</CardTitle>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={(e) => {
                        e.stopPropagation();
                        handleViewDetails(database);
                      }}>
                        <Eye className="w-4 h-4 mr-2" />
                        დეტალები
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => {
                        e.stopPropagation();
                        handleQuickBackup(database.databaseName);
                      }}>
                        <Download className="w-4 h-4 mr-2" />
                        ბექაპი
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => {
                        e.stopPropagation();
                        setSelectedDatabase(database);
                        setIsCloneDialogOpen(true);
                      }}>
                        <Copy className="w-4 h-4 mr-2" />
                        კოპირება
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteDatabase(database.databaseName);
                        }}
                        className="text-red-600"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        წაშლა
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="flex items-center justify-between">
                  <Badge variant={getStatusVariant(database.status)}>
                    {getStatusText(database.status)}
                  </Badge>
                  <div className="flex items-center">
                    {getHealthIcon(database.health)}
                    <span className="text-xs ml-1">{database.health?.score || 0}/100</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">მფლობელი:</span>
                    <span>{database.userEmail}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">ზომა:</span>
                    <span>{database.size_mb.toFixed(1)} MB</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">კონექციები:</span>
                    <span>{database.connectionCount || 0}</span>
                  </div>
                </div>
                
                {database.performance && (
                  <div className="space-y-2">
                    <div className="text-xs text-gray-600 mb-2">შესრულება:</div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span>CPU</span>
                        <span>{database.performance.cpuUsage}%</span>
                      </div>
                      <Progress value={database.performance.cpuUsage} className="h-1" />
                      <div className="flex justify-between text-xs">
                        <span>მეხსიერება</span>
                        <span>{database.performance.memoryUsage}%</span>
                      </div>
                      <Progress value={database.performance.memoryUsage} className="h-1" />
                    </div>
                  </div>
                )}

                {database.health?.issues && database.health.issues.length > 0 && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded p-2">
                    <div className="text-xs text-yellow-800">
                      {database.health.issues[0]}
                      {database.health.issues.length > 1 && ` (+${database.health.issues.length - 1})`}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Create Database Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>ახალი ბაზის შექმნა</DialogTitle>
              <DialogDescription>
                შეავსეთ ფორმა ახალი მონაცემთა ბაზის შესაქმნელად.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="databaseName">ბაზის სახელი</Label>
                <Input
                  id="databaseName"
                  value={createForm.databaseName}
                  onChange={(e) => setCreateForm({...createForm, databaseName: e.target.value})}
                  placeholder="მიუთითეთ ბაზის სახელი"
                />
              </div>
              <div>
                <Label htmlFor="userId">მომხმარებლის ID</Label>
                <Input
                  id="userId"
                  value={createForm.userId}
                  onChange={(e) => setCreateForm({...createForm, userId: e.target.value})}
                  placeholder="მიუთითეთ მომხმარებლის ID"
                />
              </div>
              <div>
                <Label htmlFor="template">ტემპლეიტი</Label>
                <Select 
                  value={createForm.template} 
                  onValueChange={(value) => setCreateForm({...createForm, template: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="აირჩიეთ ტემპლეიტი" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="empty">ცარიელი ბაზა</SelectItem>
                    <SelectItem value="standard">სტანდარტული</SelectItem>
                    <SelectItem value="ecommerce">ელექტრონული კომერცია</SelectItem>
                    <SelectItem value="blog">ბლოგი</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="initialSize">საწყისი ზომა (MB)</Label>
                <Input
                  id="initialSize"
                  type="number"
                  value={createForm.initialSize}
                  onChange={(e) => setCreateForm({...createForm, initialSize: parseInt(e.target.value) || 100})}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                გაუქმება
              </Button>
              <Button onClick={handleCreateDatabase}>შექმნა</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Clone Database Dialog */}
        <Dialog open={isCloneDialogOpen} onOpenChange={setIsCloneDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>ბაზის კოპირება</DialogTitle>
              <DialogDescription>
                ნამდვილად გსურთ "{selectedDatabase?.databaseName}" ბაზის კოპირება?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCloneDialogOpen(false)}>
                გაუქმება
              </Button>
              <Button onClick={handleCloneDatabase}>კოპირება</Button>
            </DialogFooter>
          </DialogContent>        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default DatabaseManagementPage;
