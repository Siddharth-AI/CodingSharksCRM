import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { authenticateApiRequest } from '@/middleware/authMiddleware';
import { handleApiError } from '@/utils/apiErrorHandling';
import { listTemplates, MetaTemplateRecord } from '@/lib/meta-whatsapp';
import { extractVariablesFromContent } from '@/models/messageTemplate';

const PARAM_PATTERN = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;

function importable(t: MetaTemplateRecord): { content: string; paramNames: string[] } | null {
  if (t.status !== 'APPROVED') return null;
  if (t.category !== 'UTILITY' && t.category !== 'MARKETING') return null;

  const components = t.components || [];
  const header = components.find(c => c.type === 'HEADER');
  const body = components.find(c => c.type === 'BODY');
  const footer = components.find(c => c.type === 'FOOTER');
  const buttons = components.find(c => c.type === 'BUTTONS');

  if (!body?.text) return null;
  if (header && (header.format !== 'TEXT' || PARAM_PATTERN.test(header.text || ''))) return null;
  PARAM_PATTERN.lastIndex = 0;
  if (buttons?.buttons?.some(b => b.url && b.url.includes('{{'))) return null;

  const paramNames: string[] = [];
  for (const m of body.text.matchAll(PARAM_PATTERN)) {
    const name = m[1].toLowerCase();
    if (!paramNames.includes(name)) paramNames.push(name);
  }

  const content = [header?.text ? `*${header.text}*` : null, body.text, footer?.text ? `_${footer.text}_` : null]
    .filter(Boolean)
    .join('\n\n');

  return { content, paramNames };
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateApiRequest(request);
    if (!authResult.isAuthenticated) {
      return NextResponse.json({ success: false, error: authResult.error }, { status: 401 });
    }

    const { data: rows, error } = await supabaseAdmin
      .from('message_templates')
      .select('id, meta_template_id, meta_status');

    if (error) {
      return NextResponse.json({ success: false, error: 'Failed to load templates' }, { status: 500 });
    }

    const remoteList = await listTemplates();
    const remote = new Map(remoteList.map(t => [t.id, t]));
    const linked = new Set((rows || []).map(r => r.meta_template_id).filter(Boolean));
    let updated = 0;
    let imported = 0;

    for (const row of rows || []) {
      if (!row.meta_template_id) continue;
      const meta = remote.get(row.meta_template_id);
      if (!meta || row.meta_status === 'EDITED') continue;
      if (meta.status === row.meta_status) continue;

      const { error: updateError } = await supabaseAdmin
        .from('message_templates')
        .update({
          meta_status: meta.status,
          meta_category: meta.category === 'UTILITY' ? 'UTILITY' : 'MARKETING',
          meta_rejection_reason: meta.status === 'REJECTED' ? meta.rejected_reason || null : null,
        })
        .eq('id', row.id);

      if (!updateError) updated++;
    }

    for (const meta of remoteList) {
      if (linked.has(meta.id)) continue;
      const parsed = importable(meta);
      if (!parsed) continue;

      const now = new Date().toISOString();
      const { error: insertError } = await supabaseAdmin.from('message_templates').insert({
        course_id:          null,
        type:               'custom',
        name:               meta.name,
        content:            parsed.content,
        variables:          extractVariablesFromContent(parsed.content),
        variable_defaults:  {},
        is_active:          true,
        meta_template_id:   meta.id,
        meta_name:          meta.name,
        meta_language:      meta.language,
        meta_category:      meta.category,
        meta_status:        meta.status,
        meta_param_names:   parsed.paramNames,
        meta_header_format: null,
        created_at:         now,
        updated_at:         now,
      });

      if (!insertError) imported++;
      else if (insertError.code !== '23505') console.error('Template import failed:', meta.name, insertError.message);
    }

    return NextResponse.json({ success: true, data: { checked: rows?.length || 0, updated, imported } });
  } catch (error) {
    return handleApiError(error, 'Failed to sync template status');
  }
}
