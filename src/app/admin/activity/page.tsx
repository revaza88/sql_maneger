"use client";

import { useEffect, useState, useMemo } from "react";
import { adminApi } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useAuthStore } from "@/lib/store/auth-store";
import { useRouter } from "next/navigation";
import { LoadingSpinner } from "@/components/loading-spinner";
import { AdminLayout } from "@/components/admin-layout";
import {
  Activity,
  Search,
  Filter,
  Download,
  Shield,
  Database,
  Users,
  Key,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Calendar,
  User,
  Monitor,
  FileText,
  RefreshCw,
} from "lucide-react";

interface AuditLog {
  id: string;
  userId: string;
  userEmail: string;
  action: string;
  resourceType: string;
  resourceId: string;
  details: string;
  ipAddress: string;
  userAgent: string;
  createdAt: string;
  status: "success" | "failure" | "warning";
}

interface LoginHistory {
  id: string;
  userId: string;
  userEmail: string;
  ipAddress: string;
  userAgent: string;
  success: boolean;
  createdAt: string;
  location?: string;
}

interface SystemStats {
  totalActions: number;
  todayActions: number;
  successfulActions: number;
  failedActions: number;
  uniqueUsers: number;
  topActions: Array<{ action: string; count: number }> ;
}

export default function ActivityMonitoringPage() {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loginHistory, setLoginHistory] = useState<LoginHistory[]>([]);
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"audit" | "logins">("audit");
  const [searchTerm, setSearchTerm] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const { token } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (token) {
      fetchData();
    }
  }, [token]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [auditData, loginData, statsData] = await Promise.all([
        adminApi.getAuditLogs(),
        adminApi.getLoginHistory(),
        adminApi.getSystemStats(),
      ]);
      
      setAuditLogs(auditData || []);
      setLoginHistory(loginData || []);
      setSystemStats(statsData || {
        totalActions: 0,
        todayActions: 0,
        successfulActions: 0,
        failedActions: 0,
        uniqueUsers: 0,
        topActions: [],
      });
    } catch (err) {
      toast.error("მონაცემების ჩატვირთვა ვერ მოხერხდა");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const getActionIcon = (action: string) => {
    const actionLower = action.toLowerCase();
    if (actionLower.includes("login")) return <Key className="h-4 w-4" />;
    if (actionLower.includes("database")) return <Database className="h-4 w-4" />;
    if (actionLower.includes("user")) return <Users className="h-4 w-4" />;
    if (actionLower.includes("backup")) return <FileText className="h-4 w-4" />;
    if (actionLower.includes("admin")) return <Shield className="h-4 w-4" />;
    return <Activity className="h-4 w-4" />;
  };

  const getStatusIcon = (status: string | boolean) => {
    if (status === "success" || status === true) {
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    } else if (status === "failure" || status === false) {
      return <XCircle className="h-4 w-4 text-red-600" />;
    } else if (status === "warning") {
      return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
    }
    return <Clock className="h-4 w-4 text-gray-400" />;
  };

  const getStatusVariant = (status: string | boolean) => {
    if (status === "success" || status === true) return "default";
    if (status === "failure" || status === false) return "destructive";
    if (status === "warning") return "secondary";
    return "outline";
  };

  const filteredAuditLogs = useMemo(() => auditLogs.filter(log => {
    const searchTermLower = searchTerm.toLowerCase();
    const matchesSearch = searchTerm === "" || 
      log.userEmail.toLowerCase().includes(searchTermLower) ||
      log.action.toLowerCase().includes(searchTermLower) ||
      log.details.toLowerCase().includes(searchTermLower);
    
    const matchesAction = actionFilter === "all" || log.action.toLowerCase().includes(actionFilter.toLowerCase());
    const matchesStatus = statusFilter === "all" || log.status === statusFilter;
    
    return matchesSearch && matchesAction && matchesStatus;
  }), [auditLogs, searchTerm, actionFilter, statusFilter]);

  const filteredLoginHistory = useMemo(() => loginHistory.filter(login => {
    const searchTermLower = searchTerm.toLowerCase();
    const matchesSearch = searchTerm === "" || 
      login.userEmail.toLowerCase().includes(searchTermLower) ||
      login.ipAddress.includes(searchTermLower);
    
    return matchesSearch;
  }), [loginHistory, searchTerm]);

  if (isLoading) {
    return (
      <AdminLayout 
        title="სისტემის აქტივობა" 
        description="მომხმარებლების ქმედებების და შესვლების მონიტორინგი"
        icon={<Activity className="h-6 w-6 text-blue-600" />}
      >
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout 
      title="სისტემის აქტივობა" 
      description="მომხმარებლების ქმედებების და შესვლების მონიტორინგი"
      icon={<Activity className="h-6 w-6 text-blue-600" />}
    >
      <div className="space-y-6">

      {/* Statistics */}
      {systemStats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-600 text-sm font-medium">ყველა ქმედება</p>
                  <p className="text-3xl font-bold text-blue-900">{systemStats.totalActions}</p>
                </div>
                <Activity className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-green-50 to-green-100 border-green-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-600 text-sm font-medium">დღეს</p>
                  <p className="text-3xl font-bold text-green-900">{systemStats.todayActions}</p>
                </div>
                <Calendar className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-emerald-50 to-emerald-100 border-emerald-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-emerald-600 text-sm font-medium">წარმატებული</p>
                  <p className="text-3xl font-bold text-emerald-900">{systemStats.successfulActions}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-emerald-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-red-50 to-red-100 border-red-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-red-600 text-sm font-medium">წარუმატებელი</p>
                  <p className="text-3xl font-bold text-red-900">{systemStats.failedActions}</p>
                </div>
                <XCircle className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-600 text-sm font-medium">აქტიური მომხმარებლები</p>
                  <p className="text-3xl font-bold text-purple-900">{systemStats.uniqueUsers}</p>
                </div>
                <Users className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
        <Button
          variant={activeTab === "audit" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("audit")}
          className="flex items-center gap-2"
        >
          <FileText className="h-4 w-4" />
          აუდიტის ლოგები
        </Button>
        <Button
          variant={activeTab === "logins" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("logins")}
          className="flex items-center gap-2"
        >
          <Monitor className="h-4 w-4" />
          შესვლების ისტორია
        </Button>
      </div>

      {/* Controls */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex flex-1 gap-4 items-center">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="ძებნა..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              {activeTab === "audit" && (
                <>
                  <Select value={actionFilter} onValueChange={setActionFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="ქმედება" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">ყველა ქმედება</SelectItem>
                      <SelectItem value="login">შესვლა</SelectItem>
                      <SelectItem value="database">ბაზები</SelectItem>
                      <SelectItem value="user">მომხმარებლები</SelectItem>
                      <SelectItem value="backup">Backup</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="სტატუსი" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">ყველა სტატუსი</SelectItem>
                      <SelectItem value="success">წარმატებული</SelectItem>
                      <SelectItem value="failure">წარუმატებელი</SelectItem>
                      <SelectItem value="warning">გაფრთხილება</SelectItem>
                    </SelectContent>
                  </Select>
                </>
              )}
            </div>

            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={fetchData}>
                <RefreshCw className="h-4 w-4 mr-2" />
                განახლება
              </Button>
              {/* <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                ექსპორტი
              </Button> */}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Content */}
      {activeTab === "audit" ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              აუდიტის ლოგები ({filteredAuditLogs.length})
            </CardTitle>
            <CardDescription>
              მომხმარებლების ყველა ქმედების დეტალური ჩანაწერი
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>თარიღი</TableHead>
                  <TableHead>მომხმარებელი</TableHead>
                  <TableHead>ქმედება</TableHead>
                  <TableHead>რესურსი</TableHead>
                  <TableHead>სტატუსი</TableHead>
                  <TableHead>IP მისამართი</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAuditLogs.map((log) => (
                  <TableRow key={log.id} className="hover:bg-gray-50">
                    <TableCell className="text-sm">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-gray-400" />
                        {new Date(log.createdAt).toLocaleString('ka-GE')}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-400" />
                        <span className="text-sm">{log.userEmail}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getActionIcon(log.action)}
                        <span className="text-sm font-medium">{log.action}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      <div>
                        <span className="text-gray-600">{log.resourceType}</span>
                        {log.resourceId && (
                          <div className="text-xs text-gray-400 truncate max-w-[100px]">{log.resourceId}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(log.status)} className="flex items-center gap-1 w-fit">
                        {getStatusIcon(log.status)}
                        {log.status === "success" ? "წარმატებული" : 
                         log.status === "failure" ? "წარუმატებელი" : "გაფრთხილება"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {log.ipAddress}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            
            {filteredAuditLogs.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>აუდიტის ლოგები ვერ მოიძებნა</p>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Monitor className="h-5 w-5" />
              შესვლების ისტორია ({filteredLoginHistory.length})
            </CardTitle>
            <CardDescription>
              მომხმარებლების შესვლების დეტალური ჩანაწერი
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>თარიღი</TableHead>
                  <TableHead>მომხმარებელი</TableHead>
                  <TableHead>სტატუსი</TableHead>
                  <TableHead>IP მისამართი</TableHead>
                  <TableHead>მოწყობილობა</TableHead>
                  <TableHead>ლოკაცია</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLoginHistory.map((login) => (
                  <TableRow key={login.id} className="hover:bg-gray-50">
                    <TableCell className="text-sm">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-gray-400" />
                        {new Date(login.createdAt).toLocaleString('ka-GE')}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-400" />
                        <span className="text-sm">{login.userEmail}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(login.success)} className="flex items-center gap-1 w-fit">
                        {getStatusIcon(login.success)}
                        {login.success ? "წარმატებული" : "წარუმატებელი"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {login.ipAddress}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600 max-w-xs truncate" title={login.userAgent}>
                      {login.userAgent}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {login.location || "N/A"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            
            {filteredLoginHistory.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Monitor className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>შესვლების ისტორია ვერ მოიძებნა</p>
              </div>
            )}
          </CardContent>        </Card>
      )}
    </div>
    </AdminLayout>
  );
}
