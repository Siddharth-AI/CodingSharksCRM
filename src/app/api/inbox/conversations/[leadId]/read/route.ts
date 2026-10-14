import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { authenticateApiRequest } from '@/middleware/authMiddleware';
import { handleApiError } from '@/utils/apiErrorHandling';
import { markAsRead } from '@/lib/meta-whatsapp';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(
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

    const { data: unread, error } = await supabaseAdmin
      .from('whatsapp_messages')
      .update({ is_read: true })
      .eq('lead_id', leadId)
      .eq('direction', 'inbound')
      .eq('is_read', false)
      .select('wa_message_id, created_at');

    if (error) {
      return NextResponse.json({ success: false, error: 'Failed to mark messages as read' }, { status: 500 });
    }

    const latest = (unread || [])
      .filter(m => m.wa_message_id)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

    if (latest) {
      await markAsRead(latest.wa_message_id).catch(err =>
        console.error('Failed to send read receipt to WhatsApp:', err?.message || err)
      );
    }

    return NextResponse.json({ success: true, data: { marked: unread?.length || 0 } });
  } catch (error) {
    return handleApiError(error, 'Failed to mark messages as read');
  }
}
