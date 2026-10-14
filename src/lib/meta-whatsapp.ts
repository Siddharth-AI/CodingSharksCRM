const REQUEST_TIMEOUT_MS = 20_000;

interface GraphErrorBody {
  error?: {
    message?: string;
    error_user_msg?: string;
    code?: number;
    error_subcode?: number;
    error_data?: { details?: string };
  };
}

export class MetaApiError extends Error {
  code?: number;
  subcode?: number;
  details?: string;
  status: number;

  constructor(message: string, status: number, code?: number, subcode?: number, details?: string) {
    super(message);
    this.name = 'MetaApiError';
    this.status = status;
    this.code = code;
    this.subcode = subcode;
    this.details = details;
  }
}

export const OUTSIDE_WINDOW_ERROR_CODE = 131047;

function config() {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const wabaId = process.env.WHATSAPP_WABA_ID;
  const appId = process.env.WHATSAPP_APP_ID;
  const version = process.env.WHATSAPP_GRAPH_VERSION || 'v23.0';

  if (!token || !phoneNumberId || !wabaId) {
    throw new Error('WhatsApp Cloud API is not configured (WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_WABA_ID)');
  }

  return { token, phoneNumberId, wabaId, appId, base: `https://graph.facebook.com/${version}` };
}

async function graph<T>(path: string, init: { method?: string; body?: unknown; headers?: Record<string, string>; rawBody?: BodyInit } = {}): Promise<T> {
  const { token, base } = config();
  const url = path.startsWith('http') ? path : `${base}${path}`;

  const res = await fetch(url, {
    method: init.method || 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...init.headers,
    },
    body: init.rawBody ?? (init.body !== undefined ? JSON.stringify(init.body) : undefined),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  const text = await res.text();
  let data: (GraphErrorBody & T) | null = null;
  try {
    data = text ? (JSON.parse(text) as GraphErrorBody & T) : null;
  } catch {
    data = null;
  }

  if (!res.ok || data?.error) {
    const err = data?.error || {};
    throw new MetaApiError(
      err.error_user_msg || err.message || `Meta API request failed (${res.status})`,
      res.status,
      err.code,
      err.error_subcode,
      err.error_data?.details
    );
  }

  return data as T;
}

export function toWaPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return `91${digits}`;
  return digits;
}

export interface TemplateSendComponent {
  type: 'header' | 'body';
  parameters: Array<
    | { type: 'text'; text: string; parameter_name?: string }
    | { type: 'image'; image: { link: string } }
    | { type: 'video'; video: { link: string } }
  >;
}

interface SendResponse {
  messages?: Array<{ id: string }>;
}

export async function sendText(to: string, body: string): Promise<string> {
  const { phoneNumberId } = config();
  const data = await graph<SendResponse>(`/${phoneNumberId}/messages`, {
    method: 'POST',
    body: {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: toWaPhone(to),
      type: 'text',
      text: { body, preview_url: true },
    },
  });
  return data.messages?.[0]?.id || '';
}

export async function sendTemplate(
  to: string,
  name: string,
  language: string,
  components: TemplateSendComponent[]
): Promise<string> {
  const { phoneNumberId } = config();
  const data = await graph<SendResponse>(`/${phoneNumberId}/messages`, {
    method: 'POST',
    body: {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: toWaPhone(to),
      type: 'template',
      template: {
        name,
        language: { code: language },
        ...(components.length > 0 ? { components } : {}),
      },
    },
  });
  return data.messages?.[0]?.id || '';
}

export async function markAsRead(waMessageId: string): Promise<void> {
  const { phoneNumberId } = config();
  await graph(`/${phoneNumberId}/messages`, {
    method: 'POST',
    body: { messaging_product: 'whatsapp', status: 'read', message_id: waMessageId },
  });
}

export async function fetchMedia(mediaId: string): Promise<{ buffer: ArrayBuffer; mimeType: string }> {
  const { token } = config();
  const meta = await graph<{ url: string; mime_type: string }>(`/${mediaId}`);
  const res = await fetch(meta.url, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!res.ok) {
    throw new MetaApiError(`Failed to download media (${res.status})`, res.status);
  }
  return { buffer: await res.arrayBuffer(), mimeType: meta.mime_type || res.headers.get('content-type') || 'application/octet-stream' };
}

export interface MetaTemplateDefinition {
  name: string;
  language: string;
  category: 'MARKETING' | 'UTILITY';
  parameter_format: 'NAMED';
  components: Array<Record<string, unknown>>;
}

export async function createTemplate(definition: MetaTemplateDefinition): Promise<{ id: string; status: string; category: string }> {
  const { wabaId } = config();
  return graph(`/${wabaId}/message_templates`, { method: 'POST', body: definition });
}

export async function editTemplate(
  metaTemplateId: string,
  definition: { components: MetaTemplateDefinition['components']; category?: MetaTemplateDefinition['category'] }
): Promise<{ success: boolean }> {
  return graph(`/${metaTemplateId}`, { method: 'POST', body: definition });
}

export interface MetaTemplateComponent {
  type: 'HEADER' | 'BODY' | 'FOOTER' | 'BUTTONS';
  format?: 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT' | 'LOCATION';
  text?: string;
  buttons?: Array<{ type: string; text?: string; url?: string }>;
}

export interface MetaTemplateRecord {
  id: string;
  name: string;
  language: string;
  status: string;
  category: string;
  rejected_reason?: string;
  parameter_format?: 'NAMED' | 'POSITIONAL';
  components?: MetaTemplateComponent[];
}

export async function listTemplates(): Promise<MetaTemplateRecord[]> {
  const { wabaId } = config();
  const out: MetaTemplateRecord[] = [];
  let next: string | undefined = `/${wabaId}/message_templates?fields=id,name,language,status,category,rejected_reason,parameter_format,components&limit=100`;
  while (next) {
    const page: { data: MetaTemplateRecord[]; paging?: { next?: string } } = await graph(next);
    out.push(...(page.data || []));
    next = page.paging?.next;
  }
  return out;
}

export async function uploadSampleMedia(buffer: ArrayBuffer, mimeType: string, fileName: string): Promise<string> {
  const { appId } = config();
  if (!appId) throw new Error('WHATSAPP_APP_ID is required to upload template media');

  const session = await graph<{ id: string }>(
    `/${appId}/uploads?file_name=${encodeURIComponent(fileName)}&file_length=${buffer.byteLength}&file_type=${encodeURIComponent(mimeType)}`,
    { method: 'POST' }
  );

  const { token } = config();
  const result = await graph<{ h: string }>(`/${session.id}`, {
    method: 'POST',
    headers: { Authorization: `OAuth ${token}`, file_offset: '0' },
    rawBody: buffer,
  });

  return result.h;
}
