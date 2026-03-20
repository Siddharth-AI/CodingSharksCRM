import { NextApiRequest, NextApiResponse } from 'next';
import jwt from 'jsonwebtoken';
import { JWTPayload } from '@/types';
import { supabaseAdmin } from '@/lib/supabase';
import { ApiError } from '@/utils/errorHandling';

// Extend NextApiRequest to include user
export interface AuthenticatedRequest extends NextApiRequest {
  user?: {
    id: string;
    email: string;
  };
}

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key';

/**
 * Authentication middleware for API routes
 */
export const authenticateRequest = async (req: AuthenticatedRequest): Promise<void> => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new ApiError('No token provided', 'UNAUTHORIZED', 401);
  }
  
  const token = authHeader.substring(7); // Remove 'Bearer ' prefix
  
  try {
    // Verify JWT token
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    
    // Verify user exists and is active
    const { data: user, error } = await supabaseAdmin
      .from('admin_users')
      .select('id, email, is_active')
      .eq('id', decoded.userId)
      .single();
    
    if (error || !user || !user.is_active) {
      throw new ApiError('Invalid or inactive user', 'UNAUTHORIZED', 401);
    }
    
    // Add user to request object
    req.user = {
      id: user.id,
      email: user.email,
    };
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      throw new ApiError('Invalid token', 'UNAUTHORIZED', 401);
    }
    if (error instanceof jwt.TokenExpiredError) {
      throw new ApiError('Token expired', 'UNAUTHORIZED', 401);
    }
    throw error;
  }
};

/**
 * Middleware wrapper for API routes that require authentication
 */
export const withAuth = (
  handler: (req: AuthenticatedRequest, res: NextApiResponse) => Promise<void>
) => {
  return async (req: AuthenticatedRequest, res: NextApiResponse) => {
    try {
      await authenticateRequest(req);
      return await handler(req, res);
    } catch (error) {
      if (error instanceof ApiError) {
        return res.status(error.statusCode).json({
          success: false,
          error: error.message,
          code: error.code,
        });
      }
      
      console.error('Authentication error:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
      });
    }
  };
};

/**
 * Extract user from authenticated request
 */
export const getAuthenticatedUser = (req: AuthenticatedRequest) => {
  if (!req.user) {
    throw new ApiError('User not authenticated', 'UNAUTHORIZED', 401);
  }
  return req.user;
};