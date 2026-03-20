import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { workflowEngine } from '@/services/workflowEngine';
import { authenticateApiRequest } from '@/middleware/authMiddleware';
import { handleApiError } from '@/utils/apiErrorHandling';
import { ApiResponse, Lead } from '@/types';
import Joi from 'joi';

/**
 * POST /api/workflows/schedule - Schedule workflow for a lead
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
      workflowType: Joi.string().valid('welcome', 'follow_up', 'nurturing').required(),
      startDate: Joi.date().optional(),
      templateId: Joi.string().uuid().optional(),
      customContent: Joi.string().max(4096).optional(),
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

    const { leadId, workflowType, startDate, templateId, customContent } = validatedData;

    // Get lead information
    const { data: leadData, error: leadError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single();

    if (leadError || !leadData) {
      return NextResponse.json(
        { success: false, error: 'Lead not found' },
        { status: 404 }
      );
    }

    const lead: Lead = {
      id: leadData.id,
      name: leadData.name,
      email: leadData.email,
      mobile: leadData.mobile,
      courseInterest: leadData.course_interest,
      stage: leadData.stage,
      source: leadData.source,
      createdAt: new Date(leadData.created_at),
      updatedAt: new Date(leadData.updated_at),
      lastContactedAt: leadData.last_contacted_at ? new Date(leadData.last_contacted_at) : undefined,
      notes: leadData.notes,
    };

    let result;

    switch (workflowType) {
      case 'welcome':
        result = await workflowEngine.scheduleWelcomeMessage(lead, templateId, customContent);
        break;

      case 'follow_up':
        result = await workflowEngine.scheduleFollowUpSequence(lead, startDate ? new Date(startDate) : undefined);
        break;

      case 'nurturing':
        result = await workflowEngine.scheduleNurturingSequence(lead, startDate ? new Date(startDate) : undefined);
        break;

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid workflow type' },
          { status: 400 }
        );
    }

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    const response: ApiResponse<typeof result> = {
      success: true,
      data: result,
      message: `${workflowType} workflow scheduled successfully`,
    };

    return NextResponse.json(response, { status: 201 });

  } catch (error) {
    return handleApiError(error, 'Failed to schedule workflow');
  }
}