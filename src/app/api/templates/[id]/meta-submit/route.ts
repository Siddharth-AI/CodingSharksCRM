import { NextRequest, NextResponse } from 'next/server';
import Joi from 'joi';
import { supabaseAdmin } from '@/lib/supabase';
import { authenticateApiRequest } from '@/middleware/authMiddleware';
import { handleApiError } from '@/utils/apiErrorHandling';
import { fromTemplateRow, submitTemplateToMeta, TemplateSubmitError } from '@/services/metaTemplateService';

const submitSchema = Joi.object({
  category: Joi.string().valid('MARKETING', 'UTILITY').required(),
  language: Joi.string().pattern(/^[a-z]{2}(_[A-Z]{2})?$/).default('en'),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await authenticateApiRequest(request);
    if (!authResult.isAuthenticated) {
      return NextResponse.json({ success: false, error: authResult.error }, { status: 401 });
    }

    const { id } = await params;
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return NextResponse.json({ success: false, error: 'Invalid template ID format' }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const { error: validationError, value } = submitSchema.validate(body);
    if (validationError) {
      return NextResponse.json({ success: false, error: validationError.details[0].message }, { status: 400 });
    }

    const { data: row, error } = await supabaseAdmin
      .from('message_templates')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !row) {
      return NextResponse.json({ success: false, error: 'Template not found' }, { status: 404 });
    }

    const template = fromTemplateRow(row);
    if (template.metaStatus === 'PENDING') {
      return NextResponse.json(
        { success: false, error: 'This template is already under review by WhatsApp' },
        { status: 409 }
      );
    }

    const updated = await submitTemplateToMeta(template, { category: value.category, language: value.language });

    return NextResponse.json({
      success: true,
      data: updated,
      message: updated.metaStatus === 'APPROVED' ? 'Template approved by WhatsApp' : 'Template submitted to WhatsApp for review',
    });
  } catch (error) {
    if (error instanceof TemplateSubmitError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.status });
    }
    return handleApiError(error, 'Failed to submit template');
  }
}
