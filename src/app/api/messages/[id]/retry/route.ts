import { NextRequest, NextResponse } from 'next/server';
import { whatsappService } from '@/services/whatsappService';
import { authenticateApiRequest } from '@/middleware/authMiddleware';
import { handleApiError } from '@/utils/apiErrorHandling';
import { ApiResponse } from '@/types';

/**
 * POST /api/messages/[id]/retry - Retry sending a failed WhatsApp message
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Apply authentication middleware
    const authResult = await authenticateApiRequest(request);
    if (!authResult.isAuthenticated) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { maxRetries = 3 } = body;

    // Retry the message using WhatsApp service
    const result = await whatsappService.retryMessage(id, maxRetries);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    const response: ApiResponse = {
      success: true,
      message: 'Message retry initiated successfully',
    };

    return NextResponse.json(response);

  } catch (error) {
    return handleApiError(error, 'Failed to retry message');
  }
}