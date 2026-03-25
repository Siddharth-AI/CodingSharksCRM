import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase'; // Use admin client for server operations
import { 
  createLeadSchema, 
  leadFiltersSchema, 
  paginationSchema,
  formatMobileNumber 
} from '@/models/lead';
import { 
  buildLeadQueryParams, 
  calculateLeadStats,
  formatLeadsForExport 
} from '@/utils/leadUtils';
import { authenticateApiRequest } from '@/middleware/authMiddleware';
import { handleApiError } from '@/utils/apiErrorHandling';
import { Lead, LeadStage, LeadSource, CreateLeadRequest } from '@/types';
import { sendAutoWelcomeMessage } from '@/services/autoWelcomeService';

/**
 * GET /api/leads - Get all leads with filtering and pagination
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
    
    // Parse pagination parameters
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    
    // Validate pagination
    const { error: paginationError } = paginationSchema.validate({ page, limit });
    if (paginationError) {
      return NextResponse.json(
        { success: false, error: paginationError.details[0].message },
        { status: 400 }
      );
    }

    // Parse filter parameters
    const filters = {
      stage: searchParams.get('stage') as LeadStage || undefined,
      courseInterest: searchParams.get('courseInterest') || undefined,
      source: searchParams.get('source') as LeadSource || undefined,
      dateFrom: searchParams.get('dateFrom') ? new Date(searchParams.get('dateFrom')!) : undefined,
      dateTo: searchParams.get('dateTo') ? new Date(searchParams.get('dateTo')!) : undefined,
      search: searchParams.get('search') || undefined,
    };

    // Remove undefined values
    const cleanFilters = Object.fromEntries(
      Object.entries(filters).filter(([_, value]) => value !== undefined)
    );

    // Validate filters
    if (Object.keys(cleanFilters).length > 0) {
      const { error: filterError } = leadFiltersSchema.validate(cleanFilters);
      if (filterError) {
        return NextResponse.json(
          { success: false, error: filterError.details[0].message },
          { status: 400 }
        );
      }
    }

    // Build Supabase query
    let query = supabaseAdmin
      .from('leads')
      .select('*', { count: 'exact' });

    // Apply filters
    if (cleanFilters.stage) {
      query = query.eq('stage', cleanFilters.stage);
    }
    if (cleanFilters.courseInterest) {
      query = query.ilike('course_interest', `%${cleanFilters.courseInterest}%`);
    }
    if (cleanFilters.source) {
      query = query.eq('source', cleanFilters.source);
    }
    if (cleanFilters.dateFrom) {
      query = query.gte('created_at', new Date(cleanFilters.dateFrom).toISOString());
    }
    if (cleanFilters.dateTo) {
      query = query.lte('created_at', new Date(cleanFilters.dateTo).toISOString());
    }
    if (cleanFilters.search) {
      query = query.or(`name.ilike.%${cleanFilters.search}%,email.ilike.%${cleanFilters.search}%,mobile.ilike.%${cleanFilters.search}%`);
    }

    // Apply pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    // Order by created_at desc
    query = query.order('created_at', { ascending: false });

    const { data, error, count } = await query;

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch leads' },
        { status: 500 }
      );
    }

    // Transform data to match Lead interface
    const leads: Lead[] = (data || []).map(row => ({
      id: row.id,
      name: row.name,
      email: row.email,
      mobile: row.mobile,
      courseInterest: row.course_interest,
      stage: row.stage as LeadStage,
      source: row.source as LeadSource,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      lastContactedAt: row.last_contacted_at ? new Date(row.last_contacted_at) : undefined,
      notes: row.notes,
    }));

    return NextResponse.json({
      success: true,
      data: leads,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });

  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/leads - Create a new lead
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

    // Validate input data
    const { error, value } = createLeadSchema.validate(body);
    if (error) {
      return NextResponse.json(
        { success: false, error: error.details[0].message },
        { status: 400 }
      );
    }

    const leadData: CreateLeadRequest = value;

    // Format mobile number
    const formattedMobile = formatMobileNumber(leadData.mobile);

    // Check for existing leads with same mobile (for duplicate tracking)
    const { data: existingLeads } = await supabaseAdmin
      .from('leads')
      .select('id, name, email, mobile')
      .eq('mobile', formattedMobile);

    // Insert new lead (allowing duplicates as per requirements)
    const { data, error: insertError } = await supabaseAdmin
      .from('leads')
      .insert({
        name: leadData.name,
        email: leadData.email.toLowerCase(),
        mobile: formattedMobile,
        course_interest: leadData.courseInterest,
        source: leadData.source,
        stage: LeadStage.NEW, // Always start with NEW stage
        notes: leadData.notes || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error('Database error:', insertError);
      return NextResponse.json(
        { success: false, error: 'Failed to create lead' },
        { status: 500 }
      );
    }

    // Transform data to match Lead interface
    const newLead: Lead = {
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

    // Log activity
    await supabaseAdmin
      .from('activities')
      .insert({
        lead_id: newLead.id,
        type: 'lead_created',
        description: `Lead created: ${newLead.name} (${newLead.email})`,
        metadata: {
          courseInterest: newLead.courseInterest,
          source: newLead.source,
          duplicateCount: existingLeads?.length || 0,
        },
        created_by: authResult.user!.id,
        created_at: new Date().toISOString(),
      });

    // Awaited — Vercel kills fire-and-forget after response
    await sendAutoWelcomeMessage(newLead).catch(err =>
      console.error('Auto-welcome failed for lead', newLead.id, ':', err?.message || err)
    );

    return NextResponse.json({
      success: true,
      data: newLead,
      message: 'Lead created successfully',
      ...(existingLeads && existingLeads.length > 0 && {
        warning: `${existingLeads.length} existing lead(s) found with this mobile number`,
        duplicates: existingLeads,
      }),
    }, { status: 201 });

  } catch (error) {
    return handleApiError(error);
  }
}

