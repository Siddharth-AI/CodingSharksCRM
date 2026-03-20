import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { formatMobileNumber } from '@/models/lead';
import { authenticateApiRequest } from '@/middleware/authMiddleware';
import { handleApiError } from '@/utils/apiErrorHandling';
import { Lead, LeadStage, LeadSource } from '@/types';

/**
 * GET /api/leads/check-duplicate - Check for duplicate leads by mobile number
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
    const mobile = searchParams.get('mobile');

    if (!mobile) {
      return NextResponse.json(
        { success: false, error: 'Mobile number is required' },
        { status: 400 }
      );
    }

    // Format mobile number to standard format
    const formattedMobile = formatMobileNumber(mobile);

    // Search for leads with the same mobile number
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .eq('mobile', formattedMobile)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to check for duplicates' },
        { status: 500 }
      );
    }

    // Transform data to match Lead interface
    const duplicateLeads: Lead[] = (data || []).map(row => ({
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
      data: duplicateLeads,
      count: duplicateLeads.length,
      mobile: formattedMobile,
      message: duplicateLeads.length > 0 
        ? `Found ${duplicateLeads.length} existing lead(s) with mobile number ${formattedMobile}`
        : `No existing leads found with mobile number ${formattedMobile}`,
    });

  } catch (error) {
    return handleApiError(error);
  }
}