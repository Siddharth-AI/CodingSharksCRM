import { AxiosError } from 'axios';
import { ApiError, ValidationError } from '@/types';

/**
 * API Error Handler utility class
 */
export class ApiErrorHandler {
  /**
   * Transform Axios error to standardized ApiError
   */
  static handleAxiosError(error: AxiosError): ApiError {
    if (error.response) {
      // Server responded with error status
      const responseData = error.response.data as any;
      
      return {
        message: responseData?.message || this.getDefaultErrorMessage(error.response.status),
        code: responseData?.code || this.getErrorCodeFromStatus(error.response.status),
        statusCode: error.response.status,
        details: responseData?.details || {
          url: error.config?.url,
          method: error.config?.method?.toUpperCase(),
          timestamp: new Date().toISOString(),
        },
      };
    } else if (error.request) {
      // Network error - no response received
      return {
        message: 'Network error. Please check your internet connection and try again.',
        code: 'NETWORK_ERROR',
        statusCode: 0,
        details: {
          url: error.config?.url,
          method: error.config?.method?.toUpperCase(),
          timeout: error.code === 'ECONNABORTED',
        },
      };
    } else {
      // Request setup error
      return {
        message: 'Request configuration error. Please try again.',
        code: 'REQUEST_SETUP_ERROR',
        statusCode: 0,
        details: {
          originalMessage: error.message,
        },
      };
    }
  }

  /**
   * Get default error message based on HTTP status code
   */
  private static getDefaultErrorMessage(statusCode: number): string {
    switch (statusCode) {
      case 400:
        return 'Invalid request. Please check your input and try again.';
      case 401:
        return 'Authentication required. Please log in and try again.';
      case 403:
        return 'Access denied. You do not have permission to perform this action.';
      case 404:
        return 'The requested resource was not found.';
      case 409:
        return 'Conflict. The resource already exists or is in use.';
      case 422:
        return 'Validation failed. Please check your input.';
      case 429:
        return 'Too many requests. Please wait a moment and try again.';
      case 500:
        return 'Internal server error. Please try again later.';
      case 502:
        return 'Bad gateway. The server is temporarily unavailable.';
      case 503:
        return 'Service unavailable. Please try again later.';
      case 504:
        return 'Gateway timeout. The request took too long to process.';
      default:
        return 'An unexpected error occurred. Please try again.';
    }
  }

  /**
   * Get error code based on HTTP status
   */
  private static getErrorCodeFromStatus(statusCode: number): string {
    switch (statusCode) {
      case 400:
        return 'BAD_REQUEST';
      case 401:
        return 'UNAUTHORIZED';
      case 403:
        return 'FORBIDDEN';
      case 404:
        return 'NOT_FOUND';
      case 409:
        return 'CONFLICT';
      case 422:
        return 'VALIDATION_ERROR';
      case 429:
        return 'RATE_LIMITED';
      case 500:
        return 'INTERNAL_SERVER_ERROR';
      case 502:
        return 'BAD_GATEWAY';
      case 503:
        return 'SERVICE_UNAVAILABLE';
      case 504:
        return 'GATEWAY_TIMEOUT';
      default:
        return 'UNKNOWN_ERROR';
    }
  }

  /**
   * Check if error is retryable
   */
  static isRetryableError(error: ApiError): boolean {
    const retryableCodes = [
      'NETWORK_ERROR',
      'GATEWAY_TIMEOUT',
      'SERVICE_UNAVAILABLE',
      'BAD_GATEWAY',
      'INTERNAL_SERVER_ERROR',
    ];
    
    const retryableStatusCodes = [408, 429, 500, 502, 503, 504];
    
    return (
      retryableCodes.includes(error.code) ||
      retryableStatusCodes.includes(error.statusCode)
    );
  }

  /**
   * Get user-friendly error message
   */
  static getUserFriendlyMessage(error: ApiError): string {
    // Map technical errors to user-friendly messages
    const friendlyMessages: Record<string, string> = {
      NETWORK_ERROR: 'Connection problem. Please check your internet and try again.',
      UNAUTHORIZED: 'Your session has expired. Please log in again.',
      FORBIDDEN: 'You don\'t have permission to do this.',
      NOT_FOUND: 'The item you\'re looking for doesn\'t exist.',
      VALIDATION_ERROR: 'Please check your input and try again.',
      RATE_LIMITED: 'You\'re doing that too often. Please wait a moment.',
      INTERNAL_SERVER_ERROR: 'Something went wrong on our end. Please try again.',
      SERVICE_UNAVAILABLE: 'The service is temporarily unavailable. Please try again later.',
    };

    return friendlyMessages[error.code] || error.message;
  }

  /**
   * Extract validation errors from API response
   */
  static extractValidationErrors(error: ApiError): ValidationError[] {
    if (error.code !== 'VALIDATION_ERROR' || !error.details?.errors) {
      return [];
    }

    const errors = error.details.errors;
    
    if (Array.isArray(errors)) {
      return errors.map((err: any) => ({
        field: err.field || err.path || 'unknown',
        message: err.message || 'Invalid value',
        value: err.value,
      }));
    }

    // Handle object-based validation errors
    if (typeof errors === 'object') {
      return Object.entries(errors).map(([field, message]) => ({
        field,
        message: Array.isArray(message) ? message[0] : String(message),
        value: undefined,
      }));
    }

    return [];
  }

  /**
   * Format validation errors for display
   */
  static formatValidationErrors(errors: ValidationError[]): string {
    if (errors.length === 0) {
      return 'Validation failed';
    }

    if (errors.length === 1) {
      return errors[0].message;
    }

    return `Please fix the following errors:\n${errors.map(e => `• ${e.message}`).join('\n')}`;
  }

  /**
   * Log error for debugging/monitoring
   */
  static logError(error: ApiError, context?: Record<string, any>): void {
    const logData = {
      error: {
        message: error.message,
        code: error.code,
        statusCode: error.statusCode,
        details: error.details,
      },
      context,
      timestamp: new Date().toISOString(),
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'server',
      url: typeof window !== 'undefined' ? window.location.href : 'server',
    };

    // In development, log to console
    if (process.env.NODE_ENV === 'development') {
      console.error('API Error:', logData);
    }

    // In production, send to monitoring service
    // Example: sendToMonitoringService(logData);
  }

  /**
   * Create error notification data
   */
  static createNotification(error: ApiError): {
    type: 'error' | 'warning';
    title: string;
    message: string;
    duration?: number;
  } {
    const isWarning = ['RATE_LIMITED', 'VALIDATION_ERROR'].includes(error.code);
    
    return {
      type: isWarning ? 'warning' : 'error',
      title: isWarning ? 'Please Check' : 'Error',
      message: this.getUserFriendlyMessage(error),
      duration: isWarning ? 5000 : 8000,
    };
  }
}

/**
 * Error boundary helper for React components
 */
export class ComponentErrorHandler {
  /**
   * Handle component errors and create fallback UI data
   */
  static handleComponentError(error: Error, errorInfo?: any): {
    title: string;
    message: string;
    canRetry: boolean;
    errorId: string;
  } {
    const errorId = `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Log error for debugging
    console.error('Component Error:', { error, errorInfo, errorId });
    
    return {
      title: 'Something went wrong',
      message: 'We encountered an unexpected error. Please try refreshing the page.',
      canRetry: true,
      errorId,
    };
  }
}

/**
 * Service-specific error handlers
 */
export class ServiceErrorHandlers {
  /**
   * Handle lead service errors
   */
  static handleLeadError(error: ApiError): string {
    switch (error.code) {
      case 'DUPLICATE_MOBILE':
        return 'A lead with this mobile number already exists. You can still create another lead with the same number if needed.';
      case 'INVALID_MOBILE_FORMAT':
        return 'Please enter a valid mobile number (10 digits).';
      case 'INVALID_EMAIL_FORMAT':
        return 'Please enter a valid email address.';
      case 'LEAD_NOT_FOUND':
        return 'The lead you\'re looking for doesn\'t exist or has been deleted.';
      default:
        return ApiErrorHandler.getUserFriendlyMessage(error);
    }
  }

  /**
   * Handle course service errors
   */
  static handleCourseError(error: ApiError): string {
    switch (error.code) {
      case 'COURSE_NAME_EXISTS':
        return 'A course with this name already exists. Please choose a different name.';
      case 'COURSE_HAS_LEADS':
        return 'Cannot delete this course because it has associated leads. Please reassign the leads first.';
      case 'INVALID_PRICE':
        return 'Please enter a valid price (must be greater than 0).';
      default:
        return ApiErrorHandler.getUserFriendlyMessage(error);
    }
  }

  /**
   * Handle message service errors
   */
  static handleMessageError(error: ApiError): string {
    switch (error.code) {
      case 'WHATSAPP_API_ERROR':
        return 'Failed to send WhatsApp message. We\'ll retry automatically.';
      case 'INVALID_PHONE_NUMBER':
        return 'The phone number is not valid for WhatsApp messaging.';
      case 'MESSAGE_QUOTA_EXCEEDED':
        return 'Daily message limit reached. Please try again tomorrow.';
      case 'TEMPLATE_NOT_FOUND':
        return 'The message template doesn\'t exist or has been deleted.';
      default:
        return ApiErrorHandler.getUserFriendlyMessage(error);
    }
  }

  /**
   * Handle template service errors
   */
  static handleTemplateError(error: ApiError): string {
    switch (error.code) {
      case 'TEMPLATE_NAME_EXISTS':
        return 'A template with this name already exists for this course.';
      case 'INVALID_TEMPLATE_VARIABLES':
        return 'The template contains invalid variables. Please check the variable syntax.';
      case 'TEMPLATE_IN_USE':
        return 'Cannot delete this template because it\'s being used by scheduled messages.';
      default:
        return ApiErrorHandler.getUserFriendlyMessage(error);
    }
  }
}

/**
 * Global error handler setup
 */
export function setupGlobalErrorHandling(): void {
  // Handle unhandled promise rejections
  if (typeof window !== 'undefined') {
    window.addEventListener('unhandledrejection', (event) => {
      console.error('Unhandled promise rejection:', event.reason);
      
      // Prevent the default browser behavior
      event.preventDefault();
      
      // You can dispatch a global error action here
      // store.dispatch(showErrorNotification('An unexpected error occurred'));
    });

    // Handle global errors
    window.addEventListener('error', (event) => {
      console.error('Global error:', event.error);
      
      // You can dispatch a global error action here
      // store.dispatch(showErrorNotification('An unexpected error occurred'));
    });
  }
}

// Export error message constants
export const ERROR_MESSAGES = {
  NETWORK: 'Connection problem. Please check your internet and try again.',
  UNAUTHORIZED: 'Your session has expired. Please log in again.',
  FORBIDDEN: 'You don\'t have permission to do this.',
  NOT_FOUND: 'The item you\'re looking for doesn\'t exist.',
  VALIDATION: 'Please check your input and try again.',
  RATE_LIMITED: 'You\'re doing that too often. Please wait a moment.',
  SERVER_ERROR: 'Something went wrong on our end. Please try again.',
  SERVICE_UNAVAILABLE: 'The service is temporarily unavailable. Please try again later.',
  UNKNOWN: 'An unexpected error occurred. Please try again.',
} as const;

/**
 * Helper function to handle API errors in route handlers
 * Returns a NextResponse with appropriate error status and message
 */
export function handleApiError(error: unknown, defaultMessage: string = 'An error occurred') {
  const { NextResponse } = require('next/server');
  
  console.error('API Error:', error);
  
  // Handle known error types
  if (error instanceof Error) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || defaultMessage,
      },
      { status: 500 }
    );
  }
  
  // Handle unknown errors
  return NextResponse.json(
    {
      success: false,
      error: defaultMessage,
    },
    { status: 500 }
  );
}