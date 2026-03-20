import { AxiosError } from 'axios';
import Joi from 'joi';
import { NextApiResponse } from 'next';
import { ApiError as ApiErrorType, ValidationError } from '@/types';
import { ApiErrorHandler as NewApiErrorHandler } from './apiErrorHandling';

/**
 * Custom API Error class
 */
export class ApiError extends Error {
  public statusCode: number;
  public code: string;
  public details?: Record<string, any> | undefined;

  constructor(message: string, code: string, statusCode: number, details?: Record<string, any> | undefined) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

/**
 * API Error Handler (Legacy - use ApiErrorHandler from apiErrorHandling.ts for new code)
 * @deprecated Use ApiErrorHandler from './apiErrorHandling' instead
 */
export class ApiErrorHandler {
  static handleError(error: AxiosError): ApiErrorType {
    // Delegate to the new error handler
    return NewApiErrorHandler.handleAxiosError(error);
  }

  static getErrorMessage(error: ApiErrorType): string {
    // Delegate to the new error handler
    return NewApiErrorHandler.getUserFriendlyMessage(error);
  }
}

/**
 * Validation Error Handler
 */
export class ValidationErrorHandler {
  static formatJoiError(error: Joi.ValidationError): ValidationError[] {
    return error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message.replace(/"/g, ''),
      value: detail.context?.value,
    }));
  }

  static createUserFriendlyMessage(errors: ValidationError[]): string {
    if (errors.length === 1) {
      return errors[0].message;
    }
    
    return `Please fix the following errors: ${errors.map(e => e.message).join(', ')}`;
  }

  static getFieldError(errors: ValidationError[], fieldName: string): string | undefined {
    const error = errors.find(e => e.field === fieldName);
    return error?.message;
  }
}

/**
 * Database Error Handler
 */
export class DatabaseErrorHandler {
  static handleSupabaseError(error: any): ApiErrorType {
    if (error.code === '23505') {
      // Unique constraint violation
      return {
        message: 'A record with this information already exists',
        code: 'DUPLICATE_RECORD',
        statusCode: 409,
      };
    }
    
    if (error.code === '23503') {
      // Foreign key constraint violation
      return {
        message: 'Cannot delete record due to existing references',
        code: 'REFERENCE_EXISTS',
        statusCode: 409,
      };
    }

    if (error.code === '23502') {
      // Not null violation
      return {
        message: 'Required field is missing',
        code: 'VALIDATION_ERROR',
        statusCode: 400,
      };
    }

    if (error.code === '42P01') {
      // Table does not exist
      return {
        message: 'Database table not found',
        code: 'DATABASE_ERROR',
        statusCode: 500,
      };
    }
    
    return {
      message: 'Database operation failed',
      code: 'DATABASE_ERROR',
      statusCode: 500,
      details: { originalError: error.message },
    };
  }
}

/**
 * WhatsApp Error Handler
 */
export class WhatsAppErrorHandler {
  static handleWhatsAppError(error: any): ApiErrorType {
    if (error.response?.data?.error) {
      const whatsappError = error.response.data.error;
      
      switch (whatsappError.code) {
        case 100:
          return {
            message: 'Invalid WhatsApp number format',
            code: 'INVALID_WHATSAPP_NUMBER',
            statusCode: 400,
          };
        case 131026:
          return {
            message: 'Message template not found',
            code: 'TEMPLATE_NOT_FOUND',
            statusCode: 404,
          };
        case 80007:
          return {
            message: 'Rate limit exceeded. Please wait before sending more messages.',
            code: 'RATE_LIMITED',
            statusCode: 429,
          };
        case 131047:
          return {
            message: 'Re-engagement message required',
            code: 'RE_ENGAGEMENT_REQUIRED',
            statusCode: 400,
          };
        default:
          return {
            message: whatsappError.message || 'WhatsApp API error',
            code: 'WHATSAPP_ERROR',
            statusCode: error.response.status || 500,
          };
      }
    }
    
    return {
      message: 'Failed to send WhatsApp message',
      code: 'WHATSAPP_ERROR',
      statusCode: 500,
    };
  }
}

/**
 * Error Messages
 */
export const ErrorMessages = {
  VALIDATION: {
    REQUIRED_FIELD: (field: string) => `${field} is required`,
    INVALID_EMAIL: 'Please enter a valid email address',
    INVALID_MOBILE: 'Please enter a valid mobile number',
    MIN_LENGTH: (field: string, min: number) => 
      `${field} must be at least ${min} characters`,
    MAX_LENGTH: (field: string, max: number) => 
      `${field} cannot exceed ${max} characters`,
    INVALID_FORMAT: (field: string) => `${field} format is invalid`,
  },
  
  API: {
    NETWORK_ERROR: 'Unable to connect. Please check your internet connection.',
    SERVER_ERROR: 'Something went wrong on our end. Please try again.',
    UNAUTHORIZED: 'Your session has expired. Please log in again.',
    FORBIDDEN: 'You do not have permission to perform this action.',
    NOT_FOUND: 'The requested resource was not found.',
    TIMEOUT: 'Request timed out. Please try again.',
  },
  
  WHATSAPP: {
    SEND_FAILED: 'Failed to send WhatsApp message. We will retry automatically.',
    INVALID_NUMBER: 'Invalid WhatsApp number format',
    RATE_LIMITED: 'Too many messages sent. Please wait before sending more.',
    TEMPLATE_NOT_FOUND: 'Message template not found',
    RE_ENGAGEMENT_REQUIRED: 'Re-engagement message required for this contact',
  },
  
  DATABASE: {
    CONNECTION_FAILED: 'Database connection failed. Please try again.',
    DUPLICATE_RECORD: 'A record with this information already exists.',
    REFERENCE_EXISTS: 'Cannot delete this item as it is being used elsewhere.',
    OPERATION_FAILED: 'Database operation failed. Please try again.',
  },

  AUTH: {
    INVALID_CREDENTIALS: 'Invalid email or password',
    SESSION_EXPIRED: 'Your session has expired. Please log in again.',
    ACCESS_DENIED: 'Access denied. Please contact administrator.',
  },
};

/**
 * Global error logger
 */
export const errorLogger = {
  logError: (error: Error, context?: Record<string, any>) => {
    console.error('Error logged:', {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      context,
    });
    
    // In production, send to monitoring service
    if (process.env.NODE_ENV === 'production') {
      // Send to monitoring service like Sentry, LogRocket, etc.
    }
  },
  
  logApiError: (error: ApiErrorType, context?: Record<string, any>) => {
    console.error('API Error logged:', {
      ...error,
      timestamp: new Date().toISOString(),
      context,
    });
    
    // In production, send to monitoring service
    if (process.env.NODE_ENV === 'production') {
      // Send to monitoring service
    }
  },
};

/**
 * Retry utility for failed operations
 */
export const retryOperation = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> => {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxRetries) {
        throw lastError;
      }
      
      // Exponential backoff
      await new Promise(resolve => 
        setTimeout(resolve, delay * Math.pow(2, attempt - 1))
      );
    }
  }
  
  throw lastError!;
};

/**
 * Handle API errors in Pages Router (NextApiResponse) route handlers
 */
export function handleApiError(error: unknown, res: NextApiResponse): void {
  console.error('API Error:', error);

  if (error instanceof ApiError) {
    res.status(error.statusCode).json({
      success: false,
      error: error.message,
      code: error.code,
    });
    return;
  }

  if (error instanceof Error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
    return;
  }

  res.status(500).json({
    success: false,
    error: 'An unexpected error occurred',
  });
}