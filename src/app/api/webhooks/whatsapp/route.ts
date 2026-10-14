import { NextRequest, NextResponse, after } from 'next/server';
import crypto from 'node:crypto';
import { supabaseAdmin } from '@/lib/supabase';
import { formatMobileNumber } from '@/models/lead';
import { LeadSource, LeadStage, MessageStatus } from '@/types';

interface WaMedia {
  id?: string;
  mime_type?: string;
  caption?: string;
  filename?: string;
}

interface WaMessage {
  id: string;
  from: string;
  timestamp?: string;
  type: string;
  text?: { body?: string };
  image?: WaMedia;
  video?: WaMedia;
  audio?: WaMedia;
  document?: WaMedia;
  sticker?: WaMedia;
  button?: { text?: string };
  interactive?: { button_reply?: { title?: string }; list_reply?: { title?: string } };
  location?: { name?: string; address?: string; latitude?: number; longitude?: number };
  contacts?: Array<{ name?: { formatted_name?: string }; phones?: Array<{ phone?: string }> }>;
  reaction?: { emoji?: string };
}

interface WaStatus {
  id: string;
  status: string;
  timestamp?: string;
  errors?: Array<{ title?: string; message?: string; error_data?: { details?: string } }>;
}

interface WaChangeValue {
  metadata?: { phone_number_id?: string };
  contacts?: Array<{ wa_id: string; profile?: { name?: string } }>;
  messages?: WaMessage[];
  statuses?: WaStatus[];
  event?: string;
  message_template_id?: string | number;
  reason?: string;
  new_category?: string;
}

interface WaWebhookBody {
  object?: string;
  entry?: Array<{ changes?: Array<{ field: string; value?: WaChangeValue }> }>;
}

const errorText = (err: unknown) => (err instanceof Error ? err.message : String(err));

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');
  const expected = process.env.WHATSAPP_VERIFY_TOKEN;

  if (mode === 'subscribe' && expected && token === expected && challenge) {
    return new NextResponse(challenge, { status: 200 });
  }

  return new NextResponse('Forbidden', { status: 403 });
}

function hasValidSignature(rawBody: string, header: string | null): boolean {
  const secret = process.env.WHATSAPP_APP_SECRET;
  if (!secret || !header?.startsWith('sha256=')) return false;
  const expected = crypto.createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex');
  const received = header.slice('sha256='.length);
  if (received.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(received, 'hex'), Buffer.from(expected, 'hex'));
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();

  if (!hasValidSignature(rawBody, request.headers.get('x-hub-signature-256'))) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  let body: WaWebhookBody;
  try {
    body = JSON.parse(rawBody) as WaWebhookBody;
  } catch {
    return NextResponse.json({ ok: true });
  }

  if (body?.object !== 'whatsapp_business_account') {
    return NextResponse.json({ ok: true });
  }

  after(() =>
    processWebhook(body).catch(err => console.error('[whatsapp/webhook] processing error:', errorText(err)))
  );

  return NextResponse.json({ ok: true });
}

async function processWebhook(body: WaWebhookBody) {
  const ourPhoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  for (const entry of body.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value: WaChangeValue = change.value ?? {};

      if (change.field === 'messages') {
        if (ourPhoneNumberId && value.metadata?.phone_number_id && value.metadata.phone_number_id !== ourPhoneNumberId) {
          continue;
        }

        const names = new Map<string, string>(
          (value.contacts ?? []).map(c => [c.wa_id, c.profile?.name || ''])
        );

        for (const message of value.messages ?? []) {
          await handleInbound(message, names.get(message.from) || '').catch(err =>
            console.error('[whatsapp/webhook] inbound failed:', message?.id, errorText(err))
          );
        }

        for (const status of value.statuses ?? []) {
          await handleStatus(status).catch(err =>
            console.error('[whatsapp/webhook] status failed:', status?.id, errorText(err))
          );
        }
      } else if (change.field === 'message_template_status_update') {
        await handleTemplateStatus(value).catch(err =>
          console.error('[whatsapp/webhook] template status failed:', value?.message_template_id, errorText(err))
        );
      } else if (change.field === 'template_category_update') {
        await handleTemplateCategory(value).catch(err =>
          console.error('[whatsapp/webhook] template category failed:', value?.message_template_id, errorText(err))
        );
      }
    }
  }
}

const MEDIA_TYPES = ['image', 'video', 'audio', 'document', 'sticker'] as const;
type MediaType = typeof MEDIA_TYPES[number];
const isMediaType = (t: string): t is MediaType => (MEDIA_TYPES as readonly string[]).includes(t);

function describeInbound(message: WaMessage): { content: string; mediaId?: string; mimeType?: string } {
  const type = message.type;

  if (type === 'text') return { content: message.text?.body ?? '' };

  if (isMediaType(type)) {
    const media: WaMedia = message[type] ?? {};
    const label = `[${type.charAt(0).toUpperCase()}${type.slice(1)}${media.filename ? `: ${media.filename}` : ''}]`;
    return { content: media.caption ? `${label} ${media.caption}` : label, mediaId: media.id, mimeType: media.mime_type };
  }

  if (type === 'button') return { content: message.button?.text ?? '[Button]' };

  if (type === 'interactive') {
    const i = message.interactive ?? {};
    return { content: i.button_reply?.title || i.list_reply?.title || '[Interactive reply]' };
  }

  if (type === 'location') {
    const l = message.location ?? {};
    return { content: `[Location] ${[l.name, l.address].filter(Boolean).join(', ')} (${l.latitude}, ${l.longitude})`.trim() };
  }

  if (type === 'contacts') {
    const c = message.contacts?.[0];
    return { content: `[Contact] ${c?.name?.formatted_name || ''} ${c?.phones?.[0]?.phone || ''}`.trim() };
  }

  if (type === 'reaction') return { content: `[Reaction] ${message.reaction?.emoji || ''}`.trim() };

  return { content: `[Unsupported message: ${type}]` };
}

async function findOrCreateLead(mobile: string, profileName: string): Promise<string> {
  const { data: existing } = await supabaseAdmin
    .from('leads')
    .select('id')
    .eq('mobile', mobile)
    .order('created_at', { ascending: false })
    .limit(1);

  if (existing && existing.length > 0) return existing[0].id;

  const now = new Date().toISOString();
  const { data: created, error } = await supabaseAdmin
    .from('leads')
    .insert({
      name:       (profileName || mobile).slice(0, 100),
      email:      '',
      mobile,
      source:     LeadSource.WHATSAPP,
      stage:      LeadStage.NEW,
      notes:      null,
    })
    .select('id')
    .single();

  if (error || !created) throw new Error(`Failed to create lead: ${error?.message}`);

  const { data: contenders } = await supabaseAdmin
    .from('leads')
    .select('id')
    .eq('mobile', mobile)
    .order('created_at', { ascending: true })
    .order('id', { ascending: true })
    .limit(1);

  const winnerId = contenders?.[0]?.id;
  if (winnerId && winnerId !== created.id) {
    await supabaseAdmin.from('leads').delete().eq('id', created.id);
    return winnerId;
  }

  await supabaseAdmin.from('activities').insert({
    lead_id:     created.id,
    type:        'lead_created',
    description: `Lead created from incoming WhatsApp message: ${profileName || mobile}`,
    metadata:    { source: 'whatsapp' },
    created_at:  now,
  });

  return created.id;
}

async function handleInbound(message: WaMessage, profileName: string) {
  if (!message?.id || !message?.from) return;

  const { data: duplicate } = await supabaseAdmin
    .from('whatsapp_messages')
    .select('id')
    .eq('wa_message_id', message.id)
    .maybeSingle();
  if (duplicate) return;

  const mobile = formatMobileNumber(message.from);
  const leadId = await findOrCreateLead(mobile, profileName);
  const { content, mediaId, mimeType } = describeInbound(message);
  const receivedAt = message.timestamp ? new Date(Number(message.timestamp) * 1000).toISOString() : new Date().toISOString();

  const { error } = await supabaseAdmin.from('whatsapp_messages').insert({
    lead_id:         leadId,
    content:         content || ' ',
    status:          MessageStatus.DELIVERED,
    delivered_at:    receivedAt,
    direction:       'inbound',
    wa_message_id:   message.id,
    phone:           message.from,
    message_type:    message.type,
    media_id:        mediaId || null,
    media_mime_type: mimeType || null,
    is_read:         false,
    retry_count:     0,
    created_at:      receivedAt,
  });

  if (error && error.code !== '23505') throw new Error(error.message);
}

const STATUS_RANK: Record<string, number> = { pending: 0, failed: 0, sent: 1, delivered: 2, read: 3 };

async function handleStatus(status: WaStatus) {
  if (!status?.id || !status?.status) return;

  const { data: row } = await supabaseAdmin
    .from('whatsapp_messages')
    .select('id, status, delivered_at, read_at')
    .eq('wa_message_id', status.id)
    .maybeSingle();

  if (!row) return;

  const at = status.timestamp ? new Date(Number(status.timestamp) * 1000).toISOString() : new Date().toISOString();
  const update: Record<string, unknown> = {};

  if (status.status === 'failed') {
    const e = status.errors?.[0];
    update.status = MessageStatus.FAILED;
    update.error_message = [e?.title || e?.message, e?.error_data?.details].filter(Boolean).join(': ') || 'Delivery failed';
  } else {
    const next = STATUS_RANK[status.status];
    if (next === undefined) return;
    if (next > (STATUS_RANK[row.status] ?? 0) || row.status === MessageStatus.FAILED) update.status = status.status;
    if ((status.status === 'delivered' || status.status === 'read') && !row.delivered_at) update.delivered_at = at;
    if (status.status === 'read' && !row.read_at) update.read_at = at;
  }

  if (Object.keys(update).length === 0) return;

  const { error } = await supabaseAdmin.from('whatsapp_messages').update(update).eq('id', row.id);
  if (error) throw new Error(error.message);
}

async function handleTemplateStatus(value: WaChangeValue) {
  const metaTemplateId = value?.message_template_id ? String(value.message_template_id) : null;
  if (!metaTemplateId || !value.event) return;

  const { data: row } = await supabaseAdmin
    .from('message_templates')
    .select('id, meta_status')
    .eq('meta_template_id', metaTemplateId)
    .maybeSingle();

  if (!row || row.meta_status === 'EDITED') return;

  const { error } = await supabaseAdmin
    .from('message_templates')
    .update({
      meta_status: value.event,
      meta_rejection_reason: value.event === 'REJECTED' && value.reason && value.reason !== 'NONE' ? value.reason : null,
    })
    .eq('id', row.id);

  if (error) throw new Error(error.message);
}

async function handleTemplateCategory(value: WaChangeValue) {
  const metaTemplateId = value?.message_template_id ? String(value.message_template_id) : null;
  const category = value?.new_category;
  if (!metaTemplateId || (category !== 'MARKETING' && category !== 'UTILITY')) return;

  const { error } = await supabaseAdmin
    .from('message_templates')
    .update({ meta_category: category })
    .eq('meta_template_id', metaTemplateId);

  if (error) throw new Error(error.message);
}
