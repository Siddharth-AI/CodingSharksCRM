import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { updateMessageSchema } from '@/models/whatsappMessage';
import { authenticateApiRequest } from '@/middleware/authMiddleware';
import { handleApiError } from '@/utils/apiErrorHandling';
import { WhatsAppMessage, MessageStatus, ApiResponse } from '@/types';

/**
 * GET /api/messages/[id] - Get a specific WhatsApp message
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Apply authentication middleware
    const authResult = await authenticateApiRequest(request);
    if (!authResult.isAuthenticated) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: 401 }
      );
    }

    const { id } = await params;

    const { data, error } = await supabaseAdmin
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
        created_at,
        whatsapp_message_id,
        recipient_phone,
        metadata
      `)
      .eq('id', id)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { success: false, error: 'Message not found' },
        { status: 404 }
      );
    }

    const message: WhatsAppMessage = {
      id:            data.id,
      leadId:        data.lead_id,
      templateId:    data.template_id,
      content:       data.content,
      status:        data.status as MessageStatus,
      sentAt:        data.sent_at ? new Date(data.sent_at) : undefined,
      deliveredAt:   data.delivered_at ? new Date(data.delivered_at) : undefined,
      readAt:        data.read_at ? new Date(data.read_at) : undefined,
      errorMessage:  data.error_message,
      retryCount:    data.retry_count || 0,
      mediaImageUrl: data.media_image_url || undefined,
      mediaVideoUrl: data.media_video_url || undefined,
      createdAt:     new Date(data.created_at),
    };

    const response: ApiResponse<WhatsAppMessage> = {
      success: true,
      data: message,
    };

    return NextResponse.json(response);

  } catch (error) {
    return handleApiError(error, 'Failed to fetch message');
  }
}

/**
 * PUT /api/messages/[id] - Update a WhatsApp message
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Apply authentication middleware
    const authResult = await authenticateApiRequest(request);
    if (!authResult.isAuthenticated) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json();

    // Validate request body
    const { error: validationError, value: validatedData } = updateMessageSchema.validate(body);
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

    // Check if message exists
    const { data: existingMessage, error: fetchError } = await supabaseAdmin
      .from('whatsapp_messages')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !existingMessage) {
      return NextResponse.json(
        { success: false, error: 'Message not found' },
        { status: 404 }
      );
    }

    // Prepare update object
    const updateObject: any = {
      updated_at: new Date().toISOString(),
    };

    if (validatedData.status !== undefined) updateObject.status = validatedData.status;
    if (validatedData.deliveredAt !== undefined) updateObject.delivered_at = validatedData.deliveredAt.toISOString();
    if (validatedData.readAt !== undefined) updateObject.read_at = validatedData.readAt.toISOString();
    if (validatedData.errorMessage !== undefined) updateObject.error_message = validatedData.errorMessage;
    if (validatedData.retryCount !== undefined) updateObject.retry_count = validatedData.retryCount;
    if (validatedData.metadata !== undefined) updateObject.metadata = validatedData.metadata;

    // Update message
    const { data, error } = await supabaseAdmin
      .from('whatsapp_messages')
      .update(updateObject)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to update message' },
        { status: 500 }
      );
    }

    const message: WhatsAppMessage = {
      id: data.id,
      leadId: data.lead_id,
      templateId: data.template_id,
      content: data.content,
      status: data.status as MessageStatus,
      sentAt: data.sent_at ? new Date(data.sent_at) : undefined,
      deliveredAt: data.delivered_at ? new Date(data.delivered_at) : undefined,
      readAt: data.read_at ? new Date(data.read_at) : undefined,
      errorMessage: data.error_message,
      retryCount: data.retry_count || 0,
      createdAt: new Date(data.created_at),
    };

    const response: ApiResponse<WhatsAppMessage> = {
      success: true,
      data: message,
      message: 'Message updated successfully',
    };

    return NextResponse.json(response);

  } catch (error) {
    return handleApiError(error, 'Failed to update message');
  }
}

/**
 * DELETE /api/messages/[id] - Delete a WhatsApp message
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Apply authentication middleware
    const authResult = await authenticateApiRequest(request);
    if (!authResult.isAuthenticated) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Check if message exists
    const { data: existingMessage, error: fetchError } = await supabaseAdmin
      .from('whatsapp_messages')
      .select('id, status')
      .eq('id', id)
      .single();

    if (fetchError || !existingMessage) {
      return NextResponse.json(
        { success: false, error: 'Message not found' },
        { status: 404 }
      );
    }

    // Delete message
    const { error: deleteError } = await supabaseAdmin
      .from('whatsapp_messages')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Database error:', deleteError);
      return NextResponse.json(
        { success: false, error: 'Failed to delete message' },
        { status: 500 }
      );
    }

    const response: ApiResponse = {
      success: true,
      message: 'Message deleted successfully',
    };

    return NextResponse.json(response);

  } catch (error) {
    return handleApiError(error, 'Failed to delete message');
  }
}