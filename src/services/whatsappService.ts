import axios from 'axios';
import { MessageStatus } from '@/types';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * Wapmonkey WhatsApp API Service
 * POST https://api.wapmonkey.com/v1/sendmessage
 *
 * Exact request body format (from Wapmonkey docs):
 *   message:      "your message"
 *   numbers:      "919876543210"        ← single string, digits only
 *   device_token: "your_device_token"
 *   delay:        2                     ← 0–10 seconds (optional)
 *   schedule:     "2026-03-20T10:00:00Z" ← UTC ISO string (optional)
 *   media:        [{ url|mediaId, caption, name }] (optional)
 *
 * Headers:
 *   Authorization: <API_KEY>   ← no "Bearer" prefix
 *   Content-Type:  application/json
 */

interface WapmonkeyMedia {
  url?:     string;    // public URL of the media file
  mediaId?: string;    // Wapmonkey-hosted media ID (use instead of url)
  caption?: string;
  name?:    string;
}

interface WapmonkeyRequestBody {
  message:      string;
  numbers:      string;    // single phone number — digits only with country code
  device_token: string;
  delay?:       number;    // 0–10 seconds
  schedule?:    string;    // UTC ISO datetime
  media?:       WapmonkeyMedia[];
}

interface WapmonkeyResponse {
  status:      number | boolean;  // Wapmonkey returns 1 (number), not true (boolean)
  description?: string;           // success/failure description
  message?:    string;            // fallback field
  data?:       Record<string, unknown>;
}

export class WhatsAppService {
  private readonly apiKey: string;
  private readonly deviceToken: string;
  private readonly baseUrl: string;

  constructor() {
    this.apiKey = process.env.WAPMONKEY_API_KEY || '';
    this.deviceToken = process.env.WAPMONKEY_DEVICE_TOKEN || '';
    this.baseUrl = process.env.WAPMONKEY_BASE_URL || 'https://api.wapmonkey.com/v1';
  }

  // ─── Public API ─────────────────────────────────────────────────────────────

  /**
   * Send a message (plain text or processed template) to a single phone number.
   */
  async sendTextMessage(
    to: string,
    message: string,
    options: {
      leadId?: string;
      templateId?: string;
      scheduledAt?: Date | string;
      retryCount?: number;
      media?: WapmonkeyMedia[];
      mediaImageUrl?: string;
      mediaVideoUrl?: string;
    } = {}
  ): Promise<{
    success: boolean;
    messageId?: string;
    wapmonkeyMessageId?: string;
    error?: string;
  }> {
    // Wapmonkey needs digits-only with country code, no "+"
    const phone = this.formatPhone(to);

    const body: WapmonkeyRequestBody = {
      message,
      numbers: phone,
      device_token: this.deviceToken,
      ...(options.scheduledAt ? { schedule: new Date(options.scheduledAt).toISOString() } : {}),
      ...(options.media ? { media: options.media } : {}),
    };

    console.log('Wapmonkey request →', JSON.stringify({ url: `${this.baseUrl}/sendmessage`, phone, body: { ...body, message: body.message.substring(0, 80) } }, null, 2));

    try {
      const resp = await axios.post<WapmonkeyResponse>(
        `${this.baseUrl}/sendmessage`,
        body,
        {
          headers: {
            Authorization: this.apiKey,   // no "Bearer" prefix for Wapmonkey
            'Content-Type': 'application/json',
          },
          timeout: 30_000,
        }
      );

      console.log('Wapmonkey response ←', resp.status, resp.data);

      // Wapmonkey returns status:1 (number) on success, not boolean true
      const ok = !!resp.data?.status;
      const wapmonkeyMessageId = String(
        resp.data?.data?.messageId ||   // actual Wapmonkey field name
        resp.data?.data?.id        ||
        ''
      );
      // Wapmonkey uses "description" field, not "message"
      const apiMessage = resp.data?.description || resp.data?.message || '';

      const record = await this.storeMessage({
        leadId:        options.leadId,
        templateId:    options.templateId,
        content:       message,
        status:        ok ? MessageStatus.SENT : MessageStatus.FAILED,
        errorMessage:  ok ? undefined : apiMessage,
        retryCount:    options.retryCount || 0,
        mediaImageUrl: options.mediaImageUrl,
        mediaVideoUrl: options.mediaVideoUrl,
      });

      if (!ok) {
        return { success: false, error: apiMessage || 'Wapmonkey returned failure status' };
      }

      return { success: true, messageId: record.id, wapmonkeyMessageId };

    } catch (err: unknown) {
      // Capture the full Wapmonkey error response body, not just the axios message
      type AxiosErr = { response?: { status?: number; data?: unknown }; message?: string };
      const e = err as AxiosErr;
      const resData = e?.response?.data;
      const resStatus = e?.response?.status;

      let errMsg: string;
      if (resData && typeof resData === 'object') {
        errMsg = (resData as Record<string, unknown>).message as string
          || JSON.stringify(resData);
      } else {
        errMsg = e?.message || 'Unknown error';
      }

      console.error(`Wapmonkey error [${resStatus}]:`, resData || errMsg);

      if (options.leadId) {
        await this.storeMessage({
          leadId: options.leadId,
          templateId: options.templateId,
          content: message,
          status: MessageStatus.FAILED,
          errorMessage: errMsg,
          retryCount: options.retryCount || 0,
        }).catch(storeErr => console.error('Failed to store failed message:', storeErr));
      }

      return { success: false, error: errMsg };
    }
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
    if (msg.retry_count >= maxRetries) return { success: false, error: 'Maximum retries reached' };
    if (msg.status !== MessageStatus.FAILED) return { success: false, error: 'Message is not in failed state' };

    // Fetch lead's phone number since we don't store it on the message record
    const { data: lead } = await supabaseAdmin
      .from('leads')
      .select('mobile')
      .eq('id', msg.lead_id)
      .single();

    if (!lead?.mobile) return { success: false, error: 'Lead phone number not found' };

    const result = await this.sendTextMessage(
      lead.mobile,
      msg.content,
      { leadId: msg.lead_id, templateId: msg.template_id, retryCount: msg.retry_count + 1 }
    );

    if (result.success) {
      await supabaseAdmin
        .from('whatsapp_messages')
        .update({ status: MessageStatus.SENT, retry_count: msg.retry_count + 1, updated_at: new Date().toISOString() })
        .eq('id', messageId);
    }

    return result;
  }

  /**
   * Validate that a phone is a valid Indian mobile number (Wapmonkey format: 91XXXXXXXXXX).
   */
  isValidPhoneNumber(phone: string): boolean {
    return /^91\d{10}$/.test(this.formatPhone(phone));
  }

  /**
   * Delivery statistics for a date range.
   */
  async getDeliveryStats(dateFrom: Date, dateTo: Date) {
    const { data } = await supabaseAdmin
      .from('whatsapp_messages')
      .select('status')
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

  /**
   * Format phone to Wapmonkey-compatible format: digits only with country code.
   * Input:  "+919876543210" | "9876543210" | "919876543210"
   * Output: "919876543210"
   */
  private formatPhone(phone: string): string {
    const digits = phone.replace(/[^\d]/g, '');
    if (digits.startsWith('91') && digits.length === 12) return digits;
    if (digits.length === 10) return `91${digits}`;
    return digits;
  }

  private async storeMessage(data: {
    leadId?:        string;
    templateId?:    string;
    content:        string;
    status:         MessageStatus;
    errorMessage?:  string;
    retryCount:     number;
    mediaImageUrl?: string;
    mediaVideoUrl?: string;
  }): Promise<{ id: string }> {
    const { data: row, error } = await supabaseAdmin
      .from('whatsapp_messages')
      .insert({
        lead_id:         data.leadId || null,
        template_id:     data.templateId || null,
        content:         data.content,
        status:          data.status,
        sent_at:         data.status === MessageStatus.SENT ? new Date().toISOString() : null,
        error_message:   data.errorMessage || null,
        retry_count:     data.retryCount,
        media_image_url: data.mediaImageUrl || null,
        media_video_url: data.mediaVideoUrl || null,
        created_at:      new Date().toISOString(),
      })
      .select('id')
      .single();

    if (error || !row) {
      console.error('storeMessage DB error:', error);
      throw new Error(`Failed to store message: ${error?.message}`);
    }

    return row;
  }
}

export const whatsappService = new WhatsAppService();
