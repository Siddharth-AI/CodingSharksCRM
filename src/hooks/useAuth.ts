import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from './redux';
import { 
  loginAsync, 
  logoutAsync, 
  refreshTokenAsync,
  logout,
  restoreAuth,
  clearError,
  selectAuth,
  selectIsAuthenticated,
  selectCurrentUser,
  selectAuthToken,
  selectAuthError,
  selectAuthLoading
} from '@/store/slices/authSlice';
import { 
  useLoginMutation,
  useLogoutMutation,
  useVerifyTokenQuery,
  useRefreshTokenMutation,
  useGetProfileQuery
} from '@/store/api';
import { LoginRequest } from '@/types';

export const useAuth = () => {
  const dispatch = useAppDispatch();
  
  // Selectors
  const auth = useAppSelector(selectAuth);
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const user = useAppSelector(selectCurrentUser);
  const token = useAppSelector(selectAuthToken);
  const error = useAppSelector(selectAuthError);
  const isLoading = useAppSelector(selectAuthLoading);

  // RTK Query hooks
  const [loginMutation] = useLoginMutation();
  const [logoutMutation] = useLogoutMutation();
  const [refreshTokenMutation] = useRefreshTokenMutation();
  
  // Conditional queries (only run when authenticated)
  const { 
    data: profileData, 
    isLoading: isProfileLoading,
    refetch: refetchProfile 
  } = useGetProfileQuery(undefined, {
    skip: !isAuthenticated
  });

  const { 
    data: tokenVerification,
    isLoading: isVerifyingToken,
    refetch: verifyToken
  } = useVerifyTokenQuery(undefined, {
    skip: !token
  });

  // Actions
  const login = useCallback(async (credentials: LoginRequest) => {
    return dispatch(loginAsync(credentials));
  }, [dispatch]);

  const logoutUser = useCallback(async () => {
    try {
      await dispatch(logoutAsync());
    } catch (error) {
      // Even if logout API fails, clear local state
      dispatch(logout());
    }
  }, [dispatch]);

  const refreshToken = useCallback(async () => {
    return dispatch(refreshTokenAsync());
  }, [dispatch]);

  const restoreAuthState = useCallback(() => {
    dispatch(restoreAuth());
  }, [dispatch]);

  const clearAuthError = useCallback(() => {
    dispatch(clearError());
  }, [dispatch]);

  // Check if token is expired
  const isTokenExpired = useCallback(() => {
    if (typeof window === 'undefined') return false;
    
    const expiresAtStr = localStorage.getItem('auth_expires_at');
    if (!expiresAtStr) return false;
    
    try {
      const expiresAt = new Date(expiresAtStr);
      return expiresAt <= new Date();
    } catch {
      return true;
    }
  }, []);

  // Auto-refresh token if it's about to expire
  const checkAndRefreshToken = useCallback(async () => {
    if (!token || !isAuthenticated) return;
    
    if (typeof window === 'undefined') return;
    
    const expiresAtStr = localStorage.getItem('auth_expires_at');
    if (!expiresAtStr) return;
    
    try {
      const expiresAt = new Date(expiresAtStr);
      const now = new Date();
      const timeUntilExpiry = expiresAt.getTime() - now.getTime();
      
      // Refresh if token expires in less than 5 minutes
      if (timeUntilExpiry < 5 * 60 * 1000 && timeUntilExpiry > 0) {
        await refreshToken();
      }
    } catch (error) {
      console.error('Error checking token expiry:', error);
    }
  }, [token, isAuthenticated, refreshToken]);

  return {
    // State
    auth,
    user,
    token,
    isAuthenticated,
    isLoading: isLoading || isProfileLoading || isVerifyingToken,
    error,
    
    // Profile data
    profile: profileData?.data,
    
    // Actions
    login,
    logout: logoutUser,
    refreshToken,
    restoreAuthState,
    clearError: clearAuthError,
    
    // Utilities
    isTokenExpired,
    checkAndRefreshToken,
    refetchProfile,
    verifyToken,
    
    // Raw mutations (for advanced usage)
    loginMutation,
    logoutMutation,
    refreshTokenMutation,
  };
};

export default useAuth;