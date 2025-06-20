"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { adminApi, User as ApiUser } from "../../../../lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { useAuthStore } from "@/lib/store/auth-store";
import { LoadingSpinner } from "@/components/loading-spinner";
import { AdminLayout } from "@/components/admin-layout";
import {
  User,
  Mail,
  Shield,
  Calendar,
  Clock,
  MapPin,
  Monitor,
  Activity,
  Key,
  Settings,
  ArrowLeft,
  Edit,
  Trash2,
  UserX,
  UserCheck,
  Pause,
  Play,
} from "lucide-react";

interface UserActivity {
  id: string;
  action: string;
  timestamp: string;
  details: string;
  status: 'success' | 'warning' | 'error';
}

interface UserDetails extends ApiUser {
  lastActivity?: string;
  totalSessions?: number;
  createdDatabases?: number;
  lastIpAddress?: string;
  deviceInfo?: string;
}

export default function UserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.id as string;
  
  const [user, setUser] = useState<UserDetails | null>(null);
  const [userActivity, setUserActivity] = useState<UserActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { user: currentUser, token } = useAuthStore();

  useEffect(() => {
    if (!token || currentUser?.role?.toLowerCase() !== "admin") {
      router.push("/admin/login");
      return;
    }
    fetchUserDetails();
  }, [token, currentUser, router, userId]);

  const fetchUserDetails = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // In a real app, you'd have a specific API endpoint for user details
      // For now, we'll simulate this with mock data
      const users = await adminApi.getUsers();
      const foundUser = users.find(u => u.id === userId);
      
      if (!foundUser) {
        setError("მომხმარებელი ვერ მოიძებნა");
        return;
      }

      // Simulate additional user details
      const enhancedUser: UserDetails = {
        ...foundUser,
        lastActivity: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 min ago
        totalSessions: Math.floor(Math.random() * 100) + 10,
        createdDatabases: Math.floor(Math.random() * 5) + 1,
        lastIpAddress: '192.168.1.' + Math.floor(Math.random() * 255),
        deviceInfo: 'Chrome 120.0.0.0 on Windows 10',
      };

      setUser(enhancedUser);

      // Mock user activity
      setUserActivity([
        {
          id: '1',
          action: 'სისტემაში შესვლა',
          timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
          details: 'წარმატებული ავტორიზაცია',
          status: 'success'
        },
        {
          id: '2',
          action: 'ბაზის ბექაპი',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
          details: 'TestDB ბაზის ბექაპის შექმნა',
          status: 'success'
        },
        {
          id: '3',
          action: 'პაროლის შეცვლა',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
          details: 'პაროლი წარმატებით შეიცვალა',
          status: 'success'
        },
        {
          id: '4',
          action: 'წვდომის მცდელობა',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
          details: 'არასწორი იმეილი/პაროლი',
          status: 'error'
        }
      ]);

    } catch (err) {
      setError("მონაცემების ჩატვირთვა ვერ მოხერხდა");
      toast.error("მონაცემების ჩატვირთვა ვერ მოხერხდა");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRoleChange = async (newRole: "USER" | "ADMIN") => {
    if (!token || !user) return;
    try {
      await adminApi.updateUserRole(user.id, newRole);
      setUser({ ...user, role: newRole });
      toast.success(`მომხმარებლის როლი ${newRole === "ADMIN" ? "ადმინად" : "მომხმარებლად"} შეიცვალა`);
    } catch (err) {
      toast.error("როლის შეცვლა ვერ მოხერხდა");
      console.error(err);
    }
  };

  const handleBlockToggle = async () => {
    if (!token || !user) return;
    try {
      if (user.isBlocked) {
        await adminApi.unblockUser(user.id);
      } else {
        await adminApi.blockUser(user.id);
      }
      setUser({ ...user, isBlocked: !user.isBlocked });
      toast.success(user.isBlocked ? "მომხმარებელი განიბლოკა" : "მომხმარებელი დაიბლოკა");
    } catch (err) {
      toast.error("ოპერაცია ვერ შესრულდა");
      console.error(err);
    }
  };

  const handlePauseToggle = async () => {
    if (!token || !user) return;
    try {
      if (user.isPaused) {
        await adminApi.unpauseUser(user.id);
      } else {
        await adminApi.pauseUser(user.id);
      }
      setUser({ ...user, isPaused: !user.isPaused });
      toast.success(user.isPaused ? "მომხმარებელი აღდგა" : "მომხმარებელი შეჩერდა");
    } catch (err) {
      toast.error("ოპერაცია ვერ შესრულდა");
      console.error(err);
    }
  };

  const handleDeleteUser = async () => {
    if (!token || !user) return;
    if (currentUser?.id?.toString() === user.id) {
      toast.error("საკუთარი ანგარიშის წაშლა შეუძლებელია");
      return;
    }

    if (!confirm("დარწმუნებული ხართ მომხმარებლის წაშლაში?")) {
      return;
    }

    try {
      await adminApi.deleteUser(user.id);
      toast.success("მომხმარებელი წარმატებით წაიშალა");
      router.push('/admin/users');
    } catch (err) {
      toast.error("მომხმარებლის წაშლა ვერ მოხერხდა");
      console.error(err);
    }
  };

  const getActivityIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <UserCheck className="h-4 w-4 text-green-600" />;
      case 'warning':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'error':
        return <UserX className="h-4 w-4 text-red-600" />;
      default:
        return <Activity className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'success':
        return 'default';
      case 'warning':
        return 'secondary';
      case 'error':
        return 'destructive';
      default:
        return 'outline';
    }
  };
  if (isLoading) {
    return (
      <AdminLayout 
        title="მომხმარებლის დეტალები" 
        description="მომხმარებლის სრული ინფორმაცია და აქტივობა"
        icon={<User className="h-6 w-6 text-blue-600" />}
      >
        <LoadingSpinner />
      </AdminLayout>
    );
  }

  if (error || !user) {
    return (
      <AdminLayout 
        title="მომხმარებლის დეტალები" 
        description="მომხმარებლის სრული ინფორმაცია და აქტივობა"
        icon={<User className="h-6 w-6 text-blue-600" />}
      >
        <div className="text-center py-12">
          <User className="h-16 w-16 mx-auto mb-4 text-gray-300" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">მომხმარებელი ვერ მოიძებნა</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <Button onClick={() => router.push('/admin/users')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            უკან დაბრუნება
          </Button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout 
      title={`მომხმარებელი: ${user.name || user.email}`} 
      description="მომხმარებლის სრული ინფორმაცია და აქტივობა"
      icon={<User className="h-6 w-6 text-blue-600" />}
    >      <div className="space-y-6">
        {/* Back Button */}
        <div className="flex items-center">
          <Button variant="outline" onClick={() => router.push('/admin/users')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            უკან
          </Button>
        </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User Profile Card */}
        <div className="lg:col-span-1">
          <Card className="sticky top-6">
            <CardHeader className="text-center">
              <Avatar className="h-24 w-24 mx-auto mb-4">
                <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${user.email}`} />
                <AvatarFallback className="bg-blue-100 text-blue-600 text-2xl">
                  {user.email.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <CardTitle className="flex items-center justify-center gap-2">
                {user.name || "N/A"}
                <Badge variant={user.role === "ADMIN" ? "destructive" : "secondary"}>
                  {user.role === "ADMIN" ? "ადმინი" : "მომხმარებელი"}
                </Badge>
              </CardTitle>
              <CardDescription>{user.email}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center space-x-3 text-sm">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-600">ელ. ფოსტა:</span>
                  <span className="font-medium">{user.email}</span>
                </div>
                  <div className="flex items-center space-x-3 text-sm">
                  <Shield className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-600">როლი:</span>
                  <Badge variant={user.role === "ADMIN" ? "destructive" : "secondary"}>
                    {user.role === "ADMIN" ? "ადმინისტრატორი" : "მომხმარებელი"}
                  </Badge>
                </div>

                <div className="flex items-center space-x-3 text-sm">
                  <Activity className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-600">სტატუსი:</span>
                  <Badge variant={
                    user.isBlocked ? "destructive" : 
                    user.isPaused ? "secondary" : "default"
                  }>
                    {user.isBlocked ? "დაბლოკილი" : 
                     user.isPaused ? "შეჩერებული" : "აქტიური"}
                  </Badge>
                </div>

                <div className="flex items-center space-x-3 text-sm">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-600">რეგისტრაცია:</span>
                  <span className="font-medium">
                    {user.createdAt ? new Date(user.createdAt).toLocaleDateString('ka-GE') : "N/A"}
                  </span>
                </div>

                <div className="flex items-center space-x-3 text-sm">
                  <Clock className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-600">ბოლო აქტივობა:</span>
                  <span className="font-medium">
                    {user.lastActivity ? new Date(user.lastActivity).toLocaleDateString('ka-GE') : "N/A"}
                  </span>
                </div>

                <div className="flex items-center space-x-3 text-sm">
                  <MapPin className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-600">IP მისამართი:</span>
                  <span className="font-medium">{user.lastIpAddress || "N/A"}</span>
                </div>

                <div className="flex items-center space-x-3 text-sm">
                  <Monitor className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-600">მოწყობილობა:</span>
                  <span className="font-medium text-xs">{user.deviceInfo || "N/A"}</span>
                </div>              </div>

              <hr className="my-4" />

              <div className="space-y-2">
                <Button
                  onClick={() => handleRoleChange(user.role === "ADMIN" ? "USER" : "ADMIN")}
                  variant="outline"
                  className="w-full"
                >
                  <Shield className="h-4 w-4 mr-2" />
                  როლის შეცვლა ({user.role === "ADMIN" ? "მომხმარებელი" : "ადმინი"})
                </Button>

                <Button
                  onClick={handleBlockToggle}
                  variant={user.isBlocked ? "default" : "destructive"}
                  className="w-full"
                >
                  {user.isBlocked ? (
                    <>
                      <UserCheck className="h-4 w-4 mr-2" />
                      განბლოკვა
                    </>
                  ) : (
                    <>
                      <UserX className="h-4 w-4 mr-2" />
                      დაბლოკვა
                    </>
                  )}
                </Button>                <Button
                  onClick={handlePauseToggle}
                  variant={user.isPaused ? "default" : "secondary"}
                  className="w-full"
                >
                  {user.isPaused ? (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      აღდგენა
                    </>
                  ) : (
                    <>
                      <Pause className="h-4 w-4 mr-2" />
                      შეჩერება
                    </>
                  )}
                </Button>

                <Button
                  onClick={handleDeleteUser}
                  variant="destructive"
                  className="w-full"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  წაშლა
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Statistics and Activity */}
        <div className="lg:col-span-2 space-y-6">
          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
              <CardContent className="p-6 text-center">
                <div className="text-2xl font-bold text-blue-900">{user.totalSessions || 0}</div>
                <div className="text-sm text-blue-600">სულ სესია</div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-green-50 to-green-100 border-green-200">
              <CardContent className="p-6 text-center">
                <div className="text-2xl font-bold text-green-900">{user.createdDatabases || 0}</div>
                <div className="text-sm text-green-600">შექმნილი ბაზები</div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-purple-50 to-purple-100 border-purple-200">
              <CardContent className="p-6 text-center">
                <div className="text-2xl font-bold text-purple-900">
                  {user.isBlocked ? "დაბლოკილი" : "აქტიური"}
                </div>
                <div className="text-sm text-purple-600">სტატუსი</div>
              </CardContent>
            </Card>
          </div>

          {/* Activity Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                ბოლო აქტივობა
              </CardTitle>
              <CardDescription>
                მომხმარებლის ბოლო ქმედებების ისტორია
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {userActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start space-x-3 p-3 rounded-lg bg-gray-50">
                    <div className="flex-shrink-0">
                      {getActivityIcon(activity.status)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900">
                          {activity.action}
                        </p>
                        <Badge variant={getStatusVariant(activity.status)} className="ml-2">
                          {activity.status === 'success' ? 'წარმატებული' : 
                           activity.status === 'warning' ? 'გაფრთხილება' : 'შეცდომა'}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        {activity.details}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(activity.timestamp).toLocaleString('ka-GE')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {userActivity.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Activity className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>აქტივობის ისტორია მიუწვდომელია</p>
                </div>
              )}
            </CardContent>
          </Card>        </div>
      </div>
    </div>
    </AdminLayout>
  );
}
