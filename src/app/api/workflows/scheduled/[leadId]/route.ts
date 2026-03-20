import { NextRequest, NextResponse } from 'next/server';
import { workflowEngine } from '@/services/workflowEngine';
import { authenticateApiRequest } from '@/middleware/authMiddleware';
import { handleApiError } from '@/utils/apiErrorHandling';
import { ApiResponse } from '@/types';

/**
 * GET /api/workflows/scheduled/[leadId] - Get scheduled messages for a lead
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ leadId: string }> }
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

    const { leadId } = await params;

    if (!leadId) {
      return NextResponse.json(
        { success: false, error: 'Lead ID is required' },
        { status: 400 }
      );
    }

    // Get scheduled messages
    const scheduledMessages = await workflowEngine.getScheduledMessages(leadId);

    const response: ApiResponse<typeof scheduledMessages> = {
      success: true,
      data: scheduledMessages,
      message: `Found ${scheduledMessages.length} scheduled message(s)`,
    };

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    return handleApiError(error, 'Failed to get scheduled messages');
  }
}
