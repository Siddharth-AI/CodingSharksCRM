// Extend AxiosRequestConfig to include metadata and retry information
declare module 'axios' {
  interface InternalAxiosRequestConfig {
    metadata?: {
      startTime: Date;
      retryCount?: number;
      skipRetry?: boolean;
    };
  }
}

import axios, { AxiosInstance, AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { ApiError } from '@/types';

// Configuration constants
const DEFAULT_TIMEOUT = 10000;
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;
const RETRY_STATUS_CODES = [408, 429, 500, 502, 503, 504];

// Create axios instance with base configuration
const apiClient: AxiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || '/api',
  timeout: DEFAULT_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Token management utilities
const getAuthToken = (): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('auth_token');
  }
  return null;
};

const getRefreshToken = (): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('refresh_token');
  }
  return null;
};

const setAuthToken = (token: string): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('auth_token', token);
  }
};

const setRefreshToken = (token: string): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('refresh_token', token);
  }
};

const removeAuthTokens = (): void => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('refresh_token');
  }
};

// Token refresh functionality
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: any) => void;
  reject: (error: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve(token);
    }
  });
  
  failedQueue = [];
};

const refreshAuthToken = async (): Promise<string | null> => {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    return null;
  }

  try {
    const response = await axios.post('/api/auth/refresh', {
      refreshToken,
    });

    const { token, refreshToken: newRefreshToken } = response.data;
    setAuthToken(token);
    if (newRefreshToken) {
      setRefreshToken(newRefreshToken);
    }

    return token;
  } catch (error) {
    removeAuthTokens();
    return null;
  }
};


// Request interceptor for authentication and request metadata
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Add request metadata for debugging and retry logic
    config.metadata = { 
      startTime: new Date(),
      retryCount: config.metadata?.retryCount || 0,
      skipRetry: config.metadata?.skipRetry || false,
    };
    
    // Add request ID for tracing
    config.headers['X-Request-ID'] = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return config;
  },
  (error: AxiosError) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling and token refresh
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig;
    
    // Handle authentication errors with token refresh
    if (error.response?.status === 401 && originalRequest && !originalRequest.metadata?.skipRetry) {
      if (isRefreshing) {
        // If already refreshing, queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${token}`;
          }
          return apiClient(originalRequest);
        }).catch(err => {
          return Promise.reject(err);
        });
      }

      isRefreshing = true;

      try {
        const newToken = await refreshAuthToken();
        if (newToken && originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          processQueue(null, newToken);
          return apiClient(originalRequest);
        } else {
          processQueue(error, null);
          removeAuthTokens();
          
          // Only redirect if we're in the browser
          if (typeof window !== 'undefined') {
            window.location.href = '/login';
          }
        }
      } catch (refreshError) {
        processQueue(refreshError, null);
        removeAuthTokens();
        
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
      } finally {
        isRefreshing = false;
      }
    }
    
    // Handle retryable errors
    if (shouldRetry(error) && originalRequest) {
      const retryCount = originalRequest.metadata?.retryCount || 0;
      
      if (retryCount < MAX_RETRIES) {
        originalRequest.metadata = {
          ...originalRequest.metadata,
          startTime: originalRequest.metadata?.startTime || new Date(),
          retryCount: retryCount + 1,
        };
        
        // Exponential backoff delay
        const delay = RETRY_DELAY * Math.pow(2, retryCount);
        await new Promise(resolve => setTimeout(resolve, delay));
        
        console.log(`Retrying request to ${originalRequest.url} (attempt ${retryCount + 1}/${MAX_RETRIES})`);
        return apiClient(originalRequest);
      }
    }
    
    // Handle server errors
    if (error.response?.status && error.response.status >= 500) {
      console.error('Server error occurred:', error);
      
      // You can dispatch a global notification here
      // store.dispatch(uiSlice.actions.showNotification({
      //   type: 'error',
      //   message: 'Server error occurred. Please try again.',
      // }));
    }
    
    // Transform error to our ApiError format
    const apiError: ApiError = {
      message: (error.response?.data as any)?.message || error.message || 'An error occurred',
      code: (error.response?.data as any)?.code || 'UNKNOWN_ERROR',
      statusCode: error.response?.status || 0,
      details: (error.response?.data as any)?.details,
    };

    return Promise.reject(apiError);
  }
);

// Helper function to determine if request should be retried
const shouldRetry = (error: AxiosError): boolean => {
  if (!error.response) {
    // Network errors should be retried
    return true;
  }
  
  const status = error.response.status;
  return RETRY_STATUS_CODES.includes(status);
};

// Enhanced retry logic for failed requests
const retryRequest = async (
  originalRequest: InternalAxiosRequestConfig,
  maxRetries: number = MAX_RETRIES,
  delay: number = RETRY_DELAY
): Promise<AxiosResponse> => {
  let retries = 0;
  
  while (retries < maxRetries) {
    try {
      // Update retry count in metadata
      originalRequest.metadata = {
        ...originalRequest.metadata,
        startTime: originalRequest.metadata?.startTime || new Date(),
        retryCount: retries,
      };
      
      return await apiClient(originalRequest);
    } catch (error) {
      retries++;
      
      if (retries === maxRetries || !shouldRetry(error as AxiosError)) {
        throw error;
      }
      
      // Exponential backoff with jitter
      const jitter = Math.random() * 0.1 * delay;
      const backoffDelay = delay * Math.pow(2, retries - 1) + jitter;
      
      console.log(`Retry ${retries}/${maxRetries} for ${originalRequest.url} in ${backoffDelay}ms`);
      await new Promise(resolve => setTimeout(resolve, backoffDelay));
    }
  }
  
  throw new Error('Max retries exceeded');
};

// Request timeout handler
const createTimeoutHandler = (timeout: number = DEFAULT_TIMEOUT) => {
  return (config: InternalAxiosRequestConfig) => {
    config.timeout = timeout;
    return config;
  };
};

// Request rate limiting (simple implementation)
class RateLimiter {
  private requests: number[] = [];
  private maxRequests: number;
  private windowMs: number;

  constructor(maxRequests: number = 100, windowMs: number = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  async checkLimit(): Promise<void> {
    const now = Date.now();
    
    // Remove old requests outside the window
    this.requests = this.requests.filter(time => now - time < this.windowMs);
    
    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = Math.min(...this.requests);
      const waitTime = this.windowMs - (now - oldestRequest);
      
      if (waitTime > 0) {
        console.log(`Rate limit exceeded. Waiting ${waitTime}ms`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
    
    this.requests.push(now);
  }
}

const rateLimiter = new RateLimiter();

// Add rate limiting to request interceptor
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    // Apply rate limiting
    await rateLimiter.checkLimit();
    return config;
  }
);

// Export utilities and enhanced client
export { 
  apiClient, 
  setAuthToken, 
  setRefreshToken,
  removeAuthTokens, 
  getAuthToken, 
  getRefreshToken,
  retryRequest,
  refreshAuthToken,
  createTimeoutHandler,
  RateLimiter,
  // Legacy exports for backward compatibility
  removeAuthTokens as removeAuthToken
};

export default apiClient;