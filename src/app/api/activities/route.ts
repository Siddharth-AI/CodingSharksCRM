import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { authenticateApiRequest } from '@/middleware/authMiddleware';
import { handleApiError } from '@/utils/apiErrorHandling';
import { ApiResponse, Activity, ActivityType, PaginatedResponse } from '@/types';
import { validateCreateActivity, validateActivityFilters } from '@/models/activity';
import { buildActivityQuery, ActivityFilters } from '@/utils/activityLogger';

/**
 * GET /api/activities - Get activities with filtering and pagination
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
    
    const filters: ActivityFilters = {
      leadId: searchParams.get('leadId') || undefined,
      type: searchParams.get('type') as ActivityType || undefined,
      performedBy: searchParams.get('performedBy') || undefined,
      dateFrom: searchParams.get('dateFrom') ? new Date(searchParams.get('dateFrom')!) : undefined,
      dateTo: searchParams.get('dateTo') ? new Date(searchParams.get('dateTo')!) : undefined,
      page: searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 20,
      sortBy: (searchParams.get('sortBy') as 'created_at' | 'type') || 'created_at',
      sortOrder: (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc',
    };

    // Validate filters
    const { error: validationError } = validateActivityFilters(filters);
    if (validationError) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid filter parameters',
          details: validationError.details.map(d => ({
            field: d.path.join('.'),
            message: d.message,
          }))
        },
        { status: 400 }
      );
    }

    // Build and execute query
    const query = buildActivityQuery(filters);
    const { data, error, count } = await query;

    if (error) {
      console.error('Failed to fetch activities:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch activities' },
        { status: 500 }
      );
    }

    // Transform data to Activity type
    const activities: Activity[] = (data || []).map(activity => ({
      id: activity.id,
      leadId: activity.lead_id,
      type: activity.type,
      description: activity.description,
      metadata: activity.metadata || {},
      performedBy: activity.performed_by,
      createdAt: new Date(activity.created_at),
    }));

    const response: PaginatedResponse<Activity> = {
      data: activities,
      pagination: {
        page: filters.page!,
        limit: filters.limit!,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / filters.limit!),
      },
    };

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    return handleApiError(error, 'Failed to fetch activities');
  }
}

/**
 * POST /api/activities - Create a new activity
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
    const { error: validationError, value: validatedData } = validateCreateActivity(body);
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

    const { leadId, type, description, metadata, performedBy } = validatedData;

    // Verify lead exists
    const { data: leadData, error: leadError } = await supabase
      .from('leads')
      .select('id')
      .eq('id', leadId)
      .single();

    if (leadError || !leadData) {
      return NextResponse.json(
        { success: false, error: 'Lead not found' },
        { status: 404 }
      );
    }

    // Create activity
    const { data: activityData, error: insertError } = await supabase
      .from('activities')
      .insert({
        lead_id: leadId,
        type,
        description,
        metadata: metadata || {},
        performed_by: performedBy,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error('Failed to create activity:', insertError);
      return NextResponse.json(
        { success: false, error: 'Failed to create activity' },
        { status: 500 }
      );
    }

    const activity: Activity = {
      id: activityData.id,
      leadId: activityData.lead_id,
      type: activityData.type,
      description: activityData.description,
      metadata: activityData.metadata || {},
      performedBy: activityData.performed_by,
      createdAt: new Date(activityData.created_at),
    };

    const response: ApiResponse<Activity> = {
      success: true,
      data: activity,
      message: 'Activity created successfully',
    };

    return NextResponse.json(response, { status: 201 });

  } catch (error) {
    return handleApiError(error, 'Failed to create activity');
  }
}
