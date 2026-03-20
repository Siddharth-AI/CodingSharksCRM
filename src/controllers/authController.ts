import { NextApiRequest, NextApiResponse } from 'next';
import { AuthModel } from '@/models/auth';
import { 
  LoginRequest, 
  LoginResponse, 
  LogoutResponse,
  ApiResponse 
} from '@/types';
import { 
  loginSchema, 
  validateData 
} from '@/utils/validation';
import { ApiError, handleApiError } from '@/utils/errorHandling';
import { AuthenticatedRequest } from '@/middleware/auth';

export class AuthController {
  /**
   * Handle user login
   */
  static async login(req: NextApiRequest, res: NextApiResponse<LoginResponse>) {
    try {
      if (req.method !== 'POST') {
        return res.status(405).json({
          success: false,
          error: 'Method not allowed'
        });
      }

      // Validate request body
      const validation = validateData<LoginRequest>(loginSchema, req.body);
      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          error: validation.error || 'Invalid input data'
        });
      }

      const { email, password } = validation.value!;

      // Authenticate user
      const user = await AuthModel.authenticate(email, password);
      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'Invalid email or password'
        });
      }

      // Generate JWT token
      const token = AuthModel.generateToken(user);
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours

      return res.status(200).json({
        success: true,
        user,
        token,
        expiresAt
      });

    } catch (error) {
      console.error('Login error:', error);
      return handleApiError(error, res);
    }
  }

  /**
   * Handle user logout
   */
  static async logout(req: AuthenticatedRequest, res: NextApiResponse<LogoutResponse>) {
    try {
      if (req.method !== 'POST') {
        return res.status(405).json({
          success: false,
          message: 'Method not allowed'
        });
      }

      // In a JWT-based system, logout is typically handled client-side
      // by removing the token. However, we can log the logout event.
      
      if (req.user) {
        console.log(`User ${req.user.email} logged out at ${new Date().toISOString()}`);
      }

      return res.status(200).json({
        success: true,
        message: 'Logged out successfully'
      });

    } catch (error) {
      console.error('Logout error:', error);
      return handleApiError(error, res);
    }
  }

  /**
   * Verify token and return user info
   */
  static async verifyToken(req: AuthenticatedRequest, res: NextApiResponse<ApiResponse>) {
    try {
      if (req.method !== 'GET') {
        return res.status(405).json({
          success: false,
          error: 'Method not allowed'
        });
      }

      // If we reach here, the token is valid (middleware already verified it)
      if (!req.user) {
        throw new ApiError('User not found in request', 'UNAUTHORIZED', 401);
      }

      // Get full user details
      const user = await AuthModel.findById(req.user.id);
      if (!user) {
        throw new ApiError('User not found', 'NOT_FOUND', 404);
      }

      return res.status(200).json({
        success: true,
        data: user,
        message: 'Token is valid'
      });

    } catch (error) {
      console.error('Token verification error:', error);
      return handleApiError(error, res);
    }
  }

  /**
   * Refresh token (generate new token for authenticated user)
   */
  static async refreshToken(req: AuthenticatedRequest, res: NextApiResponse<LoginResponse>) {
    try {
      if (req.method !== 'POST') {
        return res.status(405).json({
          success: false,
          error: 'Method not allowed'
        });
      }

      if (!req.user) {
        throw new ApiError('User not authenticated', 'UNAUTHORIZED', 401);
      }

      // Get full user details
      const user = await AuthModel.findById(req.user.id);
      if (!user) {
        throw new ApiError('User not found', 'NOT_FOUND', 404);
      }

      // Generate new token
      const token = AuthModel.generateToken(user);
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours

      return res.status(200).json({
        success: true,
        user,
        token,
        expiresAt
      });

    } catch (error) {
      console.error('Token refresh error:', error);
      return handleApiError(error, res);
    }
  }

  /**
   * Get current authenticated user profile
   */
  static async getProfile(req: AuthenticatedRequest, res: NextApiResponse<ApiResponse>) {
    try {
      if (req.method !== 'GET') {
        return res.status(405).json({
          success: false,
          error: 'Method not allowed'
        });
      }

      if (!req.user) {
        throw new ApiError('User not authenticated', 'UNAUTHORIZED', 401);
      }

      // Get full user details
      const user = await AuthModel.findById(req.user.id);
      if (!user) {
        throw new ApiError('User not found', 'NOT_FOUND', 404);
      }

      return res.status(200).json({
        success: true,
        data: user,
        message: 'Profile retrieved successfully'
      });

    } catch (error) {
      console.error('Get profile error:', error);
      return handleApiError(error, res);
    }
  }
}