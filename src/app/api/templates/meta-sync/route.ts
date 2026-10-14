import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { authenticateApiRequest } from '@/middleware/authMiddleware';
import { handleApiError } from '@/utils/apiErrorHandling';
import { listTemplates } from '@/lib/meta-whatsapp';

export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateApiRequest(request);
    if (!authResult.isAuthenticated) {
      return NextResponse.json({ success: false, error: authResult.error }, { status: 401 });
    }

    const { data: rows, error } = await supabaseAdmin
      .from('message_templates')
      .select('id, meta_template_id, meta_status')
      .not('meta_template_id', 'is', null);

    if (error) {
      return NextResponse.json({ success: false, error: 'Failed to load templates' }, { status: 500 });
    }

    const remote = new Map((await listTemplates()).map(t => [t.id, t]));
    let updated = 0;

    for (const row of rows || []) {
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

    return NextResponse.json({ success: true, data: { checked: rows?.length || 0, updated } });
  } catch (error) {
    return handleApiError(error, 'Failed to sync template status');
  }
}
