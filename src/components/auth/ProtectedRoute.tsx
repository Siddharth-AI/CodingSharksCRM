'use client';

import { useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

interface ProtectedRouteProps {
  children: ReactNode;
  redirectTo?: string;
  requireAuth?: boolean;
}

export const ProtectedRoute = ({ 
  children, 
  redirectTo = '/login',
  requireAuth = true 
}: ProtectedRouteProps) => {
  const { isAuthenticated, isLoading, restoreAuthState, isTokenExpired } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Restore auth state from localStorage on mount
    restoreAuthState();
  }, [restoreAuthState]);

  useEffect(() => {
    if (!isLoading) {
      if (requireAuth && (!isAuthenticated || isTokenExpired())) {
        router.push(redirectTo);
      } else if (!requireAuth && isAuthenticated) {
        // Redirect authenticated users away from auth pages
        router.push('/dashboard');
      }
    }
  }, [isAuthenticated, isLoading, requireAuth, router, redirectTo, isTokenExpired]);

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Don't render children if auth requirements aren't met
  if (requireAuth && (!isAuthenticated || isTokenExpired())) {
    return null;
  }

  if (!requireAuth && isAuthenticated) {
    return null;
  }

  return <>{children}</>;
};

export default ProtectedRoute;