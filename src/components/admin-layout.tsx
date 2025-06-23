"use client";

import { AuthWrapper } from "@/components/auth-wrapper";
import { AdminHeader } from "@/components/admin-header";
import { TokenRefreshProvider } from "@/components/token-refresh-provider";

interface AdminLayoutProps {
  children: React.ReactNode;
  title: string;
  description: string;
  icon: React.ReactNode;
}

export const AdminLayout = ({ children, title, description, icon }: AdminLayoutProps) => {
  return (
    <AuthWrapper requireAuth requireAdmin>
      <TokenRefreshProvider>
        <div className="min-h-screen bg-gray-50">
          <AdminHeader 
            title={title} 
            description={description} 
            icon={icon} 
          />
          <div className="container mx-auto px-6 py-6">
            {children}
          </div>
        </div>
      </TokenRefreshProvider>
    </AuthWrapper>
  );
};
