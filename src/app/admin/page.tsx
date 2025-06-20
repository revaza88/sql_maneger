"use client";

import { useEffect, useState } from "react";
import { adminApi } from "../../lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { LoadingSpinner } from "@/components/loading-spinner";
import { AdminLayout } from "@/components/admin-layout";
import { RealTimeAnalytics } from "@/components/real-time-analytics";
import {
  Users,
  Database,
  Activity,
  Shield,
  Settings,
  BarChart3,
  Server,
  Archive,
  Monitor,
  AlertTriangle,
  Zap,
  Home,
  ChevronRight,
} from "lucide-react";

interface SystemStats {
  users: {
    total: number;
    active: number;
    blocked: number;
    paused: number;
  };
  databases: {
    total: number;
    totalSizeMB: number;
  };
  system: {
    uptime: string;
    version: string;
  };
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetchSystemStats();
  }, []);

  const fetchSystemStats = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await adminApi.getStats();
      
      const systemStats: SystemStats = {
        users: {
          total: response.users?.total || 0,
          active: response.users?.active || 0,
          blocked: response.users?.blocked || 0,
          paused: response.users?.paused || 0,
        },
        databases: {
          total: response.databases?.total || 0,
          totalSizeMB: response.databases?.totalSizeMB || 0,
        },
        system: {
          uptime: "99.9%",
          version: "v1.0.0",
        },
      };
      
      setStats(systemStats);
    } catch (err) {
      setError("სტატისტიკის ჩატვირთვა ვერ მოხერხდა");
      toast.error("სტატისტიკის ჩატვირთვა ვერ მოხერხდა");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const quickActions = [
    {
      title: "მომხმარებლების მართვა",
      description: "ახალი მომხმარებლების დამატება და არსებულის რედაქტირება",
      icon: <Users className="h-6 w-6 text-blue-600" />,
      href: "/admin/users",
    },
    {
      title: "ბაზების მართვა",
      description: "მონაცემთა ბაზების შექმნა, მართვა და მონიტორინგი",
      icon: <Database className="h-6 w-6 text-green-600" />,
      href: "/admin/databases",
    },
    {
      title: "აქტივობის მონიტორინგი",
      description: "სისტემის აქტივობისა და ლოგების მონიტორინგი",
      icon: <Activity className="h-6 w-6 text-purple-600" />,
      href: "/admin/activity",
    },
    {
      title: "ბექაპების მართვა",
      description: "ავტომატური და ხელით ბექაპების მართვა",
      icon: <Archive className="h-6 w-6 text-orange-600" />,
      href: "/admin/backup",
    },
  ];

  if (isLoading) {
    return (
      <AdminLayout 
        title="ადმინისტრატორის პანელი" 
        description="სისტემის მართვისა და მონიტორინგის ცენტრი"
        icon={<Home className="h-6 w-6 text-blue-600" />}
      >
        <div className="flex items-center justify-center min-h-96">
          <LoadingSpinner />
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout 
        title="ადმინისტრატორის პანელი" 
        description="სისტემის მართვისა და მონიტორინგის ცენტრი"
        icon={<Home className="h-6 w-6 text-blue-600" />}
      >
        <div className="text-center mt-10">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-500">{error}</p>
          <Button onClick={fetchSystemStats} className="mt-4">
            თავიდან ცდა
          </Button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout 
      title="ადმინისტრატორის პანელი" 
      description="სისტემის მართვისა და მონიტორინგის ცენტრი"
      icon={<Home className="h-6 w-6 text-blue-600" />}
    >
      <div className="space-y-6">
        {/* System Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-600 text-sm font-medium">მომხმარებლები</p>
                  <p className="text-3xl font-bold text-blue-900">{stats?.users.total || 0}</p>
                  <p className="text-blue-600 text-xs">აქტიური: {stats?.users.active || 0}</p>
                </div>
                <Users className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-green-50 to-green-100 border-green-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-600 text-sm font-medium">ბაზები</p>
                  <p className="text-3xl font-bold text-green-900">{stats?.databases.total || 0}</p>
                  <p className="text-green-600 text-xs">
                    {((stats?.databases.totalSizeMB || 0) / 1024).toFixed(1)} GB
                  </p>
                </div>
                <Database className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-600 text-sm font-medium">სისტემის მუშაობა</p>
                  <p className="text-3xl font-bold text-purple-900">{stats?.system.uptime}</p>
                  <p className="text-purple-600 text-xs">ხელმისაწვდომობა</p>
                </div>
                <Monitor className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-orange-50 to-orange-100 border-orange-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-600 text-sm font-medium">ვერსია</p>
                  <p className="text-3xl font-bold text-orange-900">{stats?.system.version}</p>
                  <p className="text-orange-600 text-xs">მიმდინარე</p>
                </div>
                <Settings className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-500" />
              სწრაფი ქმედებები
            </CardTitle>
            <CardDescription>
              ძირითადი ადმინისტრაციული ფუნქციების სწრაფი წვდომა
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {quickActions.map((action, index) => (
                <div
                  key={index}
                  className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow cursor-pointer group"
                  onClick={() => router.push(action.href)}
                >
                  <div className="flex items-start space-x-3">
                    <div className="p-2 bg-gray-100 rounded-lg group-hover:bg-blue-100 transition-colors">
                      {action.icon}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                        {action.title}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">{action.description}</p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Real-time Analytics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-500" />
              რეალურ დროის ანალიტიკა
            </CardTitle>
            <CardDescription>
              სისტემის შესრულების მონიტორინგი რეალურ დროში
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RealTimeAnalytics 
              title="სისტემის შესრულება"
              refreshInterval={30000}
              showDetailed={true}
            />
          </CardContent>
        </Card>

        {/* System Status */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-green-500" />
                უსაფრთხოების სტატუსი
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">ავტენტიფიკაცია</span>
                  <Badge variant="default" className="bg-green-100 text-green-800">აქტიური</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">SSL სერტიფიკატი</span>
                  <Badge variant="default" className="bg-green-100 text-green-800">ვალიდური</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Rate Limiting</span>
                  <Badge variant="default" className="bg-green-100 text-green-800">აქტიური</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">ბაზის ბექაპი</span>
                  <Badge variant="default" className="bg-yellow-100 text-yellow-800">დღეიური</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="h-5 w-5 text-blue-500" />
                სერვერის რესურსები
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">CPU გამოყენება</span>
                  <Badge variant="default" className="bg-blue-100 text-blue-800">23%</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">მეხსიერება</span>
                  <Badge variant="default" className="bg-blue-100 text-blue-800">67%</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">დისკის ადგილი</span>
                  <Badge variant="default" className="bg-yellow-100 text-yellow-800">89%</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">ქსელური ტრაფიკი</span>
                  <Badge variant="default" className="bg-green-100 text-green-800">ნორმალური</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
