import { MessageStatus, MessageTemplate, Lead, Course } from '@/types';
import { supabaseAdmin } from '@/lib/supabase';
import { sendText, sendTemplate, toWaPhone, MetaApiError, OUTSIDE_WINDOW_ERROR_CODE } from '@/lib/meta-whatsapp';
import { buildSendComponents, fromTemplateRow } from '@/services/metaTemplateService';
import { getTemplateVariableValues, processTemplate } from '@/utils/templateUtils';

interface LegacyMedia {
  url?:     string;
  mediaId?: string;
  caption?: string;
  name?:    string;
}

interface SendOptions {
  leadId?: string;
  templateId?: string;
  scheduledAt?: Date | string;
  retryCount?: number;
  media?: LegacyMedia[];
  mediaImageUrl?: string;
  mediaVideoUrl?: string;
  existingMessageId?: string;
}

export interface SendResult {
  success: boolean;
  messageId?: string;
  waMessageId?: string;
  wapmonkeyMessageId?: string;
  error?: string;
  outsideWindow?: boolean;
}

const OUTSIDE_WINDOW_MESSAGE =
  'This contact has not messaged you in the last 24 hours, so WhatsApp only allows an approved template. Send a template instead.';

function describeError(err: unknown): { message: string; outsideWindow: boolean } {
  if (err instanceof MetaApiError) {
    if (err.code === OUTSIDE_WINDOW_ERROR_CODE) return { message: OUTSIDE_WINDOW_MESSAGE, outsideWindow: true };
    return { message: err.details ? `${err.message}: ${err.details}` : err.message, outsideWindow: false };
  }
  return { message: (err as Error)?.message || 'Unknown error', outsideWindow: false };
}

export class WhatsAppService {

  // ─── Public API ─────────────────────────────────────────────────────────────

  /**
   * Send a message (plain text or processed template) to a single phone number.
   */
  async sendTextMessage(to: string, message: string, options: SendOptions = {}): Promise<SendResult> {
    try {
      const waMessageId = await sendText(to, message);
      const record = await this.storeMessage({
        ...options,
        phone: to,
        content: message,
        status: MessageStatus.SENT,
        messageType: 'text',
        waMessageId,
      });
      return { success: true, messageId: record?.id, waMessageId, wapmonkeyMessageId: waMessageId };
    } catch (err) {
      const { message: errMsg, outsideWindow } = describeError(err);
      console.error('WhatsApp text send failed:', errMsg);
      if (options.leadId) {
        await this.storeMessage({
          ...options,
          phone: to,
          content: message,
          status: MessageStatus.FAILED,
          messageType: 'text',
          errorMessage: errMsg,
        });
      }
      return { success: false, error: errMsg, outsideWindow };
    }
  }

  async sendTemplateMessage(
    to: string,
    template: MessageTemplate,
    values: Record<string, string>,
    renderedContent: string,
    options: Pick<SendOptions, 'leadId' | 'retryCount' | 'existingMessageId'> = {}
  ): Promise<SendResult> {
    const base = {
      ...options,
      templateId: template.id,
      phone: to,
      content: renderedContent,
      messageType: 'template',
      mediaImageUrl: template.metaHeaderFormat === 'IMAGE' ? template.mediaImageUrl : undefined,
      mediaVideoUrl: template.metaHeaderFormat === 'VIDEO' ? template.mediaVideoUrl : undefined,
    };

    if (template.metaStatus !== 'APPROVED' || !template.metaName) {
      const errMsg = `Template "${template.name}" is not approved on WhatsApp yet (status: ${template.metaStatus || 'not submitted'}).`;
      if (options.leadId) await this.storeMessage({ ...base, status: MessageStatus.FAILED, errorMessage: errMsg });
      return { success: false, error: errMsg };
    }

    try {
      const waMessageId = await sendTemplate(
        to,
        template.metaName,
        template.metaLanguage || 'en',
        buildSendComponents(template, values)
      );
      const record = await this.storeMessage({ ...base, status: MessageStatus.SENT, waMessageId });
      return { success: true, messageId: record?.id, waMessageId, wapmonkeyMessageId: waMessageId };
    } catch (err) {
      const { message: errMsg } = describeError(err);
      console.error('WhatsApp template send failed:', errMsg);
      if (options.leadId) await this.storeMessage({ ...base, status: MessageStatus.FAILED, errorMessage: errMsg });
      return { success: false, error: errMsg };
    }
  }

  async sendTemplateToLead(
    lead: Lead,
    template: MessageTemplate,
    course?: Course,
    additionalVariables?: Record<string, string>,
    options: Pick<SendOptions, 'retryCount' | 'existingMessageId'> = {}
  ): Promise<SendResult> {
    const values = getTemplateVariableValues(template, lead, course, additionalVariables);
    const content = processTemplate(template, lead, course, additionalVariables).content
      .replace(/\{\{(\d+)\}\}/g, (m, n: string) => values[n] ?? m);
    return this.sendTemplateMessage(lead.mobile, template, values, content, { ...options, leadId: lead.id });
  }

  /**
   * Retry a previously failed message stored in the DB.
   */
  async retryMessage(
    messageId: string,
    maxRetries: number = 3
  ): Promise<{ success: boolean; error?: string }> {
    const { data: msg, error } = await supabaseAdmin
      .from('whatsapp_messages')
      .select('*')
      .eq('id', messageId)
      .single();

    if (error || !msg) return { success: false, error: 'Message not found' };
    if (msg.direction === 'inbound') return { success: false, error: 'Incoming messages cannot be retried' };
    if (msg.retry_count >= maxRetries) return { success: false, error: 'Maximum retries reached' };
    if (msg.status !== MessageStatus.FAILED) return { success: false, error: 'Message is not in failed state' };

    const { data: leadRow } = await supabaseAdmin
      .from('leads')
      .select('*')
      .eq('id', msg.lead_id)
      .single();

    if (!leadRow?.mobile) return { success: false, error: 'Lead phone number not found' };

    const retryOptions = { retryCount: (msg.retry_count || 0) + 1, existingMessageId: msg.id };

    if (msg.template_id) {
      const { data: templateRow } = await supabaseAdmin
        .from('message_templates')
        .select('*')
        .eq('id', msg.template_id)
        .single();

      if (templateRow) {
        const template = fromTemplateRow(templateRow);
        const { data: courseRow } = template.courseId
          ? await supabaseAdmin.from('courses').select('*').eq('id', template.courseId).single()
          : { data: null };
        return this.sendTemplateToLead(toLead(leadRow), template, courseRow ? toCourse(courseRow) : undefined, undefined, retryOptions);
      }
    }

    return this.sendTextMessage(leadRow.mobile, msg.content, { leadId: msg.lead_id, ...retryOptions });
  }

  /**
   * Validate that a phone is a valid Indian mobile number (format: 91XXXXXXXXXX).
   */
  isValidPhoneNumber(phone: string): boolean {
    return /^91\d{10}$/.test(toWaPhone(phone));
  }

  /**
   * Delivery statistics for a date range.
   */
  async getDeliveryStats(dateFrom: Date, dateTo: Date) {
    const { data } = await supabaseAdmin
      .from('whatsapp_messages')
      .select('status')
      .eq('direction', 'outbound')
      .gte('created_at', dateFrom.toISOString())
      .lte('created_at', dateTo.toISOString());

    const messages = data || [];
    const totalSent = messages.length;
    const delivered = messages.filter(m => m.status === MessageStatus.DELIVERED || m.status === MessageStatus.READ).length;
    const read = messages.filter(m => m.status === MessageStatus.READ).length;
    const failed = messages.filter(m => m.status === MessageStatus.FAILED).length;

    return {
      totalSent,
      delivered,
      read,
      failed,
      deliveryRate: totalSent ? Math.round((delivered / totalSent) * 10000) / 100 : 0,
      readRate: totalSent ? Math.round((read / totalSent) * 10000) / 100 : 0,
    };
  }

  // ─── Private helpers ─────────────────────────────────────────────────────────

  private async storeMessage(data: SendOptions & {
    phone:          string;
    content:        string;
    status:         MessageStatus;
    messageType:    string;
    waMessageId?:   string;
    errorMessage?:  string;
  }): Promise<{ id: string } | null> {
    const row = {
      lead_id:         data.leadId || null,
      template_id:     data.templateId || null,
      content:         data.content,
      status:          data.status,
      sent_at:         data.status === MessageStatus.SENT ? new Date().toISOString() : null,
      error_message:   data.errorMessage || null,
      retry_count:     data.retryCount || 0,
      media_image_url: data.mediaImageUrl || null,
      media_video_url: data.mediaVideoUrl || null,
      direction:       'outbound',
      wa_message_id:   data.waMessageId || null,
      phone:           toWaPhone(data.phone),
      message_type:    data.messageType,
      is_read:         true,
    };

    const query = data.existingMessageId
      ? supabaseAdmin.from('whatsapp_messages').update(row).eq('id', data.existingMessageId)
      : supabaseAdmin.from('whatsapp_messages').insert({ ...row, created_at: new Date().toISOString() });

    const { data: saved, error } = await query.select('id').single();

    if (error || !saved) {
      console.error('storeMessage DB error:', error);
      return null;
    }

    return saved;
  }
}

interface LeadRow {
  id: string;
  name: string;
  email: string;
  mobile: string;
  course_interest: string;
  stage: Lead['stage'];
  source: Lead['source'];
  created_at: string;
  updated_at: string;
  last_contacted_at: string | null;
  notes: string | null;
}

interface CourseRow {
  id: string;
  name: string;
  description: string;
  duration: string;
  price: number | null;
  course_type: Course['courseType'];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

function toLead(row: LeadRow): Lead {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    mobile: row.mobile,
    courseInterest: row.course_interest,
    stage: row.stage,
    source: row.source,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    lastContactedAt: row.last_contacted_at ? new Date(row.last_contacted_at) : undefined,
    notes: row.notes ?? undefined,
  };
}

function toCourse(row: CourseRow): Course {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    duration: row.duration,
    price: row.price ?? undefined,
    courseType: row.course_type,
    isActive: row.is_active,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

export const whatsappService = new WhatsAppService();
