'use client';

import { useEffect, ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const { 
    restoreAuthState, 
    checkAndRefreshToken, 
    isAuthenticated,
    logout 
  } = useAuth();

  useEffect(() => {
    // Restore authentication state from localStorage on app start
    restoreAuthState();
  }, [restoreAuthState]);

  useEffect(() => {
    if (!isAuthenticated) return;

    // Set up interval to check and refresh token
    const interval = setInterval(() => {
      checkAndRefreshToken().catch((error) => {
        console.error('Token refresh failed:', error);
        // If refresh fails, logout the user
        logout();
      });
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [isAuthenticated, checkAndRefreshToken, logout]);

  useEffect(() => {
    if (!isAuthenticated) return;

    // Handle page visibility change to refresh token when user returns
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkAndRefreshToken().catch((error) => {
          console.error('Token refresh on visibility change failed:', error);
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isAuthenticated, checkAndRefreshToken]);

  useEffect(() => {
    if (!isAuthenticated) return;

    // Handle storage events (e.g., logout from another tab)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'auth_token' && !e.newValue) {
        // Token was removed from another tab, logout this tab too
        logout();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [isAuthenticated, logout]);

  return <>{children}</>;
};

export default AuthProvider;