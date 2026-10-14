import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { authenticateApiRequest } from '@/middleware/authMiddleware';
import { handleApiError } from '@/utils/apiErrorHandling';
import { fromTemplateRow } from '@/services/metaTemplateService';
import { getTemplateVariableValues } from '@/utils/templateUtils';
import { Course, Lead, TemplateFieldValue, TemplateValuesResponse } from '@/types';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PARAM_PATTERN = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;

export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateApiRequest(request);
    if (!authResult.isAuthenticated) {
      return NextResponse.json({ success: false, error: authResult.error }, { status: 401 });
    }

    const leadId = request.nextUrl.searchParams.get('leadId') || '';
    const templateId = request.nextUrl.searchParams.get('templateId') || '';
    if (!UUID.test(leadId) || !UUID.test(templateId)) {
      return NextResponse.json({ success: false, error: 'leadId and templateId are required' }, { status: 400 });
    }

    const [{ data: leadRow }, { data: templateRow }] = await Promise.all([
      supabaseAdmin.from('leads').select('*').eq('id', leadId).single(),
      supabaseAdmin.from('message_templates').select('*').eq('id', templateId).single(),
    ]);

    if (!leadRow || !templateRow) {
      return NextResponse.json({ success: false, error: 'Lead or template not found' }, { status: 404 });
    }

    const template = fromTemplateRow(templateRow);
    const courseId = template.courseId || leadRow.course_interest;
    const { data: courseRow } = courseId
      ? await supabaseAdmin.from('courses').select('*').eq('id', courseId).maybeSingle()
      : { data: null };

    const lead: Lead = {
      id: leadRow.id,
      name: leadRow.name,
      email: leadRow.email,
      mobile: leadRow.mobile,
      courseInterest: leadRow.course_interest,
      stage: leadRow.stage,
      source: leadRow.source,
      createdAt: new Date(leadRow.created_at),
      updatedAt: new Date(leadRow.updated_at),
      notes: leadRow.notes ?? undefined,
    };

    const course: Course | undefined = courseRow
      ? {
          id: courseRow.id,
          name: courseRow.name,
          description: courseRow.description,
          duration: courseRow.duration,
          price: courseRow.price ?? undefined,
          courseType: courseRow.course_type,
          isActive: courseRow.is_active,
          createdAt: new Date(courseRow.created_at),
          updatedAt: new Date(courseRow.updated_at),
        }
      : undefined;

    const values = getTemplateVariableValues(template, lead, course);
    const lowerValues = Object.fromEntries(Object.entries(values).map(([k, v]) => [k.toLowerCase(), v]));

    const names: string[] = [];
    for (const m of template.content.matchAll(PARAM_PATTERN)) {
      if (!names.includes(m[1])) names.push(m[1]);
    }

    const fields: TemplateFieldValue[] = names.map(name => {
      const value = values[name] ?? lowerValues[name.toLowerCase()];
      return { name, value: value ?? '', auto: value !== undefined && value !== '' };
    });

    const filled = Object.fromEntries(fields.map(f => [f.name, f.value]));
    const content = template.content.replace(PARAM_PATTERN, (match, name: string) =>
      filled[name] !== undefined && filled[name] !== '' ? filled[name] : match
    );

    const response: TemplateValuesResponse = { fields, content };
    return NextResponse.json({ success: true, data: response });
  } catch (error) {
    return handleApiError(error, 'Failed to load template values');
  }
}
