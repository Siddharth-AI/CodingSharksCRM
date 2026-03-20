import { NextRequest, NextResponse } from 'next/server';
import { LogoutResponse } from '@/types';
import { AuthModel } from '@/models/auth';

export async function POST(request: NextRequest): Promise<NextResponse<LogoutResponse>> {
  try {
    // Extract token from Authorization header
    const authHeader = request.headers.get('authorization');
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      
      // Verify token to get user info for logging
      const tokenValidation = AuthModel.verifyToken(token);
      if (tokenValidation.isValid && tokenValidation.payload) {
        console.log(`User ${tokenValidation.payload.email} logged out at ${new Date().toISOString()}`);
      }
    }

    // In a JWT-based system, logout is typically handled client-side
    // by removing the token. We just log the event and return success.
    
    return NextResponse.json({
      success: true,
      message: 'Logged out successfully'
    }, { status: 200 });

  } catch (error) {
    console.error('Logout error:', error);
    
    return NextResponse.json({
      success: true, // Still return success even if logging fails
      message: 'Logged out successfully'
    }, { status: 200 });
  }
}

// Handle unsupported methods
export async function GET() {
  return NextResponse.json({
    success: false,
    message: 'Method not allowed'
  }, { status: 405 });
}

export async function PUT() {
  return NextResponse.json({
    success: false,
    message: 'Method not allowed'
  }, { status: 405 });
}

export async function DELETE() {
  return NextResponse.json({
    success: false,
    message: 'Method not allowed'
  }, { status: 405 });
}