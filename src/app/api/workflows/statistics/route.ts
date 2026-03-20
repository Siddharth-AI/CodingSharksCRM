import { NextRequest, NextResponse } from 'next/server';
import { workflowEngine } from '@/services/workflowEngine';
import { authenticateApiRequest } from '@/middleware/authMiddleware';
import { handleApiError } from '@/utils/apiErrorHandling';
import { ApiResponse } from '@/types';

/**
 * GET /api/workflows/statistics - Get workflow statistics
 */
export async function GET(request: NextRequest) {
  try {
    // Apply authentication middleware
    const authResult = await authenticateApiRequest(request);
    if (!authResult.isAuthenticated) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    // Get workflow statistics
    const stats = await workflowEngine.getWorkflowStatistics(
      dateFrom ? new Date(dateFrom) : undefined,
      dateTo ? new Date(dateTo) : undefined
    );

    const response: ApiResponse<typeof stats> = {
      success: true,
      data: stats,
      message: 'Workflow statistics retrieved successfully',
    };

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    return handleApiError(error, 'Failed to get workflow statistics');
  }
}
