import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { authenticateApiRequest } from '@/middleware/authMiddleware';
import { handleApiError } from '@/utils/apiErrorHandling';
import { validateDateRange } from '@/models/dashboard';

/**
 * POST /api/dashboard/export - Export dashboard data
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
    const { format, from, to } = body;

    if (!format || !from || !to) {
      return NextResponse.json(
        { success: false, error: 'Format and date range (from, to) are required' },
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

    // Fetch all data for export
    const { data: leads, error: leadsError } = await supabase
      .from('leads')
      .select('*')
      .gte('created_at', requestData.from.toISOString())
      .lte('created_at', requestData.to.toISOString())
      .order('created_at', { ascending: false });

    if (leadsError) {
      console.error('Failed to fetch leads:', leadsError);
      return NextResponse.json(
        { success: false, error: 'Failed to export dashboard data' },
        { status: 500 }
      );
    }

    // Fetch messages
    const { data: messages } = await supabase
      .from('whatsapp_messages')
      .select('*')
      .gte('created_at', requestData.from.toISOString())
      .lte('created_at', requestData.to.toISOString())
      .order('created_at', { ascending: false });

    // Fetch activities
    const { data: activities } = await supabase
      .from('activities')
      .select('*')
      .gte('created_at', requestData.from.toISOString())
      .lte('created_at', requestData.to.toISOString())
      .order('created_at', { ascending: false });

    // Generate CSV format
    if (format === 'csv') {
      // Leads CSV
      const leadsHeaders = ['ID', 'Name', 'Email', 'Mobile', 'Stage', 'Source', 'Course Interest', 'Created At'];
      const leadsRows = (leads || []).map(lead => [
        lead.id,
        lead.name,
        lead.email || '',
        lead.mobile,
        lead.stage,
        lead.source || '',
        lead.course_interest || '',
        new Date(lead.created_at).toLocaleString(),
      ]);

      const leadsCSV = [
        leadsHeaders.join(','),
        ...leadsRows.map(row => row.map(cell => `"${cell}"`).join(',')),
      ].join('\n');

      // Messages CSV
      const messagesHeaders = ['ID', 'Lead ID', 'Content', 'Status', 'Sent At', 'Created At'];
      const messagesRows = (messages || []).map(msg => [
        msg.id,
        msg.lead_id,
        msg.content.substring(0, 50) + '...',
        msg.status,
        msg.sent_at ? new Date(msg.sent_at).toLocaleString() : '',
        new Date(msg.created_at).toLocaleString(),
      ]);

      const messagesCSV = [
        messagesHeaders.join(','),
        ...messagesRows.map(row => row.map(cell => `"${cell}"`).join(',')),
      ].join('\n');

      // Activities CSV
      const activitiesHeaders = ['ID', 'Lead ID', 'Type', 'Description', 'Created At'];
      const activitiesRows = (activities || []).map(activity => [
        activity.id,
        activity.lead_id,
        activity.type,
        activity.description,
        new Date(activity.created_at).toLocaleString(),
      ]);

      const activitiesCSV = [
        activitiesHeaders.join(','),
        ...activitiesRows.map(row => row.map(cell => `"${cell}"`).join(',')),
      ].join('\n');

      // Combine all CSVs
      const combinedCSV = [
        '=== LEADS ===',
        leadsCSV,
        '',
        '=== MESSAGES ===',
        messagesCSV,
        '',
        '=== ACTIVITIES ===',
        activitiesCSV,
      ].join('\n');

      // Return CSV file
      return new NextResponse(combinedCSV, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="dashboard-export-${Date.now()}.csv"`,
        },
      });
    }

    // For other formats, return JSON
    const exportData = {
      leads: leads || [],
      messages: messages || [],
      activities: activities || [],
      exportedAt: new Date().toISOString(),
      dateRange: {
        from: requestData.from.toISOString(),
        to: requestData.to.toISOString(),
      },
    };

    return NextResponse.json(exportData, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="dashboard-export-${Date.now()}.json"`,
      },
    });

  } catch (error) {
    return handleApiError(error, 'Failed to export dashboard data');
  }
}
