import { NextRequest, NextResponse } from 'next/server';
import { AuthModel } from '@/models/auth';
import { LoginResponse } from '@/types';

export async function POST(request: NextRequest): Promise<NextResponse<LoginResponse>> {
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
    
    // Verify current token
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

    // Generate new token
    const newToken = AuthModel.generateToken(user);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours

    return NextResponse.json({
      success: true,
      user,
      token: newToken,
      expiresAt
    }, { status: 200 });

  } catch (error) {
    console.error('Token refresh error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}

// Handle unsupported methods
export async function GET() {
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