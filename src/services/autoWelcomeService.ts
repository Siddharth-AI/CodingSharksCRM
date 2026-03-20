import { supabaseAdmin } from '@/lib/supabase';
import { whatsappService } from '@/services/whatsappService';
import { processTemplate } from '@/utils/templateUtils';
import { Lead, Course, MessageTemplate } from '@/types';

/**
 * Find the active WELCOME template for the lead's course and send it via WhatsApp.
 * Called fire-and-forget from POST /api/leads and POST /api/public/leads.
 * Errors are logged but never thrown — lead creation must never fail because of this.
 */
export async function sendAutoWelcomeMessage(lead: Lead): Promise<void> {
  // 1. Find active WELCOME template for this course
  const { data: templateData, error: templateError } = await supabaseAdmin
    .from('message_templates')
    .select('*')
    .eq('course_id', lead.courseInterest)
    .eq('type', 'welcome')
    .eq('is_active', true)
    .limit(1)
    .single();

  if (templateError || !templateData) {
    console.error(`Auto-welcome: No active WELCOME template found for course_id=${lead.courseInterest} (lead=${lead.id})`);
    return;
  }

  // 2. Fetch the course for variable substitution
  const { data: courseData } = await supabaseAdmin
    .from('courses')
    .select('*')
    .eq('id', lead.courseInterest)
    .single();

  const template: MessageTemplate = {
    id:               templateData.id,
    courseId:         templateData.course_id,
    type:             templateData.type,
    name:             templateData.name,
    content:          templateData.content,
    variables:        templateData.variables || [],
    variableDefaults: templateData.variable_defaults || {},
    mediaImageUrl:    templateData.media_image_url || undefined,
    mediaVideoUrl:    templateData.media_video_url || undefined,
    isActive:         templateData.is_active,
    createdAt:        new Date(templateData.created_at),
    updatedAt:        new Date(templateData.updated_at),
  };

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

  // 3. Substitute variables
  const { content } = processTemplate(template, lead, course);

  // 4. Build media array
  const wapMedia: { url: string; caption?: string }[] = [];
  if (template.mediaImageUrl) wapMedia.push({ url: template.mediaImageUrl });
  if (template.mediaVideoUrl) wapMedia.push({ url: template.mediaVideoUrl });

  // 5. Send via Wapmonkey
  await whatsappService.sendTextMessage(lead.mobile, content, {
    leadId:        lead.id,
    templateId:    template.id,
    ...(wapMedia.length > 0 ? { media: wapMedia } : {}),
    mediaImageUrl: template.mediaImageUrl,
    mediaVideoUrl: template.mediaVideoUrl,
  });

  // 6. Log activity
  await supabaseAdmin.from('activities').insert({
    lead_id:     lead.id,
    type:        'message_sent',
    description: `Auto welcome message sent via WhatsApp`,
    metadata:    { templateId: template.id, templateName: template.name, auto: true },
    created_at:  new Date().toISOString(),
  });
}
