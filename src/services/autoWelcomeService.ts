import { supabaseAdmin } from '@/lib/supabase';
import { whatsappService } from '@/services/whatsappService';
import { fromTemplateRow } from '@/services/metaTemplateService';
import { Lead, Course } from '@/types';

/**
 * Find the active WELCOME template for the lead's course and send it via WhatsApp.
 * Called from POST /api/leads and POST /api/public/leads.
 * Errors are logged but never thrown — lead creation must never fail because of this.
 */
export async function sendAutoWelcomeMessage(lead: Lead): Promise<void> {
  if (!lead.courseInterest) return;

  const { data: templates, error: templateError } = await supabaseAdmin
    .from('message_templates')
    .select('*')
    .eq('course_id', lead.courseInterest)
    .eq('type', 'welcome')
    .eq('is_active', true)
    .order('updated_at', { ascending: false });

  if (templateError || !templates || templates.length === 0) {
    console.error(`Auto-welcome: No active WELCOME template found for course_id=${lead.courseInterest} (lead=${lead.id})`);
    return;
  }

  const templateRow = templates.find(t => t.meta_status === 'APPROVED') || templates[0];
  const template = fromTemplateRow(templateRow);

  const { data: courseData } = await supabaseAdmin
    .from('courses')
    .select('*')
    .eq('id', lead.courseInterest)
    .single();

  const course: Course | undefined = courseData ? {
    id:          courseData.id,
    name:        courseData.name,
    description: courseData.description,
    duration:    courseData.duration,
    price:       courseData.price ?? undefined,
    courseType:  courseData.course_type,
    isActive:    courseData.is_active,
    createdAt:   new Date(courseData.created_at),
    updatedAt:   new Date(courseData.updated_at),
  } : undefined;

  const result = await whatsappService.sendTemplateToLead(lead, template, course);

  if (!result.success) {
    console.error(`Auto-welcome failed for lead=${lead.id}: ${result.error}`);
    return;
  }

  await supabaseAdmin.from('activities').insert({
    lead_id:     lead.id,
    type:        'message_sent',
    description: `Auto welcome message sent via WhatsApp`,
    metadata:    { templateId: template.id, templateName: template.name, auto: true },
    created_at:  new Date().toISOString(),
  });
}
