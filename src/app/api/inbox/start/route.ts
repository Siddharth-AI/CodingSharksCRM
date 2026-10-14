import { NextRequest, NextResponse } from 'next/server';
import Joi from 'joi';
import { supabaseAdmin } from '@/lib/supabase';
import { authenticateApiRequest } from '@/middleware/authMiddleware';
import { handleApiError } from '@/utils/apiErrorHandling';
import { formatMobileNumber, isValidMobileNumber } from '@/models/lead';
import { LeadSource, LeadStage } from '@/types';

const startSchema = Joi.object({
  mobile: Joi.string().trim().min(10).max(20).required(),
  name: Joi.string().trim().max(100).allow('').optional(),
  courseId: Joi.string().uuid().allow(null, '').optional(),
});

export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateApiRequest(request);
    if (!authResult.isAuthenticated) {
      return NextResponse.json({ success: false, error: authResult.error }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { error: validationError, value } = startSchema.validate(body);
    if (validationError) {
      return NextResponse.json({ success: false, error: validationError.details[0].message }, { status: 400 });
    }

    const mobile = formatMobileNumber(value.mobile);
    if (!isValidMobileNumber(mobile)) {
      return NextResponse.json({ success: false, error: 'Enter a valid mobile number' }, { status: 400 });
    }

    const { data: existing } = await supabaseAdmin
      .from('leads')
      .select('id, name')
      .eq('mobile', mobile)
      .order('created_at', { ascending: false })
      .limit(1);

    if (existing && existing.length > 0) {
      return NextResponse.json({ success: true, data: { leadId: existing[0].id, created: false, name: existing[0].name } });
    }

    if (value.courseId) {
      const { data: course } = await supabaseAdmin.from('courses').select('id').eq('id', value.courseId).maybeSingle();
      if (!course) {
        return NextResponse.json({ success: false, error: 'Course not found' }, { status: 400 });
      }
    }

    const name = (value.name || '').trim() || mobile;
    const { data: created, error } = await supabaseAdmin
      .from('leads')
      .insert({
        name,
        email: '',
        mobile,
        course_interest: value.courseId || null,
        source: LeadSource.WHATSAPP,
        stage: LeadStage.NEW,
        notes: null,
      })
      .select('id')
      .single();

    if (error || !created) {
      return NextResponse.json({ success: false, error: 'Failed to create contact' }, { status: 500 });
    }

    await supabaseAdmin.from('activities').insert({
      lead_id: created.id,
      type: 'lead_created',
      description: `Lead created from CRM inbox (new chat): ${name}`,
      metadata: { source: 'inbox_new_chat' },
      created_by: authResult.user!.id,
      created_at: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, data: { leadId: created.id, created: true, name } }, { status: 201 });
  } catch (error) {
    return handleApiError(error, 'Failed to start chat');
  }
}
