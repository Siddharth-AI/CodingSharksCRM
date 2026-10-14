import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { authenticateApiRequest } from '@/middleware/authMiddleware';
import { handleApiError } from '@/utils/apiErrorHandling';
import { InboxConversation, MessageDirection } from '@/types';

const RECENT_MESSAGE_SCAN = 3000;
const MAX_CONVERSATIONS = 300;
const WINDOW_MS = 24 * 60 * 60 * 1000;
const LEAD_BATCH = 150;

export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateApiRequest(request);
    if (!authResult.isAuthenticated) {
      return NextResponse.json({ success: false, error: authResult.error }, { status: 401 });
    }

    const search = (request.nextUrl.searchParams.get('search') || '').trim().toLowerCase();

    const [{ data: recent, error }, { data: unreadRows }] = await Promise.all([
      supabaseAdmin
        .from('whatsapp_messages')
        .select('lead_id, content, direction, status, message_type, created_at')
        .not('lead_id', 'is', null)
        .order('created_at', { ascending: false })
        .limit(RECENT_MESSAGE_SCAN),
      supabaseAdmin
        .from('whatsapp_messages')
        .select('lead_id')
        .eq('direction', 'inbound')
        .eq('is_read', false),
    ]);

    if (error) {
      return NextResponse.json({ success: false, error: 'Failed to load conversations' }, { status: 500 });
    }

    const unread = new Map<string, number>();
    for (const r of unreadRows || []) unread.set(r.lead_id, (unread.get(r.lead_id) || 0) + 1);

    const byLead = new Map<string, Omit<InboxConversation, 'name' | 'mobile' | 'windowOpen' | 'unread'>>();
    for (const m of recent || []) {
      const existing = byLead.get(m.lead_id);
      if (!existing) {
        byLead.set(m.lead_id, {
          leadId: m.lead_id,
          lastMessage: m.content,
          lastMessageType: m.message_type || 'text',
          lastDirection: (m.direction || 'outbound') as MessageDirection,
          lastStatus: m.status,
          lastAt: m.created_at,
          lastInboundAt: m.direction === 'inbound' ? m.created_at : undefined,
        });
      } else if (!existing.lastInboundAt && m.direction === 'inbound') {
        existing.lastInboundAt = m.created_at;
      }
    }

    const leadIds = [...byLead.keys()];
    const leads = new Map<string, { name: string; mobile: string }>();
    for (let i = 0; i < leadIds.length; i += LEAD_BATCH) {
      const { data } = await supabaseAdmin
        .from('leads')
        .select('id, name, mobile')
        .in('id', leadIds.slice(i, i + LEAD_BATCH));
      for (const l of data || []) leads.set(l.id, { name: l.name, mobile: l.mobile });
    }

    const now = Date.now();
    const conversations: InboxConversation[] = [];
    for (const c of byLead.values()) {
      const lead = leads.get(c.leadId);
      if (!lead) continue;
      if (search && !lead.name.toLowerCase().includes(search) && !lead.mobile.includes(search)) continue;
      conversations.push({
        ...c,
        name: lead.name,
        mobile: lead.mobile,
        unread: unread.get(c.leadId) || 0,
        windowOpen: !!c.lastInboundAt && now - new Date(c.lastInboundAt).getTime() < WINDOW_MS,
      });
      if (conversations.length >= MAX_CONVERSATIONS) break;
    }

    const totalUnread = [...unread.values()].reduce((a, b) => a + b, 0);

    return NextResponse.json({ success: true, data: conversations, meta: { totalUnread } });
  } catch (error) {
    return handleApiError(error, 'Failed to load conversations');
  }
}
