import { NextRequest, NextResponse } from 'next/server';
import { workflowEngine } from '@/services/workflowEngine';
import { ApiResponse } from '@/types';

/**
 * POST /api/workflows/process - Process due scheduled messages
 * This endpoint should be called by a cron job every minute
 */
export async function POST(request: NextRequest) {
  try {
    // Verify cron secret to prevent unauthorized access
    const cronSecret = request.headers.get('x-cron-secret');
    const expectedSecret = process.env.CRON_SECRET || 'your-secret-key';

    if (cronSecret !== expectedSecret) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Process due messages
    const result = await workflowEngine.processDueMessages();

    const response: ApiResponse<{
      processed: number;
      sent: number;
      failed: number;
      errors: string[];
    }> = {
      success: result.success,
      data: {
        processed: result.processed,
        sent: result.sent,
        failed: result.failed,
        errors: result.errors,
      },
      message: `Processed ${result.processed} messages: ${result.sent} sent, ${result.failed} failed`,
    };

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('Failed to process workflows:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/workflows/process - Get processing status (for monitoring)
 */
export async function GET(request: NextRequest) {
  try {
    // Get workflow statistics
    const stats = await workflowEngine.getWorkflowStatistics();

    const response: ApiResponse<typeof stats> = {
      success: true,
      data: stats,
    };

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('Failed to get workflow status:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}