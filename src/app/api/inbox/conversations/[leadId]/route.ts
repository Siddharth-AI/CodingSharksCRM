import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { authenticateApiRequest } from '@/middleware/authMiddleware';
import { handleApiError } from '@/utils/apiErrorHandling';
import { CourseType, InboxThread, Lead, MessageStatus, WhatsAppMessage } from '@/types';

const THREAD_LIMIT = 300;
const WINDOW_MS = 24 * 60 * 60 * 1000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ leadId: string }> }
) {
  try {
    const authResult = await authenticateApiRequest(request);
    if (!authResult.isAuthenticated) {
      return NextResponse.json({ success: false, error: authResult.error }, { status: 401 });
    }

    const { leadId } = await params;
    if (!UUID.test(leadId)) {
      return NextResponse.json({ success: false, error: 'Invalid lead ID format' }, { status: 400 });
    }

    const [{ data: leadRow, error: leadError }, { data: rows, error: messagesError }] = await Promise.all([
      supabaseAdmin.from('leads').select('*, courses(id, name, course_type)').eq('id', leadId).single(),
      supabaseAdmin
        .from('whatsapp_messages')
        .select('*')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false })
        .limit(THREAD_LIMIT),
    ]);

    if (leadError || !leadRow) {
      return NextResponse.json({ success: false, error: 'Lead not found' }, { status: 404 });
    }
    if (messagesError) {
      return NextResponse.json({ success: false, error: 'Failed to load messages' }, { status: 500 });
    }

    const lead: Lead = {
      id: leadRow.id,
      name: leadRow.name,
      email: leadRow.email,
      mobile: leadRow.mobile,
      courseInterest: leadRow.course_interest,
      stage: leadRow.stage,
      source: leadRow.source,
      createdAt: new Date(leadRow.created_at),
      updatedAt: new Date(leadRow.updated_at),
      lastContactedAt: leadRow.last_contacted_at ? new Date(leadRow.last_contacted_at) : undefined,
      notes: leadRow.notes,
    };

    const messages: WhatsAppMessage[] = (rows || []).reverse().map(m => ({
      id: m.id,
      leadId: m.lead_id,
      templateId: m.template_id || undefined,
      content: m.content,
      status: m.status as MessageStatus,
      sentAt: m.sent_at ? new Date(m.sent_at) : undefined,
      deliveredAt: m.delivered_at ? new Date(m.delivered_at) : undefined,
      readAt: m.read_at ? new Date(m.read_at) : undefined,
      errorMessage: m.error_message || undefined,
      retryCount: m.retry_count || 0,
      createdAt: new Date(m.created_at),
      mediaImageUrl: m.media_image_url || undefined,
      mediaVideoUrl: m.media_video_url || undefined,
      direction: m.direction,
      waMessageId: m.wa_message_id || undefined,
      phone: m.phone || undefined,
      messageType: m.message_type,
      mediaId: m.media_id || undefined,
      mediaMimeType: m.media_mime_type || undefined,
      isRead: m.is_read,
    }));

    const lastInbound = [...messages].reverse().find(m => m.direction === 'inbound');
    const lastInboundAt = lastInbound?.createdAt.toISOString();

    const courseRow = leadRow.courses as { id: string; name: string; course_type: CourseType } | null;

    const thread: InboxThread = {
      lead,
      course: courseRow ? { id: courseRow.id, name: courseRow.name, courseType: courseRow.course_type } : undefined,
      group: !courseRow ? 'personal' : courseRow.course_type === 'workshop' ? 'workshop' : 'course',
      messages,
      lastInboundAt,
      windowOpen: !!lastInbound && Date.now() - lastInbound.createdAt.getTime() < WINDOW_MS,
    };

    return NextResponse.json({ success: true, data: thread });
  } catch (error) {
    return handleApiError(error, 'Failed to load conversation');
  }
}
