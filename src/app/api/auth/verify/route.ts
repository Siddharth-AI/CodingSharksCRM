import { NextRequest, NextResponse } from 'next/server';
import { AuthModel } from '@/models/auth';
import { ApiResponse } from '@/types';
import { ApiError } from '@/utils/errorHandling';

export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
    // Extract token from Authorization header
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({
        success: false,
        error: 'No token provided'
      }, { status: 401 });
    }
    
    const token = authHeader.substring(7);
    
    // Verify token
    const tokenValidation = AuthModel.verifyToken(token);
    if (!tokenValidation.isValid) {
      return NextResponse.json({
        success: false,
        error: tokenValidation.error || 'Invalid token'
      }, { status: 401 });
    }

    // Get user details
    const user = await AuthModel.findById(tokenValidation.payload!.userId);
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'User not found'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: user,
      message: 'Token is valid'
    }, { status: 200 });

  } catch (error) {
    console.error('Token verification error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}

// Handle unsupported methods
export async function POST() {
  return NextResponse.json({
    success: false,
    error: 'Method not allowed'
  }, { status: 405 });
}

export async function PUT() {
  return NextResponse.json({
    success: false,
    error: 'Method not allowed'
  }, { status: 405 });
}

export async function DELETE() {
  return NextResponse.json({
    success: false,
    error: 'Method not allowed'
  }, { status: 405 });
}