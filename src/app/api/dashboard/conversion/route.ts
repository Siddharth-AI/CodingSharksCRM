import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { authenticateApiRequest } from '@/middleware/authMiddleware';
import { handleApiError } from '@/utils/apiErrorHandling';
import { ApiResponse, ConversionData, LeadStage } from '@/types';
import { validateDateRange, calculateFunnelMetrics } from '@/models/dashboard';

/**
 * GET /api/dashboard/conversion - Get conversion funnel data
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
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    if (!from || !to) {
      return NextResponse.json(
        { success: false, error: 'Date range (from, to) is required' },
        { status: 400 }
      );
    }

    const requestData = {
      from: new Date(from),
      to: new Date(to),
    };

    // Validate request
    const { error: validationError } = validateDateRange(requestData);
    if (validationError) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid date range',
          details: validationError.details.map(d => ({
            field: d.path.join('.'),
            message: d.message,
          }))
        },
        { status: 400 }
      );
    }

    // Fetch leads data
    const { data: leads, error: leadsError } = await supabase
      .from('leads')
      .select('stage')
      .gte('created_at', requestData.from.toISOString())
      .lte('created_at', requestData.to.toISOString());

    if (leadsError) {
      console.error('Failed to fetch leads:', leadsError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch conversion data' },
        { status: 500 }
      );
    }

    // Count leads by stage
    const stageCounts = {
      [LeadStage.NEW]: 0,
      [LeadStage.CONTACTED]: 0,
      [LeadStage.INTERESTED]: 0,
      [LeadStage.CONVERTED]: 0,
    };

    leads?.forEach(lead => {
      if (stageCounts[lead.stage as LeadStage] !== undefined) {
        stageCounts[lead.stage as LeadStage]++;
      }
    });

    // Build funnel stages
    const stages = [
      { stage: LeadStage.NEW, count: stageCounts[LeadStage.NEW] },
      { stage: LeadStage.CONTACTED, count: stageCounts[LeadStage.CONTACTED] },
      { stage: LeadStage.INTERESTED, count: stageCounts[LeadStage.INTERESTED] },
      { stage: LeadStage.CONVERTED, count: stageCounts[LeadStage.CONVERTED] },
    ];

    // Calculate funnel metrics
    const funnelMetrics = calculateFunnelMetrics(stages);

    // Build conversion data
    const conversionData: ConversionData[] = funnelMetrics.stages.map(stage => ({
      stage: stage.stage as LeadStage,
      count: stage.count,
      percentage: stage.percentage,
      dropoffRate: stage.dropoffRate,
      conversionRate: stage.percentage,
    }));

    const response: ApiResponse<ConversionData[]> = {
      success: true,
      data: conversionData,
      message: 'Conversion funnel data retrieved successfully',
    };

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    return handleApiError(error, 'Failed to fetch conversion data');
  }
}
