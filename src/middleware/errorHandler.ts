import { NextApiRequest, NextApiResponse } from 'next';
import { ValidationErrorHandler, DatabaseErrorHandler, ApiError } from '@/utils/errorHandling';
import Joi from 'joi';

/**
 * Global API error handler
 */
export const handleApiError = (error: any, res: NextApiResponse) => {
  console.error('API Error:', error);
  
  // Handle Joi validation errors
  if (error instanceof Joi.ValidationError) {
    const validationErrors = ValidationErrorHandler.formatJoiError(error);
    const message = ValidationErrorHandler.createUserFriendlyMessage(validationErrors);
    
    return res.status(400).json({
      success: false,
      error: message,
      code: 'VALIDATION_ERROR',
      details: validationErrors,
    });
  }
  
  // Handle custom API errors
  if (error instanceof ApiError) {
    return res.status(error.statusCode).json({
      success: false,
      error: error.message,
      code: error.code,
      details: error.details,
    });
  }
  
  // Handle Supabase/Database errors
  if (error.code && typeof error.code === 'string') {
    const dbError = DatabaseErrorHandler.handleSupabaseError(error);
    return res.status(dbError.statusCode).json({
      success: false,
      error: dbError.message,
      code: dbError.code,
      details: dbError.details,
    });
  }
  
  // Handle generic errors
  return res.status(500).json({
    success: false,
    error: 'Internal server error',
    code: 'INTERNAL_ERROR',
  });
};

/**
 * Middleware wrapper for error handling
 */
export const withErrorHandler = (
  handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void>
) => {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      await handler(req, res);
    } catch (error) {
      handleApiError(error, res);
    }
  };
};

/**
 * Method validation middleware
 */
export const validateMethod = (allowedMethods: string[]) => {
  return (req: NextApiRequest, res: NextApiResponse, next: () => void) => {
    if (!allowedMethods.includes(req.method!)) {
      return res.status(405).json({
        success: false,
        error: `Method ${req.method} not allowed`,
        code: 'METHOD_NOT_ALLOWED',
      });
    }
    next();
  };
};

/**
 * Request validation middleware
 */
export const validateRequest = (schema: Joi.ObjectSchema) => {
  return (req: NextApiRequest, res: NextApiResponse, next: () => void) => {
    const { error, value } = schema.validate(req.body, { abortEarly: false });
    
    if (error) {
      const validationErrors = ValidationErrorHandler.formatJoiError(error);
      const message = ValidationErrorHandler.createUserFriendlyMessage(validationErrors);
      
      return res.status(400).json({
        success: false,
        error: message,
        code: 'VALIDATION_ERROR',
        details: validationErrors,
      });
    }
    
    // Replace request body with validated data
    req.body = value;
    next();
  };
};

/**
 * Rate limiting middleware (basic implementation)
 */
const requestCounts = new Map<string, { count: number; resetTime: number }>();

export const rateLimit = (maxRequests: number = 100, windowMs: number = 15 * 60 * 1000) => {
  return (req: NextApiRequest, res: NextApiResponse, next: () => void) => {
    const clientId = req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown';
    const now = Date.now();
    
    const clientData = requestCounts.get(clientId as string);
    
    if (!clientData || now > clientData.resetTime) {
      // Reset or initialize counter
      requestCounts.set(clientId as string, {
        count: 1,
        resetTime: now + windowMs,
      });
      return next();
    }
    
    if (clientData.count >= maxRequests) {
      return res.status(429).json({
        success: false,
        error: 'Too many requests',
        code: 'RATE_LIMITED',
      });
    }
    
    clientData.count++;
    next();
  };
};

/**
 * CORS middleware
 */
export const cors = (req: NextApiRequest, res: NextApiResponse, next: () => void) => {
  res.setHeader('Access-Control-Allow-Origin', process.env.NEXT_PUBLIC_API_URL || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  return next();
};