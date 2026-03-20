import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { authenticateApiRequest } from '@/middleware/authMiddleware';
import { handleApiError } from '@/utils/apiErrorHandling';
import { WhatsAppMessage, MessageStatus, ApiResponse, PaginatedResponse } from '@/types';

/**
 * GET /api/messages - Get WhatsApp messages with filtering and pagination
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
    
    // Parse query parameters
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const leadId = searchParams.get('leadId');
    const templateId = searchParams.get('templateId');
    const status = searchParams.get('status') as MessageStatus;
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const sortBy = searchParams.get('sortBy') || 'created_at';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // Build query
    let query = supabaseAdmin
      .from('whatsapp_messages')
      .select(`
        id,
        lead_id,
        template_id,
        content,
        status,
        sent_at,
        delivered_at,
        read_at,
        error_message,
        retry_count,
        media_image_url,
        media_video_url,
        created_at
      `, { count: 'exact' });

    // Apply filters
    if (leadId) {
      query = query.eq('lead_id', leadId);
    }

    if (templateId) {
      query = query.eq('template_id', templateId);
    }

    if (status) {
      query = query.eq('status', status);
    }

    if (dateFrom) {
      query = query.gte('created_at', dateFrom);
    }

    if (dateTo) {
      query = query.lte('created_at', dateTo);
    }

    // Apply sorting
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });

    // Apply pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch messages' },
        { status: 500 }
      );
    }

    // Transform data to match interface
    const messages: WhatsAppMessage[] = (data || []).map(item => ({
      id:            item.id,
      leadId:        item.lead_id,
      templateId:    item.template_id,
      content:       item.content,
      status:        item.status as MessageStatus,
      sentAt:        item.sent_at ? new Date(item.sent_at) : undefined,
      deliveredAt:   item.delivered_at ? new Date(item.delivered_at) : undefined,
      readAt:        item.read_at ? new Date(item.read_at) : undefined,
      errorMessage:  item.error_message,
      retryCount:    item.retry_count || 0,
      mediaImageUrl: item.media_image_url || undefined,
      mediaVideoUrl: item.media_video_url || undefined,
      createdAt:     new Date(item.created_at),
    }));

    const response: PaginatedResponse<WhatsAppMessage> = {
      data: messages,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    };

    return NextResponse.json({
      success: true,
      data: response.data,
      pagination: response.pagination,
    });

  } catch (error) {
    return handleApiError(error, 'Failed to fetch messages');
  }
}