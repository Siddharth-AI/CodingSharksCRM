import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { paginationSchema } from '@/models/lead';
import { authenticateApiRequest } from '@/middleware/authMiddleware';
import { handleApiError } from '@/utils/apiErrorHandling';
import { Lead, LeadStage, LeadSource } from '@/types';

/**
 * GET /api/leads/search - Search leads by name, email, or mobile
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
    
    // Get search query
    const query = searchParams.get('q') || searchParams.get('query') || searchParams.get('search');
    if (!query || query.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Search query is required' },
        { status: 400 }
      );
    }

    if (query.trim().length < 2) {
      return NextResponse.json(
        { success: false, error: 'Search query must be at least 2 characters long' },
        { status: 400 }
      );
    }

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

    // Build search query
    const searchTerm = query.trim();
    let supabaseQuery = supabase
      .from('leads')
      .select('*', { count: 'exact' })
      .or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,mobile.ilike.%${searchTerm}%,course_interest.ilike.%${searchTerm}%`);

    // Apply pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    supabaseQuery = supabaseQuery.range(from, to);

    // Order by relevance (exact matches first, then partial matches)
    // For now, we'll order by created_at desc, but this can be enhanced with relevance scoring
    supabaseQuery = supabaseQuery.order('created_at', { ascending: false });

    const { data, error, count } = await supabaseQuery;

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to search leads' },
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
      query: searchTerm,
    });

  } catch (error) {
    return handleApiError(error);
  }
}