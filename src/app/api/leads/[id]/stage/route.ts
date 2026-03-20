import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { updateLeadStageSchema } from '@/models/lead';
import { authenticateApiRequest } from '@/middleware/authMiddleware';
import { handleApiError } from '@/utils/apiErrorHandling';
import { Lead, LeadStage, LeadSource } from '@/types';

/**
 * PATCH /api/leads/[id]/stage - Update lead stage
 */
export async function PATCH(
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

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid lead ID format' },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Validate input data
    const { error, value } = updateLeadStageSchema.validate(body);
    if (error) {
      return NextResponse.json(
        { success: false, error: error.details[0].message },
        { status: 400 }
      );
    }

    const { stage } = value;

    // Check if lead exists and get current stage
    const { data: existingLead, error: fetchError } = await supabaseAdmin
      .from('leads')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json(
          { success: false, error: 'Lead not found' },
          { status: 404 }
        );
      }
      console.error('Database error:', fetchError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch lead' },
        { status: 500 }
      );
    }

    // Check if stage is actually changing
    if (existingLead.stage === stage) {
      return NextResponse.json(
        { success: false, error: 'Lead is already in this stage' },
        { status: 400 }
      );
    }

    // Prepare update object
    const updateObject: any = {
      stage,
      updated_at: new Date().toISOString(),
    };

    // Update last contacted time if stage changes to CONTACTED
    if (stage === LeadStage.CONTACTED) {
      updateObject.last_contacted_at = new Date().toISOString();
    }

    // Update lead stage
    const { data, error: updateError } = await supabaseAdmin
      .from('leads')
      .update(updateObject)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Database error:', updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to update lead stage' },
        { status: 500 }
      );
    }

    // Transform data to match Lead interface
    const updatedLead: Lead = {
      id: data.id,
      name: data.name,
      email: data.email,
      mobile: data.mobile,
      courseInterest: data.course_interest,
      stage: data.stage as LeadStage,
      source: data.source as LeadSource,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
      lastContactedAt: data.last_contacted_at ? new Date(data.last_contacted_at) : undefined,
      notes: data.notes,
    };

    // Log stage change activity
    await supabaseAdmin
      .from('activities')
      .insert({
        lead_id: id,
        type: 'stage_changed',
        description: `Stage changed from ${existingLead.stage} to ${stage}`,
        metadata: {
          previousStage: existingLead.stage,
          newStage: stage,
          changedBy: authResult.user!.id,
        },
        created_by: authResult.user!.id,
        created_at: new Date().toISOString(),
      });

    // TODO: Trigger stage change automation workflow
    // This will be implemented in the workflow engine task

    return NextResponse.json({
      success: true,
      data: updatedLead,
      message: `Lead stage updated from ${existingLead.stage} to ${stage}`,
    });

  } catch (error) {
    return handleApiError(error);
  }
}