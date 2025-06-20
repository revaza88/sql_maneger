import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/store/auth-store';
import { useRouter } from 'next/navigation';
import { LoadingSpinner } from '@/components/loading-spinner';

interface AuthWrapperProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  requireAdmin?: boolean;
  redirectTo?: string;
}

export const AuthWrapper = ({ 
  children, 
  requireAuth = false, 
  requireAdmin = false, 
  redirectTo = '/admin/login' 
}: AuthWrapperProps) => {
  const { user, token, isHydrated } = useAuthStore();
  const router = useRouter();
  const [shouldRedirect, setShouldRedirect] = useState(false);
  useEffect(() => {
    if (!isHydrated) return; // Wait for hydration

    // Check auth requirements after hydration
    if (requireAuth && !token) {
      console.log('No token found, redirecting to login');
      setShouldRedirect(true);
      router.push(redirectTo);
      return;
    }

    if (requireAdmin && user?.role?.toLowerCase() !== 'admin') {
      console.log('User is not admin, redirecting');
      setShouldRedirect(true);
      router.push(redirectTo);
      return;
    }

    setShouldRedirect(false);
  }, [isHydrated, token, user, requireAuth, requireAdmin, router, redirectTo]);

  // Show loading while hydrating
  if (!isHydrated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  // Show loading while redirecting
  if (shouldRedirect) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  // Check auth after hydration is complete
  if (requireAuth && !token) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  if (requireAdmin && user?.role?.toLowerCase() !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  return <>{children}</>;
};
