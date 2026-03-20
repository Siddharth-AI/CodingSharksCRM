import { AxiosResponse } from 'axios';
import { apiClient } from '@/lib/axios';
import { ApiResponse, PaginatedResponse, PaginationState } from '@/types';

/**
 * Base service class providing common API operations
 * All service classes should extend this base class
 */
export abstract class BaseService {
  protected baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  /**
   * Handle API response and extract data
   */
  protected handleResponse<T>(response: AxiosResponse<ApiResponse<T>>): T {
    if (!response.data.success) {
      throw new Error(response.data.error || 'API request failed');
    }
    return response.data.data as T;
  }

  /**
   * Handle paginated API response
   */
  protected handlePaginatedResponse<T>(
    response: AxiosResponse<ApiResponse<PaginatedResponse<T>>>
  ): PaginatedResponse<T> {
    if (!response.data.success) {
      throw new Error(response.data.error || 'API request failed');
    }
    return response.data.data as PaginatedResponse<T>;
  }

  /**
   * Generic GET request
   */
  protected async get<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
    const response = await apiClient.get<ApiResponse<T>>(`${this.baseUrl}${endpoint}`, {
      params,
    });
    return this.handleResponse(response);
  }

  /**
   * Generic POST request
   */
  protected async post<T>(endpoint: string, data?: any): Promise<T> {
    const response = await apiClient.post<ApiResponse<T>>(`${this.baseUrl}${endpoint}`, data);
    return this.handleResponse(response);
  }

  /**
   * Generic PUT request
   */
  protected async put<T>(endpoint: string, data?: any): Promise<T> {
    const response = await apiClient.put<ApiResponse<T>>(`${this.baseUrl}${endpoint}`, data);
    return this.handleResponse(response);
  }

  /**
   * Generic PATCH request
   */
  protected async patch<T>(endpoint: string, data?: any): Promise<T> {
    const response = await apiClient.patch<ApiResponse<T>>(`${this.baseUrl}${endpoint}`, data);
    return this.handleResponse(response);
  }

  /**
   * Generic DELETE request
   */
  protected async delete<T>(endpoint: string): Promise<T> {
    const response = await apiClient.delete<ApiResponse<T>>(`${this.baseUrl}${endpoint}`);
    return this.handleResponse(response);
  }

  /**
   * Generic paginated GET request
   */
  protected async getPaginated<T>(
    endpoint: string,
    params?: Record<string, any>
  ): Promise<PaginatedResponse<T>> {
    const response = await apiClient.get<ApiResponse<PaginatedResponse<T>>>(
      `${this.baseUrl}${endpoint}`,
      { params }
    );
    return this.handlePaginatedResponse(response);
  }

  /**
   * Build query parameters for filtering and pagination
   */
  protected buildQueryParams(
    filters?: Record<string, any>,
    pagination?: Partial<PaginationState>
  ): Record<string, any> {
    const params: Record<string, any> = {};

    // Add filters
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params[key] = value;
        }
      });
    }

    // Add pagination
    if (pagination) {
      if (pagination.page) params.page = pagination.page;
      if (pagination.limit) params.limit = pagination.limit;
    }

    return params;
  }

  /**
   * Format date for API requests
   */
  protected formatDate(date: Date | string): string {
    return typeof date === 'string' ? date : date.toISOString();
  }

  /**
   * Parse date from API response
   */
  protected parseDate(dateString: string): Date {
    return new Date(dateString);
  }
}

/**
 * Error handling utilities for services
 */
export class ServiceError extends Error {
  public code: string;
  public statusCode: number;
  public details?: Record<string, any>;

  constructor(
    message: string,
    code: string = 'SERVICE_ERROR',
    statusCode: number = 500,
    details?: Record<string, any>
  ) {
    super(message);
    this.name = 'ServiceError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

/**
 * Service response wrapper for consistent error handling
 */
export interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: ServiceError;
}

/**
 * Wrap service calls with error handling
 */
export async function withErrorHandling<T>(
  operation: () => Promise<T>
): Promise<ServiceResponse<T>> {
  try {
    const data = await operation();
    return { success: true, data };
  } catch (error: any) {
    const serviceError = error instanceof ServiceError 
      ? error 
      : new ServiceError(
          error.message || 'Unknown error occurred',
          error.code || 'UNKNOWN_ERROR',
          error.statusCode || 500,
          error.details
        );
    
    return { success: false, error: serviceError };
  }
}