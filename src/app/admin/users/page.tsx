"use client";

import { useEffect, useState } from "react";
import { adminApi, User as ApiUser } from "../../../lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  DialogTrigger,
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
import { useAuthStore } from "@/lib/store/auth-store";
import { useRouter } from "next/navigation";
import { LoadingSpinner } from "@/components/loading-spinner";
import {
  Search,
  Users,
  UserPlus,
  MoreVertical,
  Shield,
  ShieldCheck,
  Activity,
  Download,
  Filter,
  AlertTriangle,
  Eye,
  Edit,
  Trash2,
  Key,
  UserX,
  UserCheck,
  Calendar,
  Mail,
} from "lucide-react";

interface UserStats {
  total: number;
  admins: number;
  active: number;
  blocked: number;
}

interface CreateUserData {
  email: string;
  name: string;
  password: string;
  role: "USER" | "ADMIN";
}

export default function UserManagementPage() {
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<ApiUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newUser, setNewUser] = useState<CreateUserData>({
    email: "",
    name: "",
    password: "",
    role: "USER",
  });

  const { user, token, clearAuth } = useAuthStore();
  const router = useRouter();

  // Statistics calculation
  const userStats: UserStats = {
    total: users.length,
    admins: users.filter(u => u.role === "ADMIN").length,
    active: users.filter(u => !u.isBlocked).length,
    blocked: users.filter(u => u.isBlocked).length,
  };

  useEffect(() => {
    if (!token || user?.role?.toLowerCase() !== "admin") {
      router.push("/admin/login");
      return;
    }
    fetchUsers();
  }, [token, user, router]);

  useEffect(() => {
    filterUsers();
  }, [users, searchTerm, roleFilter, statusFilter]);

  const fetchUsers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const fetchedUsers = await adminApi.getUsers(token!);
      setUsers(fetchedUsers);
    } catch (err) {
      setError("მომხმარებლების ჩატვირთვა ვერ მოხერხდა");
      toast.error("მომხმარებლების ჩატვირთვა ვერ მოხერხდა");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const filterUsers = () => {
    let filtered = users;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        user =>
          user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (user.name && user.name.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Role filter
    if (roleFilter !== "all") {
      filtered = filtered.filter(user => user.role === roleFilter);
    }

    // Status filter
    if (statusFilter !== "all") {
      if (statusFilter === "active") {
        filtered = filtered.filter(user => !user.isBlocked);
      } else if (statusFilter === "blocked") {
        filtered = filtered.filter(user => user.isBlocked);
      }
    }

    setFilteredUsers(filtered);
  };

  const handleCreateUser = async () => {
    if (!token) return;
    
    if (!newUser.email || !newUser.password || !newUser.name) {
      toast.error("ყველა ველი შეავსეთ");
      return;
    }

    try {
      // Note: You'll need to add this endpoint to your API
      await adminApi.createUser(newUser, token);
      await fetchUsers();
      setIsCreateDialogOpen(false);
      setNewUser({ email: "", name: "", password: "", role: "USER" });
      toast.success("ახალი მომხმარებელი წარმატებით შეიქმნა");
    } catch (err) {
      toast.error("მომხმარებლის შექმნა ვერ მოხერხდა");
      console.error(err);
    }
  };

  const handleRoleChange = async (userId: string, role: "USER" | "ADMIN") => {
    if (!token) return;
    try {
      await adminApi.updateUserRole(userId, role, token);
      setUsers(users.map(u => (u.id === userId ? { ...u, role } : u)));
      toast.success(`მომხმარებლის როლი ${role === "ADMIN" ? "ადმინად" : "მომხმარებლად"} შეიცვალა`);
    } catch (err) {
      toast.error("როლის შეცვლა ვერ მოხერხდა");
      console.error(err);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!token) return;
    if (user?.id?.toString() === userId) {
      toast.error("საკუთარი ანგარიშის წაშლა შეუძლებელია");
      return;
    }

    if (!confirm("დარწმუნებული ხართ მომხმარებლის წაშლაში?")) {
      return;
    }

    try {
      await adminApi.deleteUser(userId, token);
      setUsers(users.filter(u => u.id !== userId));
      toast.success("მომხმარებელი წარმატებით წაიშალა");
    } catch (err) {
      toast.error("მომხმარებლის წაშლა ვერ მოხერხდა");
      console.error(err);
    }
  };

  const handleBlockToggle = async (userId: string, blocked: boolean) => {
    if (!token) return;
    try {
      if (blocked) {
        await adminApi.unblockUser(userId, token);
      } else {
        await adminApi.blockUser(userId, token);
      }
      setUsers(users.map(u => (u.id === userId ? { ...u, isBlocked: !blocked } : u)));
      toast.success(blocked ? "მომხმარებელი განიბლოკა" : "მომხმარებელი დაიბლოკა");
    } catch (err) {
      toast.error("ოპერაცია ვერ შესრულდა");
      console.error(err);
    }
  };

  const handleResetPassword = async (userId: string) => {
    if (!token) return;
    const newPassword = prompt('შეიყვანეთ ახალი პაროლი:');
    if (!newPassword) return;
    
    try {
      await adminApi.resetPassword(userId, newPassword, token);
      toast.success('პაროლი წარმატებით შეიცვალა');
    } catch {
      toast.error('პაროლის შეცვლა ვერ მოხერხდა');
    }
  };

  const getRoleVariant = (role: string) => {
    return role === "ADMIN" ? "destructive" : "secondary";
  };

  const getStatusVariant = (isBlocked: boolean) => {
    return isBlocked ? "destructive" : "default";
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <div className="text-red-500 text-center mt-10">{error}</div>;
  }

  if (user?.role?.toLowerCase() !== "admin") {
    return (
      <div className="text-center mt-10">
        <p>ამ გვერდის ნახვის უფლება არ გაქვთ</p>
        <Button onClick={() => router.push("/admin/login")} className="mt-4">
          ადმინ პანელი
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">👥 მომხმარებლების მართვა</h1>
          <p className="text-gray-600 mt-1">სისტემის მომხმარებლების მმართველი პანელი</p>
        </div>        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push('/admin/activity')}>
            📊 აქტივობა
          </Button>
          <Button variant="outline" onClick={() => router.push('/admin/dashboard')}>
            📊 დაშბორდი
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              clearAuth();
              router.push('/admin/login');
            }}
          >
            გამოსვლა
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-600 text-sm font-medium">ყველა მომხმარებელი</p>
                <p className="text-3xl font-bold text-blue-900">{userStats.total}</p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-600 text-sm font-medium">ადმინისტრატორები</p>
                <p className="text-3xl font-bold text-purple-900">{userStats.admins}</p>
              </div>
              <ShieldCheck className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-green-50 to-green-100 border-green-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-600 text-sm font-medium">აქტიური</p>
                <p className="text-3xl font-bold text-green-900">{userStats.active}</p>
              </div>
              <UserCheck className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-red-50 to-red-100 border-red-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-600 text-sm font-medium">დაბლოკილი</p>
                <p className="text-3xl font-bold text-red-900">{userStats.blocked}</p>
              </div>
              <UserX className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex flex-1 gap-4 items-center">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="ძებნა ემაილით ან სახელით..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="როლი" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ყველა როლი</SelectItem>
                  <SelectItem value="ADMIN">ადმინი</SelectItem>
                  <SelectItem value="USER">მომხმარებელი</SelectItem>
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="სტატუსი" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ყველა სტატუსი</SelectItem>
                  <SelectItem value="active">აქტიური</SelectItem>
                  <SelectItem value="blocked">დაბლოკილი</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                ექსპორტი
              </Button>
              
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    <UserPlus className="h-4 w-4 mr-2" />
                    ახალი მომხმარებელი
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>ახალი მომხმარებლის დამატება</DialogTitle>
                    <DialogDescription>
                      შეავსეთ ყველა აუცილებელი ველი ახალი მომხმარებლის შესაქმნელად
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="email">ელ. ფოსტა</Label>
                      <Input
                        id="email"
                        type="email"
                        value={newUser.email}
                        onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                        placeholder="user@example.com"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="name">სახელი</Label>
                      <Input
                        id="name"
                        value={newUser.name}
                        onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                        placeholder="მომხმარებლის სახელი"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="password">პაროლი</Label>
                      <Input
                        id="password"
                        type="password"
                        value={newUser.password}
                        onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                        placeholder="პაროლი"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="role">როლი</Label>
                      <Select value={newUser.role} onValueChange={(role: "USER" | "ADMIN") => setNewUser({ ...newUser, role })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="USER">მომხმარებელი</SelectItem>
                          <SelectItem value="ADMIN">ადმინისტრატორი</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                      გაუქმება
                    </Button>
                    <Button onClick={handleCreateUser}>შექმნა</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            მომხმარებლების სია ({filteredUsers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>მომხმარებელი</TableHead>
                <TableHead>როლი</TableHead>
                <TableHead>სტატუსი</TableHead>
                <TableHead>ბოლო აქტივობა</TableHead>
                <TableHead className="text-right">ქმედებები</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((u) => (
                <TableRow key={u.id} className="hover:bg-gray-50">
                  <TableCell>
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${u.email}`} />
                        <AvatarFallback className="bg-blue-100 text-blue-600">
                          {u.email.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-gray-900">{u.name || "N/A"}</p>
                        <p className="text-sm text-gray-500">{u.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getRoleVariant(u.role)} className="flex items-center gap-1 w-fit">
                      {u.role === "ADMIN" ? (
                        <Shield className="h-3 w-3" />
                      ) : (
                        <Users className="h-3 w-3" />
                      )}
                      {u.role === "ADMIN" ? "ადმინი" : "მომხმარებელი"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(!!u.isBlocked)}>
                      {u.isBlocked ? "დაბლოკილი" : "აქტიური"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {u.lastLogin ? new Date(u.lastLogin).toLocaleDateString('ka-GE') : "არასდროს"}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onClick={() => router.push(`/admin/users/${u.id}`)}>
                          <Eye className="h-4 w-4 mr-2" />
                          დეტალების ნახვა
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => {}}>
                          <Edit className="h-4 w-4 mr-2" />
                          რედაქტირება
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleRoleChange(u.id, u.role === "ADMIN" ? "USER" : "ADMIN")}
                        >
                          <Shield className="h-4 w-4 mr-2" />
                          როლის შეცვლა ({u.role === "ADMIN" ? "მომხმარებელი" : "ადმინი"})
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleResetPassword(u.id)}>
                          <Key className="h-4 w-4 mr-2" />
                          პაროლის რესეტი
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleBlockToggle(u.id, !!u.isBlocked)}>
                          {u.isBlocked ? (
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
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => handleDeleteUser(u.id)} 
                          className="text-red-600 focus:text-red-600"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          წაშლა
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {filteredUsers.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>მომხმარებლები ვერ მოიძებნა</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
