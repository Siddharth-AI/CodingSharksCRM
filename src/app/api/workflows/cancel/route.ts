import { NextRequest, NextResponse } from 'next/server';
import { workflowEngine } from '@/services/workflowEngine';
import { authenticateApiRequest } from '@/middleware/authMiddleware';
import { handleApiError } from '@/utils/apiErrorHandling';
import { ApiResponse } from '@/types';
import Joi from 'joi';

/**
 * POST /api/workflows/cancel - Cancel scheduled messages for a lead
 */
export async function POST(request: NextRequest) {
  try {
    // Apply authentication middleware
    const authResult = await authenticateApiRequest(request);
    if (!authResult.isAuthenticated) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: 401 }
      );
    }

    const body = await request.json();

    // Validate request body
    const schema = Joi.object({
      leadId: Joi.string().uuid().required(),
      workflowType: Joi.string().valid('welcome', 'follow_up', 'nurturing', 'conversion', 'custom').optional(),
    });

    const { error: validationError, value: validatedData } = schema.validate(body);
    if (validationError) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Validation failed',
          details: validationError.details.map(d => ({
            field: d.path.join('.'),
            message: d.message,
          }))
        },
        { status: 400 }
      );
    }

    const { leadId, workflowType } = validatedData;

    // Cancel scheduled messages
    const result = await workflowEngine.cancelScheduledMessages(
      leadId,
      workflowType as 'welcome' | 'follow_up' | 'nurturing' | 'conversion' | 'custom' | undefined
    );

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    const response: ApiResponse<typeof result> = {
      success: true,
      data: result,
      message: `Cancelled ${result.cancelledCount} scheduled message(s)`,
    };

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    return handleApiError(error, 'Failed to cancel scheduled messages');
  }
}
