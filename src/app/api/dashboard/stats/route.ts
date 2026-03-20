import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { authenticateApiRequest } from '@/middleware/authMiddleware';
import { handleApiError } from '@/utils/apiErrorHandling';
import { ApiResponse, DashboardStats, LeadStage } from '@/types';
import { validateDashboardStatsRequest, calculateConversionRate, calculateTimeToConversion } from '@/models/dashboard';

/**
 * GET /api/dashboard/stats - Get dashboard statistics
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
    const courseId = searchParams.get('courseId');
    const source = searchParams.get('source');

    if (!from || !to) {
      return NextResponse.json(
        { success: false, error: 'Date range (from, to) is required' },
        { status: 400 }
      );
    }

    const requestData = {
      from: new Date(from),
      to: new Date(to),
      ...(courseId ? { courseId } : {}),
      ...(source ? { source } : {}),
    };

    // Validate request
    const { error: validationError } = validateDashboardStatsRequest(requestData);
    if (validationError) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid request parameters',
          details: validationError.details.map(d => ({
            field: d.path.join('.'),
            message: d.message,
          }))
        },
        { status: 400 }
      );
    }

    // Build base query
    let leadsQuery = supabase
      .from('leads')
      .select('*')
      .gte('created_at', requestData.from.toISOString())
      .lte('created_at', requestData.to.toISOString());

    if (courseId) {
      leadsQuery = leadsQuery.eq('course_interest', courseId);
    }

    if (source) {
      leadsQuery = leadsQuery.eq('source', source);
    }

    const { data: leads, error: leadsError } = await leadsQuery;

    if (leadsError) {
      console.error('Failed to fetch leads:', leadsError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch dashboard statistics' },
        { status: 500 }
      );
    }

    // Calculate statistics
    const totalLeads = leads?.length || 0;
    const newLeads = leads?.filter(l => l.stage === LeadStage.NEW).length || 0;
    const contactedLeads = leads?.filter(l => l.stage === LeadStage.CONTACTED).length || 0;
    const interestedLeads = leads?.filter(l => l.stage === LeadStage.INTERESTED).length || 0;
    const convertedLeads = leads?.filter(l => l.stage === LeadStage.CONVERTED).length || 0;

    // Calculate conversion rate
    const conversionRate = calculateConversionRate(convertedLeads, totalLeads);

    // Group by stage
    const byStage: Record<string, number> = {
      [LeadStage.NEW]: newLeads,
      [LeadStage.CONTACTED]: contactedLeads,
      [LeadStage.INTERESTED]: interestedLeads,
      [LeadStage.CONVERTED]: convertedLeads,
    };

    // Group by source
    const bySource: Record<string, number> = {};
    leads?.forEach(lead => {
      const source = lead.source || 'Unknown';
      bySource[source] = (bySource[source] || 0) + 1;
    });

    // Group by course
    const byCourse: Record<string, number> = {};
    leads?.forEach(lead => {
      if (lead.course_interest) {
        byCourse[lead.course_interest] = (byCourse[lead.course_interest] || 0) + 1;
      }
    });

    // Calculate average time to conversion
    const convertedLeadsWithTime = leads?.filter(l => 
      l.stage === LeadStage.CONVERTED && l.updated_at
    ) || [];
    
    const conversionTimes = convertedLeadsWithTime.map(l => 
      calculateTimeToConversion(new Date(l.created_at), new Date(l.updated_at))
    );
    
    const averageTimeToConversion = conversionTimes.length > 0
      ? Math.round(conversionTimes.reduce((sum, time) => sum + time, 0) / conversionTimes.length)
      : 0;

    // Get message statistics
    let messagesQuery = supabase
      .from('whatsapp_messages')
      .select('status')
      .gte('created_at', requestData.from.toISOString())
      .lte('created_at', requestData.to.toISOString());

    const { data: messages } = await messagesQuery;

    const totalMessages = messages?.length || 0;
    const sentMessages = messages?.filter(m => m.status === 'sent' || m.status === 'delivered' || m.status === 'read').length || 0;
    const deliveredMessages = messages?.filter(m => m.status === 'delivered' || m.status === 'read').length || 0;
    const failedMessages = messages?.filter(m => m.status === 'failed').length || 0;

    const messageDeliveryRate = calculateConversionRate(deliveredMessages, sentMessages);

    // Get activity count
    let activitiesQuery = supabase
      .from('activities')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', requestData.from.toISOString())
      .lte('created_at', requestData.to.toISOString());

    const { count: totalActivities } = await activitiesQuery;

    const stats: DashboardStats = {
      totalLeads,
      newLeads,
      contactedLeads,
      interestedLeads,
      convertedLeads,
      conversionRate,
      byStage,
      bySource,
      byCourse,
      averageTimeToConversion,
      totalMessages,
      sentMessages,
      deliveredMessages,
      failedMessages,
      messageDeliveryRate,
      totalActivities: totalActivities || 0,
    };

    const response: ApiResponse<DashboardStats> = {
      success: true,
      data: stats,
      message: 'Dashboard statistics retrieved successfully',
    };

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    return handleApiError(error, 'Failed to fetch dashboard statistics');
  }
}
