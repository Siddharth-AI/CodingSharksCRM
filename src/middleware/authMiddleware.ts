import { NextRequest, NextResponse } from 'next/server';
import { AuthModel } from '@/models/auth';

/**
 * Authentication middleware for Next.js App Router API routes
 */
export async function authenticateApiRequest(request: NextRequest): Promise<{
  isAuthenticated: boolean;
  user?: { id: string; email: string };
  error?: string;
}> {
  try {
    // Extract token from Authorization header
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        isAuthenticated: false,
        error: 'No token provided'
      };
    }
    
    const token = authHeader.substring(7);
    
    // Verify token
    const tokenValidation = AuthModel.verifyToken(token);
    if (!tokenValidation.isValid) {
      return {
        isAuthenticated: false,
        error: tokenValidation.error || 'Invalid token'
      };
    }

    // Get user details to verify they still exist and are active
    const user = await AuthModel.findById(tokenValidation.payload!.userId);
    if (!user || !user.isActive) {
      return {
        isAuthenticated: false,
        error: 'User not found or inactive'
      };
    }

    return {
      isAuthenticated: true,
      user: {
        id: user.id,
        email: user.email
      }
    };

  } catch (error) {
    console.error('Authentication error:', error);
    return {
      isAuthenticated: false,
      error: 'Authentication failed'
    };
  }
}

/**
 * Higher-order function to protect API routes
 */
export function withApiAuth<T extends any[]>(
  handler: (request: NextRequest, user: { id: string; email: string }, ...args: T) => Promise<NextResponse>
) {
  return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
    const authResult = await authenticateApiRequest(request);
    
    if (!authResult.isAuthenticated) {
      return NextResponse.json({
        success: false,
        error: authResult.error || 'Authentication required'
      }, { status: 401 });
    }

    return handler(request, authResult.user!, ...args);
  };
}

/**
 * Create an unauthorized response
 */
export function createUnauthorizedResponse(message: string = 'Authentication required') {
  return NextResponse.json({
    success: false,
    error: message
  }, { status: 401 });
}

/**
 * Create a forbidden response
 */
export function createForbiddenResponse(message: string = 'Access denied') {
  return NextResponse.json({
    success: false,
    error: message
  }, { status: 403 });
}