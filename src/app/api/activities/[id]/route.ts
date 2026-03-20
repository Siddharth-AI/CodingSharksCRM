import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { authenticateApiRequest } from '@/middleware/authMiddleware';
import { handleApiError } from '@/utils/apiErrorHandling';
import { ApiResponse, Activity } from '@/types';
import { validateUpdateActivity } from '@/models/activity';

/**
 * GET /api/activities/[id] - Get activity by ID
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

    const { data, error } = await supabase
      .from('activities')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { success: false, error: 'Activity not found' },
        { status: 404 }
      );
    }

    const activity: Activity = {
      id: data.id,
      leadId: data.lead_id,
      type: data.type,
      description: data.description,
      metadata: data.metadata || {},
      performedBy: data.performed_by,
      createdAt: new Date(data.created_at),
    };

    const response: ApiResponse<Activity> = {
      success: true,
      data: activity,
      message: 'Activity retrieved successfully',
    };

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    return handleApiError(error, 'Failed to fetch activity');
  }
}

/**
 * PUT /api/activities/[id] - Update activity
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
    const body = await request.json();

    // Validate request body
    const { error: validationError, value: validatedData } = validateUpdateActivity(body);
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

    // Check if activity exists
    const { data: existingActivity, error: fetchError } = await supabase
      .from('activities')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !existingActivity) {
      return NextResponse.json(
        { success: false, error: 'Activity not found' },
        { status: 404 }
      );
    }

    // Update activity
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (validatedData.description !== undefined) {
      updateData.description = validatedData.description;
    }

    if (validatedData.metadata !== undefined) {
      updateData.metadata = validatedData.metadata;
    }

    const { data: updatedData, error: updateError } = await supabase
      .from('activities')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Failed to update activity:', updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to update activity' },
        { status: 500 }
      );
    }

    const activity: Activity = {
      id: updatedData.id,
      leadId: updatedData.lead_id,
      type: updatedData.type,
      description: updatedData.description,
      metadata: updatedData.metadata || {},
      performedBy: updatedData.performed_by,
      createdAt: new Date(updatedData.created_at),
    };

    const response: ApiResponse<Activity> = {
      success: true,
      data: activity,
      message: 'Activity updated successfully',
    };

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    return handleApiError(error, 'Failed to update activity');
  }
}

/**
 * DELETE /api/activities/[id] - Delete activity
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

    // Check if activity exists
    const { data: existingActivity, error: fetchError } = await supabase
      .from('activities')
      .select('id')
      .eq('id', id)
      .single();

    if (fetchError || !existingActivity) {
      return NextResponse.json(
        { success: false, error: 'Activity not found' },
        { status: 404 }
      );
    }

    // Delete activity
    const { error: deleteError } = await supabase
      .from('activities')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Failed to delete activity:', deleteError);
      return NextResponse.json(
        { success: false, error: 'Failed to delete activity' },
        { status: 500 }
      );
    }

    const response: ApiResponse<void> = {
      success: true,
      data: undefined,
      message: 'Activity deleted successfully',
    };

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    return handleApiError(error, 'Failed to delete activity');
  }
}
