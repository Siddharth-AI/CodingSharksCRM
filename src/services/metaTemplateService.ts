import { supabaseAdmin } from '@/lib/supabase';
import {
  createTemplate,
  editTemplate,
  uploadSampleMedia,
  MetaApiError,
  TemplateSendComponent,
} from '@/lib/meta-whatsapp';
import { MessageTemplate, MetaTemplateCategory, TemplateType } from '@/types';

const BODY_MAX_LENGTH = 1024;
const IMAGE_MAX_BYTES = 5 * 1024 * 1024;
const VIDEO_MAX_BYTES = 16 * 1024 * 1024;
const PARAM_PATTERN = /\{\{([a-zA-Z_][a-zA-Z0-9_]*)\}\}/g;

const SAMPLE_VALUES: Record<string, string> = {
  name: 'Rahul Sharma',
  first_name: 'Rahul',
  last_name: 'Sharma',
  email: 'rahul@example.com',
  mobile: '+919876543210',
  course_name: 'Python Programming',
  course_interest: 'Python Programming',
  course_duration: '3 months',
  course_price: '₹15,000',
  company_name: 'Coding Sharks',
  current_date: '15/10/2026',
  inquiry_date: '15/10/2026',
};

export interface TemplateRow {
  id: string;
  course_id: string;
  type: string;
  name: string;
  content: string;
  variables: string[] | null;
  variable_defaults: Record<string, string> | null;
  media_image_url: string | null;
  media_video_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  meta_template_id?: string | null;
  meta_name?: string | null;
  meta_language?: string | null;
  meta_category?: MetaTemplateCategory | null;
  meta_status?: string | null;
  meta_rejection_reason?: string | null;
  meta_param_names?: string[] | null;
  meta_header_format?: 'IMAGE' | 'VIDEO' | null;
  meta_submitted_at?: string | null;
}

const CLOUDINARY_TRANSFORMS = {
  IMAGE: 'f_jpg,q_auto,w_1600,c_limit',
  VIDEO: 'q_auto,vc_h264,ac_aac,w_720,c_limit',
} as const;

export const toWhatsAppMediaUrl = (url: string, format: 'IMAGE' | 'VIDEO'): string => {
  const marker = format === 'IMAGE' ? '/image/upload/' : '/video/upload/';
  if (!url.includes('res.cloudinary.com') || !url.includes(marker)) return url;
  const [prefix, rest] = url.split(marker);
  if (/^[a-z]{1,3}_[^/]*\//.test(rest) && !/^v\d+\//.test(rest)) return url;
  const finalUrl = `${prefix}${marker}${CLOUDINARY_TRANSFORMS[format]}/${rest}`;
  return format === 'IMAGE' ? finalUrl.replace(/\.(png|webp|gif|avif|jpeg)$/i, '.jpg') : finalUrl.replace(/\.(mov|avi|mkv|3gp|webm)$/i, '.mp4');
};

export const fromTemplateRow = (row: TemplateRow): MessageTemplate => ({
  id:                  row.id,
  courseId:            row.course_id,
  type:                row.type as TemplateType,
  name:                row.name,
  content:             row.content,
  variables:           row.variables || [],
  variableDefaults:    row.variable_defaults || {},
  mediaImageUrl:       row.media_image_url || undefined,
  mediaVideoUrl:       row.media_video_url || undefined,
  isActive:            row.is_active,
  createdAt:           new Date(row.created_at),
  updatedAt:           new Date(row.updated_at),
  metaTemplateId:      row.meta_template_id || undefined,
  metaName:            row.meta_name || undefined,
  metaLanguage:        row.meta_language || 'en',
  metaCategory:        row.meta_category || undefined,
  metaStatus:          row.meta_status || undefined,
  metaRejectionReason: row.meta_rejection_reason || undefined,
  metaParamNames:      row.meta_param_names || [],
  metaHeaderFormat:    row.meta_header_format || undefined,
  metaSubmittedAt:     row.meta_submitted_at ? new Date(row.meta_submitted_at) : undefined,
});

export const buildMetaName = (template: Pick<MessageTemplate, 'id' | 'name'>): string => {
  const slug = template.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 60);
  return `${slug || 'template'}_${template.id.replace(/-/g, '').slice(0, 8)}`;
};

export const toMetaBody = (content: string): { body: string; paramNames: string[] } => {
  const paramNames: string[] = [];
  const body = content.replace(PARAM_PATTERN, (_m, raw: string) => {
    const name = raw.toLowerCase();
    if (!paramNames.includes(name)) paramNames.push(name);
    return `{{${name}}}`;
  });
  return { body, paramNames };
};

const sampleFor = (name: string, defaults: Record<string, string>): string => {
  const fromDefaults = Object.entries(defaults).find(([k]) => k.toLowerCase() === name)?.[1];
  return fromDefaults?.trim() || SAMPLE_VALUES[name] || name.replace(/_/g, ' ');
};

export class TemplateSubmitError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

async function headerHandle(url: string, format: 'IMAGE' | 'VIDEO'): Promise<string> {
  const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new TemplateSubmitError(`Could not download template media (${res.status})`);
  const buffer = await res.arrayBuffer();
  const limit = format === 'IMAGE' ? IMAGE_MAX_BYTES : VIDEO_MAX_BYTES;
  if (buffer.byteLength > limit) {
    throw new TemplateSubmitError(`WhatsApp allows ${format === 'IMAGE' ? '5MB images' : '16MB videos'} in templates. This file is ${(buffer.byteLength / 1024 / 1024).toFixed(1)}MB.`);
  }
  const mimeType = (res.headers.get('content-type') || (format === 'IMAGE' ? 'image/jpeg' : 'video/mp4')).split(';')[0];
  const fileName = url.split('/').pop()?.split('?')[0] || (format === 'IMAGE' ? 'header.jpg' : 'header.mp4');
  return uploadSampleMedia(buffer, mimeType, fileName);
}

export async function submitTemplateToMeta(
  template: MessageTemplate,
  options: { category: MetaTemplateCategory; language?: string }
): Promise<MessageTemplate> {
  if (template.mediaImageUrl && template.mediaVideoUrl) {
    throw new TemplateSubmitError('A WhatsApp template can have only one media header. Remove either the image or the video.');
  }

  const { body, paramNames } = toMetaBody(template.content.trim());
  if (body.length > BODY_MAX_LENGTH) {
    throw new TemplateSubmitError(`WhatsApp template text can be at most ${BODY_MAX_LENGTH} characters (this one has ${body.length}).`);
  }

  const headerFormat: 'IMAGE' | 'VIDEO' | undefined = template.mediaImageUrl ? 'IMAGE' : template.mediaVideoUrl ? 'VIDEO' : undefined;
  const components: Array<Record<string, unknown>> = [];

  if (headerFormat) {
    const handle = await headerHandle(toWhatsAppMediaUrl((template.mediaImageUrl || template.mediaVideoUrl)!, headerFormat), headerFormat);
    components.push({ type: 'HEADER', format: headerFormat, example: { header_handle: [handle] } });
  }

  components.push({
    type: 'BODY',
    text: body,
    ...(paramNames.length > 0
      ? {
          example: {
            body_text_named_params: paramNames.map(p => ({
              param_name: p,
              example: sampleFor(p, template.variableDefaults || {}),
            })),
          },
        }
      : {}),
  });

  const language = template.metaLanguage || options.language || 'en';
  const metaName = template.metaName || buildMetaName(template);

  let metaTemplateId = template.metaTemplateId;
  let status = 'PENDING';
  let category: string = options.category;

  try {
    if (metaTemplateId) {
      await editTemplate(metaTemplateId, {
        components,
        ...(template.metaStatus === 'APPROVED' ? {} : { category: options.category }),
      });
    } else {
      const created = await createTemplate({
        name: metaName,
        language,
        category: options.category,
        parameter_format: 'NAMED',
        components,
      });
      metaTemplateId = created.id;
      status = created.status || 'PENDING';
      category = created.category || options.category;
    }
  } catch (err) {
    if (err instanceof MetaApiError) {
      throw new TemplateSubmitError(err.details ? `${err.message}: ${err.details}` : err.message, 400);
    }
    throw err;
  }

  const { data, error } = await supabaseAdmin
    .from('message_templates')
    .update({
      meta_template_id:      metaTemplateId,
      meta_name:             metaName,
      meta_language:         language,
      meta_category:         category === 'UTILITY' ? 'UTILITY' : 'MARKETING',
      meta_status:           status,
      meta_rejection_reason: null,
      meta_param_names:      paramNames,
      meta_header_format:    headerFormat || null,
      meta_submitted_at:     new Date().toISOString(),
      updated_at:            new Date().toISOString(),
    })
    .eq('id', template.id)
    .select()
    .single();

  if (error || !data) {
    throw new TemplateSubmitError(`Submitted to Meta (id ${metaTemplateId}) but failed to save status: ${error?.message}`, 500);
  }

  return fromTemplateRow(data);
}

export function buildSendComponents(
  template: MessageTemplate,
  values: Record<string, string>
): TemplateSendComponent[] {
  const components: TemplateSendComponent[] = [];
  const lowerValues = Object.fromEntries(Object.entries(values).map(([k, v]) => [k.toLowerCase(), v]));

  if (template.metaHeaderFormat === 'IMAGE' && template.mediaImageUrl) {
    components.push({ type: 'header', parameters: [{ type: 'image', image: { link: toWhatsAppMediaUrl(template.mediaImageUrl, 'IMAGE') } }] });
  } else if (template.metaHeaderFormat === 'VIDEO' && template.mediaVideoUrl) {
    components.push({ type: 'header', parameters: [{ type: 'video', video: { link: toWhatsAppMediaUrl(template.mediaVideoUrl, 'VIDEO') } }] });
  }

  const params = template.metaParamNames || [];
  if (params.length > 0) {
    components.push({
      type: 'body',
      parameters: params.map(p => ({
        type: 'text' as const,
        parameter_name: p,
        text: (lowerValues[p] ?? '').toString().trim() || '-',
      })),
    });
  }

  return components;
}
