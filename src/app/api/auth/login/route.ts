import { NextRequest, NextResponse } from 'next/server';
import { AuthModel } from '@/models/auth';
import { 
  LoginRequest, 
  LoginResponse 
} from '@/types';
import { 
  loginSchema, 
  validateData 
} from '@/utils/validation';

export async function POST(request: NextRequest): Promise<NextResponse<LoginResponse>> {
  try {
    // Parse request body
    const body = await request.json();

    // Validate request body
    const validation = validateData<LoginRequest>(loginSchema, body);
    if (!validation.isValid) {
      return NextResponse.json({
        success: false,
        error: validation.error || 'Invalid input data'
      }, { status: 400 });
    }

    const { email, password } = validation.value!;

    // Authenticate user
    const user = await AuthModel.authenticate(email, password);
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Invalid email or password'
      }, { status: 401 });
    }

    // Generate JWT token
    const token = AuthModel.generateToken(user);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours

    return NextResponse.json({
      success: true,
      user,
      token,
      expiresAt
    }, { status: 200 });

  } catch (error) {
    console.error('Login error:', error);
    
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