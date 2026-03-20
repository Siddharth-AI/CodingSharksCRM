import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { authenticateApiRequest } from '@/middleware/authMiddleware';
import { handleApiError } from '@/utils/apiErrorHandling';
import { ApiResponse, TrendData } from '@/types';
import { validateTrendPeriod, generateTrendDataPoints, groupByPeriod } from '@/models/dashboard';

/**
 * GET /api/dashboard/trends - Get trend data
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
    const period = searchParams.get('period') as 'daily' | 'weekly' | 'monthly';
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    if (!period || !from || !to) {
      return NextResponse.json(
        { success: false, error: 'Period and date range (from, to) are required' },
        { status: 400 }
      );
    }

    const requestData = {
      period,
      from: new Date(from),
      to: new Date(to),
    };

    // Validate request
    const { error: validationError } = validateTrendPeriod(requestData);
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

    // Generate data points for the period
    const dataPoints = generateTrendDataPoints(requestData.from, requestData.to, period);

    // Fetch leads data
    const { data: leads, error: leadsError } = await supabase
      .from('leads')
      .select('created_at, stage')
      .gte('created_at', requestData.from.toISOString())
      .lte('created_at', requestData.to.toISOString());

    if (leadsError) {
      console.error('Failed to fetch leads:', leadsError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch trend data' },
        { status: 500 }
      );
    }

    // Fetch messages data
    const { data: messages, error: messagesError } = await supabase
      .from('whatsapp_messages')
      .select('created_at, status')
      .gte('created_at', requestData.from.toISOString())
      .lte('created_at', requestData.to.toISOString());

    if (messagesError) {
      console.error('Failed to fetch messages:', messagesError);
    }

    // Group data by period
    const leadsWithDate = (leads || []).map(l => ({
      date: new Date(l.created_at),
      stage: l.stage,
    }));

    const messagesWithDate = (messages || []).map(m => ({
      date: new Date(m.created_at),
      status: m.status,
    }));

    const groupedLeads = groupByPeriod(leadsWithDate, period);
    const groupedMessages = groupByPeriod(messagesWithDate, period);

    // Build trend data
    const trends: TrendData[] = dataPoints.map(date => {
      let key: string;
      
      switch (period) {
        case 'daily':
          key = date.toISOString().split('T')[0];
          break;
        case 'weekly':
          const weekStart = new Date(date);
          weekStart.setDate(weekStart.getDate() - weekStart.getDay());
          key = weekStart.toISOString().split('T')[0];
          break;
        case 'monthly':
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          break;
      }

      const periodLeads = groupedLeads[key] || [];
      const periodMessages = groupedMessages[key] || [];

      const newLeads = periodLeads.length;
      const convertedLeads = periodLeads.filter(l => l.stage === 'converted').length;
      const messagesSent = periodMessages.length;
      const messagesDelivered = periodMessages.filter(m => m.status === 'delivered' || m.status === 'read').length;

      return {
        date: date.toISOString(),
        newLeads,
        convertedLeads,
        conversionRate: newLeads > 0 ? Math.round((convertedLeads / newLeads) * 100 * 100) / 100 : 0,
        messagesSent,
        messagesDelivered,
        deliveryRate: messagesSent > 0 ? Math.round((messagesDelivered / messagesSent) * 100 * 100) / 100 : 0,
      };
    });

    const response: ApiResponse<TrendData[]> = {
      success: true,
      data: trends,
      message: 'Trend data retrieved successfully',
    };

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    return handleApiError(error, 'Failed to fetch trend data');
  }
}
