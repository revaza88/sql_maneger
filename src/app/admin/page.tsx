"use client";

import { useEffect, useState } from "react";
import { adminApi, User as ApiUser } from "../../lib/api"; // Adjusted import path
import { Button } from "@/components/ui/button";
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { useAuthStore } from "@/lib/store/auth-store";
import { useRouter } from "next/navigation";
import { LoadingSpinner } from "@/components/loading-spinner"; // Corrected import

export default function AdminPage() {
  const [users, setUsers] = useState<ApiUser[]>([]); // Use aliased User type
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const { user, token, clearAuth } = useAuthStore();
  const router = useRouter();  useEffect(() => {
    if (!token || user?.role?.toLowerCase() !== "admin") {
      router.push("/admin/login");
      return;
    }

    const fetchUsers = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const fetchedUsers = await adminApi.getUsers(token, { page, search });
        setUsers(fetchedUsers);
      } catch (err) {
        setError("Failed to fetch users.");
        toast.error("Failed to fetch users.");
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsers();
  }, [token, user, router, page, search]);  const handleRoleChange = async (userId: string, role: "USER" | "ADMIN") => {
    if (!token) return;
    try {
      await adminApi.updateUserRole(userId, role, token);
      setUsers(
        users.map((u) => (u.id === userId ? { ...u, role } : u))
      );
      toast.success(`User role updated to ${role}`);
    } catch (err) {
      toast.error("Failed to update user role.");
      console.error(err);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!token) return;
    if (user?.id?.toString() === userId) { // Corrected type comparison
        toast.error("You cannot delete yourself.");
        return;
    }
    try {
      await adminApi.deleteUser(userId, token);
      setUsers(users.filter((u) => u.id !== userId));
      toast.success("User deleted successfully");
    } catch (err) {
      toast.error("Failed to delete user.");
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
      setUsers(users.map((u) => (u.id === userId ? { ...u, isBlocked: !blocked } : u)));
      toast.success(blocked ? "User unblocked" : "User blocked");
    } catch (err) {
      toast.error("Action failed");
      console.error(err);
    }
  };

  const handleResetPassword = async (userId: string) => {
    if (!token) return;
    const newPassword = prompt('Enter new password');
    if (!newPassword) return;
    try {
      await adminApi.resetPassword(userId, newPassword, token);
      toast.success('Password reset');
    } catch {
      toast.error('Failed to reset password');
    }
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
        <p>You are not authorized to view this page.</p>
        <Button onClick={() => router.push("/admin/login")} className="mt-4">
          Admin Login
        </Button>
      </div>
    );
  }
  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Admin Panel - User Management</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push('/databases')}>
            Back to Dashboard
          </Button>
          <Button variant="outline" onClick={() => router.push('/admin/dashboard')}>
            View Stats
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              clearAuth();
              router.push('/admin/login');
            }}
          >
            Admin Logout
          </Button>
        </div>
      </div>
      <div className="flex items-center gap-2 mb-4">
        <input
          type="text"
          placeholder="Search users"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="border px-2 py-1 rounded"
        />
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((u) => (
            <TableRow key={u.id}>
              <TableCell className="font-medium truncate max-w-xs">
                {u.id}
              </TableCell>
              <TableCell>{u.email}</TableCell>
              <TableCell>{u.role}</TableCell>
              <TableCell>{u.isBlocked ? 'Blocked' : 'Active'}</TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">Actions</Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem
                      onClick={() =>
                        handleRoleChange(
                          u.id,
                          u.role === "ADMIN" ? "USER" : "ADMIN"
                        )
                      }
                    >
                      Change to {u.role === "ADMIN" ? "USER" : "ADMIN"}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleBlockToggle(u.id, !!u.isBlocked)}>
                      {u.isBlocked ? 'Unblock User' : 'Block User'}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleResetPassword(u.id)}>
                      Reset Password
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleDeleteUser(u.id)} className="text-red-600">
                      Delete User
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="flex justify-between mt-4">
        <Button variant="outline" disabled={page === 1} onClick={() => setPage(page - 1)}>
          Prev
        </Button>
        <Button variant="outline" onClick={() => setPage(page + 1)}>
          Next
        </Button>
      </div>
    </div>
  );
}
