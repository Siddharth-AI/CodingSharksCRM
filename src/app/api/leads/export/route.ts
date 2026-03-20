import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { leadFiltersSchema } from '@/models/lead';
import { formatLeadsForExport } from '@/utils/leadUtils';
import { authenticateApiRequest } from '@/middleware/authMiddleware';
import { handleApiError } from '@/utils/apiErrorHandling';
import { Lead, LeadStage, LeadSource, LeadFilters } from '@/types';

/**
 * GET /api/leads/export - Export leads to CSV
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
    ) as LeadFilters;

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

    // Build Supabase query (no pagination for export)
    let query = supabase
      .from('leads')
      .select('*');

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
      query = query.gte('created_at', cleanFilters.dateFrom.toISOString());
    }
    if (cleanFilters.dateTo) {
      query = query.lte('created_at', cleanFilters.dateTo.toISOString());
    }
    if (cleanFilters.search) {
      query = query.or(`name.ilike.%${cleanFilters.search}%,email.ilike.%${cleanFilters.search}%,mobile.ilike.%${cleanFilters.search}%`);
    }

    // Order by created_at desc
    query = query.order('created_at', { ascending: false });

    // Limit to prevent memory issues (max 10,000 records)
    query = query.limit(10000);

    const { data, error } = await query;

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch leads for export' },
        { status: 500 }
      );
    }

    if (!data || data.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No leads found matching the criteria' },
        { status: 404 }
      );
    }

    // Transform data to match Lead interface
    const leads: Lead[] = data.map(row => ({
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

    // Format leads as CSV
    const csvContent = formatLeadsForExport(leads);

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `leads_export_${timestamp}.csv`;

    // Return CSV file
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache',
      },
    });

  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/leads/export - Export leads to CSV with advanced options
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
    const { filters, format = 'csv', includeActivities = false } = body;

    // Validate filters if provided
    if (filters && Object.keys(filters).length > 0) {
      const { error: filterError } = leadFiltersSchema.validate(filters);
      if (filterError) {
        return NextResponse.json(
          { success: false, error: filterError.details[0].message },
          { status: 400 }
        );
      }
    }

    // Build Supabase query
    let query = supabase
      .from('leads')
      .select('*');

    // Apply filters if provided
    if (filters) {
      if (filters.stage) {
        query = query.eq('stage', filters.stage);
      }
      if (filters.courseInterest) {
        query = query.ilike('course_interest', `%${filters.courseInterest}%`);
      }
      if (filters.source) {
        query = query.eq('source', filters.source);
      }
      if (filters.dateFrom) {
        query = query.gte('created_at', new Date(filters.dateFrom).toISOString());
      }
      if (filters.dateTo) {
        query = query.lte('created_at', new Date(filters.dateTo).toISOString());
      }
      if (filters.search) {
        query = query.or(`name.ilike.%${filters.search}%,email.ilike.%${filters.search}%,mobile.ilike.%${filters.search}%`);
      }
    }

    // Order by created_at desc
    query = query.order('created_at', { ascending: false });

    // Limit to prevent memory issues
    query = query.limit(10000);

    const { data, error } = await query;

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch leads for export' },
        { status: 500 }
      );
    }

    if (!data || data.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No leads found matching the criteria' },
        { status: 404 }
      );
    }

    // Transform data to match Lead interface
    const leads: Lead[] = data.map(row => ({
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

    // Format leads based on requested format
    let content: string;
    let contentType: string;
    let fileExtension: string;

    if (format === 'csv') {
      content = formatLeadsForExport(leads);
      contentType = 'text/csv';
      fileExtension = 'csv';
    } else {
      return NextResponse.json(
        { success: false, error: 'Unsupported export format. Only CSV is currently supported.' },
        { status: 400 }
      );
    }

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `leads_export_${timestamp}.${fileExtension}`;

    // Log export activity
    await supabase
      .from('activities')
      .insert({
        lead_id: null, // System activity
        type: 'lead_updated',
        description: `Exported ${leads.length} leads to ${format.toUpperCase()}`,
        metadata: {
          exportFormat: format,
          leadCount: leads.length,
          filters: filters || {},
          exportedBy: authResult.user!.id,
        },
        created_by: authResult.user!.id,
        created_at: new Date().toISOString(),
      });

    // Return file
    return new NextResponse(content, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache',
      },
    });

  } catch (error) {
    return handleApiError(error);
  }
}