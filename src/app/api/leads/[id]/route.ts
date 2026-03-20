import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { updateLeadSchema, formatMobileNumber } from '@/models/lead';
import { authenticateApiRequest } from '@/middleware/authMiddleware';
import { handleApiError } from '@/utils/apiErrorHandling';
import { Lead, LeadStage, LeadSource, UpdateLeadRequest } from '@/types';

/**
 * GET /api/leads/[id] - Get lead by ID
 */
export async function GET(
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

    const { data, error } = await supabaseAdmin
      .from('leads')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { success: false, error: 'Lead not found' },
          { status: 404 }
        );
      }
      console.error('Database error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch lead' },
        { status: 500 }
      );
    }

    // Transform data to match Lead interface
    const lead: Lead = {
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

    return NextResponse.json({
      success: true,
      data: lead,
    });

  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PUT /api/leads/[id] - Update lead by ID
 */
export async function PUT(
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
    const { error, value } = updateLeadSchema.validate(body);
    if (error) {
      return NextResponse.json(
        { success: false, error: error.details[0].message },
        { status: 400 }
      );
    }

    const updateData: UpdateLeadRequest = value;

    // Check if lead exists
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

    // Prepare update object
    const updateObject: any = {
      updated_at: new Date().toISOString(),
    };

    if (updateData.name !== undefined) {
      updateObject.name = updateData.name;
    }
    if (updateData.email !== undefined) {
      updateObject.email = updateData.email.toLowerCase();
    }
    if (updateData.mobile !== undefined) {
      updateObject.mobile = formatMobileNumber(updateData.mobile);
    }
    if (updateData.courseInterest !== undefined) {
      updateObject.course_interest = updateData.courseInterest;
    }
    if (updateData.stage !== undefined) {
      updateObject.stage = updateData.stage;
      // Update last contacted time if stage changes to CONTACTED
      if (updateData.stage === LeadStage.CONTACTED) {
        updateObject.last_contacted_at = new Date().toISOString();
      }
    }
    if (updateData.notes !== undefined) {
      updateObject.notes = updateData.notes || null;
    }

    // Update lead
    const { data, error: updateError } = await supabaseAdmin
      .from('leads')
      .update(updateObject)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Database error:', updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to update lead' },
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

    // Log activity for significant changes
    const activities = [];
    
    if (updateData.stage && updateData.stage !== existingLead.stage) {
      activities.push({
        lead_id: id,
        type: 'stage_changed',
        description: `Stage changed from ${existingLead.stage} to ${updateData.stage}`,
        metadata: {
          previousStage: existingLead.stage,
          newStage: updateData.stage,
        },
        created_by: authResult.user!.id,
        created_at: new Date().toISOString(),
      });
    }

    if (updateData.notes && updateData.notes !== existingLead.notes) {
      activities.push({
        lead_id: id,
        type: 'note_added',
        description: 'Notes updated',
        metadata: {
          noteLength: updateData.notes.length,
        },
        created_by: authResult.user!.id,
        created_at: new Date().toISOString(),
      });
    }

    // Insert activities
    if (activities.length > 0) {
      await supabaseAdmin
        .from('activities')
        .insert(activities);
    }

    // TODO: Trigger stage change automation if stage changed
    // This will be implemented in the workflow engine task

    return NextResponse.json({
      success: true,
      data: updatedLead,
      message: 'Lead updated successfully',
    });

  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * DELETE /api/leads/[id] - Delete lead by ID
 */
export async function DELETE(
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

    // Check if lead exists
    const { data: existingLead, error: fetchError } = await supabaseAdmin
      .from('leads')
      .select('id, name, email')
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

    // Delete related activities first (cascade delete)
    await supabaseAdmin
      .from('activities')
      .delete()
      .eq('lead_id', id);

    // Delete related messages
    await supabaseAdmin
      .from('whatsapp_messages')
      .delete()
      .eq('lead_id', id);

    // Delete the lead
    const { error: deleteError } = await supabaseAdmin
      .from('leads')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Database error:', deleteError);
      return NextResponse.json(
        { success: false, error: 'Failed to delete lead' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Lead ${existingLead.name} (${existingLead.email}) deleted successfully`,
    });

  } catch (error) {
    return handleApiError(error);
  }
}