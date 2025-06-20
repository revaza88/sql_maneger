"use client";

import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/lib/store/auth-store";
import { useRouter } from "next/navigation";
import {
  Users,
  Database,
  Activity,
  BarChart3,
  Archive,
  Settings,
  LogOut,
  Home,
} from "lucide-react";

interface AdminHeaderProps {
  title: string;
  description: string;
  icon: React.ReactNode;
}

export const AdminHeader = ({ title, description, icon }: AdminHeaderProps) => {
  const { clearAuth } = useAuthStore();
  const router = useRouter();

  const handleLogout = () => {
    clearAuth();
    router.push('/admin/login');
  };

  const navigationItems = [
    { label: "მთავარი", href: "/admin", icon: <Home className="h-4 w-4" /> },
    { label: "დაშბორდი", href: "/admin/dashboard", icon: <BarChart3 className="h-4 w-4" /> },
    { label: "მომხმარებლები", href: "/admin/users", icon: <Users className="h-4 w-4" /> },
    { label: "ბაზები", href: "/admin/databases", icon: <Database className="h-4 w-4" /> },
    { label: "აქტივობა", href: "/admin/activity", icon: <Activity className="h-4 w-4" /> },
    { label: "ბექაპები", href: "/admin/backup", icon: <Archive className="h-4 w-4" /> },
    { label: "SQL Server", href: "/admin/sql-server", icon: <Settings className="h-4 w-4" /> },
  ];

  return (
    <div className="bg-white border-b border-gray-200 shadow-sm">
      <div className="container mx-auto px-6 py-4">
        {/* Main Header */}
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              {icon}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
              <p className="text-gray-600 text-sm">{description}</p>
            </div>
          </div>
          
          <Button 
            variant="outline" 
            onClick={handleLogout}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <LogOut className="h-4 w-4 mr-2" />
            გამოსვლა
          </Button>
        </div>

        {/* Navigation */}
        <div className="flex flex-wrap gap-2">
          {navigationItems.map((item) => (
            <Button
              key={item.href}
              variant="ghost"
              size="sm"
              onClick={() => router.push(item.href)}
              className="text-gray-600 hover:text-blue-600 hover:bg-blue-50"
            >
              {item.icon}
              <span className="ml-2">{item.label}</span>
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
};
