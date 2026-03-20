import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import { AdminUser, LoginRequest, LoginResponse } from '@/types';
import { api } from '@/store/api';

interface AuthState {
  user: AdminUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  lastLoginAt: string | null;
}

const initialState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  lastLoginAt: null,
};

// Async thunk for login
export const loginAsync = createAsyncThunk(
  'auth/loginAsync',
  async (credentials: LoginRequest, { dispatch, rejectWithValue }) => {
    try {
      const result = await dispatch(api.endpoints.login.initiate(credentials));
      
      if ('error' in result) {
        return rejectWithValue(result.error);
      }
      
      return result.data;
    } catch (error) {
      return rejectWithValue('Login failed');
    }
  }
);

// Async thunk for logout
export const logoutAsync = createAsyncThunk(
  'auth/logoutAsync',
  async (_, { dispatch, rejectWithValue }) => {
    try {
      const result = await dispatch(api.endpoints.logout.initiate());
      
      if ('error' in result) {
        return rejectWithValue(result.error);
      }
      
      return result.data;
    } catch (error) {
      return rejectWithValue('Logout failed');
    }
  }
);

// Async thunk for token refresh
export const refreshTokenAsync = createAsyncThunk(
  'auth/refreshTokenAsync',
  async (_, { dispatch, rejectWithValue }) => {
    try {
      const result = await dispatch(api.endpoints.refreshToken.initiate());
      
      if ('error' in result) {
        return rejectWithValue(result.error);
      }
      
      return result.data;
    } catch (error) {
      return rejectWithValue('Token refresh failed');
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginStart: (state) => {
      state.isLoading = true;
      state.error = null;
    },
    loginSuccess: (state, action: PayloadAction<{ user: AdminUser; token: string; expiresAt?: string }>) => {
      state.isLoading = false;
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.isAuthenticated = true;
      state.error = null;
      state.lastLoginAt = new Date().toISOString();
      
      // Store token in localStorage for persistence
      if (typeof window !== 'undefined') {
        localStorage.setItem('auth_token', action.payload.token);
        localStorage.setItem('auth_user', JSON.stringify(action.payload.user));
        if (action.payload.expiresAt) {
          localStorage.setItem('auth_expires_at', action.payload.expiresAt);
        }
      }
    },
    loginFailure: (state, action: PayloadAction<string>) => {
      state.isLoading = false;
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.error = action.payload;
      
      // Clear localStorage on login failure
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        localStorage.removeItem('auth_expires_at');
      }
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.isLoading = false;
      state.error = null;
      state.lastLoginAt = null;
      
      // Clear localStorage on logout
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        localStorage.removeItem('auth_expires_at');
      }
    },
    clearError: (state) => {
      state.error = null;
    },
    updateUser: (state, action: PayloadAction<Partial<AdminUser>>) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
        
        // Update localStorage
        if (typeof window !== 'undefined') {
          localStorage.setItem('auth_user', JSON.stringify(state.user));
        }
      }
    },
    restoreAuth: (state) => {
      // Restore authentication state from localStorage
      if (typeof window !== 'undefined') {
        const token = localStorage.getItem('auth_token');
        const userStr = localStorage.getItem('auth_user');
        const expiresAtStr = localStorage.getItem('auth_expires_at');
        
        if (token && userStr) {
          try {
            const user = JSON.parse(userStr);
            const expiresAt = expiresAtStr ? new Date(expiresAtStr) : null;
            
            // Check if token is expired
            if (expiresAt && expiresAt <= new Date()) {
              // Token expired, clear storage
              localStorage.removeItem('auth_token');
              localStorage.removeItem('auth_user');
              localStorage.removeItem('auth_expires_at');
              return;
            }
            
            state.user = user;
            state.token = token;
            state.isAuthenticated = true;
          } catch (error) {
            console.error('Failed to restore auth state:', error);
            // Clear corrupted data
            localStorage.removeItem('auth_token');
            localStorage.removeItem('auth_user');
            localStorage.removeItem('auth_expires_at');
          }
        }
      }
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
  },
  extraReducers: (builder) => {
    // Handle loginAsync
    builder
      .addCase(loginAsync.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loginAsync.fulfilled, (state, action) => {
        if (action.payload.success && action.payload.user && action.payload.token) {
          state.isLoading = false;
          state.user = action.payload.user;
          state.token = action.payload.token;
          state.isAuthenticated = true;
          state.error = null;
          state.lastLoginAt = new Date().toISOString();
          
          // Store in localStorage
          if (typeof window !== 'undefined') {
            localStorage.setItem('auth_token', action.payload.token);
            localStorage.setItem('auth_user', JSON.stringify(action.payload.user));
            if (action.payload.expiresAt) {
              localStorage.setItem('auth_expires_at', action.payload.expiresAt);
            }
          }
        } else {
          state.isLoading = false;
          state.error = action.payload.error || 'Login failed';
        }
      })
      .addCase(loginAsync.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string || 'Login failed';
      });

    // Handle logoutAsync
    builder
      .addCase(logoutAsync.fulfilled, (state) => {
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
        state.isLoading = false;
        state.error = null;
        state.lastLoginAt = null;
        
        // Clear localStorage
        if (typeof window !== 'undefined') {
          localStorage.removeItem('auth_token');
          localStorage.removeItem('auth_user');
          localStorage.removeItem('auth_expires_at');
        }
      });

    // Handle refreshTokenAsync
    builder
      .addCase(refreshTokenAsync.fulfilled, (state, action) => {
        if (action.payload.success && action.payload.token) {
          state.token = action.payload.token;
          state.error = null;
          
          // Update localStorage
          if (typeof window !== 'undefined') {
            localStorage.setItem('auth_token', action.payload.token);
            if (action.payload.expiresAt) {
              localStorage.setItem('auth_expires_at', action.payload.expiresAt);
            }
          }
        }
      })
      .addCase(refreshTokenAsync.rejected, (state, action) => {
        // Token refresh failed, logout user
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
        state.error = 'Session expired';
        
        // Clear localStorage
        if (typeof window !== 'undefined') {
          localStorage.removeItem('auth_token');
          localStorage.removeItem('auth_user');
          localStorage.removeItem('auth_expires_at');
        }
      });
  },
});

export const {
  loginStart,
  loginSuccess,
  loginFailure,
  logout,
  clearError,
  updateUser,
  restoreAuth,
  setLoading,
} = authSlice.actions;

// Selectors
export const selectAuth = (state: { auth: AuthState }) => state.auth;
export const selectIsAuthenticated = (state: { auth: AuthState }) => state.auth.isAuthenticated;
export const selectCurrentUser = (state: { auth: AuthState }) => state.auth.user;
export const selectAuthToken = (state: { auth: AuthState }) => state.auth.token;
export const selectAuthError = (state: { auth: AuthState }) => state.auth.error;
export const selectAuthLoading = (state: { auth: AuthState }) => state.auth.isLoading;

export default authSlice.reducer;