import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { whatsappService } from '@/services/whatsappService';
import { fromTemplateRow } from '@/services/metaTemplateService';
import { sendMessageSchema } from '@/models/whatsappMessage';
import { processTemplate } from '@/utils/templateUtils';
import { authenticateApiRequest } from '@/middleware/authMiddleware';
import { handleApiError } from '@/utils/apiErrorHandling';
import { WhatsAppMessage, MessageStatus, ApiResponse, Lead, Course, MessageTemplate } from '@/types';

/**
 * POST /api/messages/send - Send a WhatsApp message via the WhatsApp Cloud API
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateApiRequest(request);
    if (!authResult.isAuthenticated) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: 401 }
      );
    }

    const body = await request.json();

    const { error: validationError, value: validatedData } = sendMessageSchema.validate(body);
    if (validationError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: validationError.details.map(d => ({
            field: d.path.join('.'),
            message: d.message,
          })),
        },
        { status: 400 }
      );
    }

    const { leadId, templateId, content, useTemplate, templateVariables, scheduledAt } = validatedData;

    // Fetch lead
    const { data: leadData, error: leadError } = await supabaseAdmin
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single();

    if (leadError || !leadData) {
      return NextResponse.json({ success: false, error: 'Lead not found' }, { status: 404 });
    }

    const lead: Lead = {
      id: leadData.id,
      name: leadData.name,
      email: leadData.email,
      mobile: leadData.mobile,
      courseInterest: leadData.course_interest,
      stage: leadData.stage,
      source: leadData.source,
      createdAt: new Date(leadData.created_at),
      updatedAt: new Date(leadData.updated_at),
      lastContactedAt: leadData.last_contacted_at ? new Date(leadData.last_contacted_at) : undefined,
      notes: leadData.notes,
    };

    if (scheduledAt) {
      return NextResponse.json(
        { success: false, error: 'Scheduled sending is not supported by the WhatsApp Cloud API' },
        { status: 400 }
      );
    }

    let finalContent = content as string;
    let template: MessageTemplate | undefined;
    let course: Course | undefined;

    // Resolve template content
    if (useTemplate && templateId) {
      const { data: templateData, error: templateError } = await supabaseAdmin
        .from('message_templates')
        .select('*')
        .eq('id', templateId)
        .single();

      if (templateError || !templateData) {
        return NextResponse.json({ success: false, error: 'Template not found' }, { status: 404 });
      }

      template = fromTemplateRow(templateData);

      if (template.metaStatus !== 'APPROVED') {
        return NextResponse.json(
          { success: false, error: `Template "${template.name}" is not approved on WhatsApp yet. Submit it from the Templates page and wait for approval.` },
          { status: 400 }
        );
      }

      // Fetch course if template is associated with one
      if (template.courseId) {
        const { data: courseData } = await supabaseAdmin
          .from('courses')
          .select('*')
          .eq('id', template.courseId)
          .single();

        if (courseData) {
          course = {
            id: courseData.id,
            name: courseData.name,
            description: courseData.description,
            duration: courseData.duration,
            price: courseData.price ?? undefined,
            courseType: courseData.course_type,
            isActive: courseData.is_active,
            createdAt: new Date(courseData.created_at),
            updatedAt: new Date(courseData.updated_at),
          };
        }
      }

      const processed = processTemplate(template, lead, course, templateVariables);
      finalContent = processed.content;

      if (processed.missingVariables.length > 0) {
        return NextResponse.json(
          {
            success: false,
            error: 'Template has unresolved variables',
            details: `Missing: ${processed.missingVariables.join(', ')}`,
          },
          { status: 400 }
        );
      }
    }

    // Validate phone number
    if (!whatsappService.isValidPhoneNumber(lead.mobile)) {
      return NextResponse.json(
        { success: false, error: 'Invalid phone number format (expected 10-digit Indian mobile)' },
        { status: 400 }
      );
    }

    const sendResult = template
      ? await whatsappService.sendTemplateToLead(lead, template, course, templateVariables)
      : await whatsappService.sendTextMessage(lead.mobile, finalContent, { leadId });

    if (!sendResult.success) {
      return NextResponse.json(
        { success: false, error: sendResult.error, outsideWindow: sendResult.outsideWindow || false },
        { status: sendResult.outsideWindow ? 409 : 502 }
      );
    }

    // Fetch the stored message record
    const { data: messageData, error: messageError } = await supabaseAdmin
      .from('whatsapp_messages')
      .select('*')
      .eq('id', sendResult.messageId)
      .single();

    if (messageError || !messageData) {
      return NextResponse.json(
        { success: false, error: 'Message sent but failed to retrieve record' },
        { status: 500 }
      );
    }

    const message: WhatsAppMessage = {
      id: messageData.id,
      leadId: messageData.lead_id,
      templateId: messageData.template_id,
      content: messageData.content,
      status: messageData.status as MessageStatus,
      sentAt: messageData.sent_at ? new Date(messageData.sent_at) : undefined,
      deliveredAt: messageData.delivered_at ? new Date(messageData.delivered_at) : undefined,
      readAt: messageData.read_at ? new Date(messageData.read_at) : undefined,
      errorMessage: messageData.error_message,
      retryCount: messageData.retry_count || 0,
      createdAt: new Date(messageData.created_at),
      mediaImageUrl: messageData.media_image_url || undefined,
      mediaVideoUrl: messageData.media_video_url || undefined,
      direction: messageData.direction,
      waMessageId: messageData.wa_message_id || undefined,
      phone: messageData.phone || undefined,
      messageType: messageData.message_type,
      isRead: messageData.is_read,
    };

    // Log activity
    await supabaseAdmin.from('activities').insert({
      lead_id: leadId,
      type: 'message_sent',
      description: `WhatsApp message sent: ${finalContent.substring(0, 50)}${finalContent.length > 50 ? '...' : ''}`,
      metadata: { messageId: message.id, templateUsed: useTemplate, templateId },
      created_by: authResult.user!.id,
      created_at: new Date().toISOString(),
    });

    const response: ApiResponse<WhatsAppMessage> = {
      success: true,
      data: message,
      message: scheduledAt ? 'Message scheduled successfully' : 'Message sent successfully',
    };

    return NextResponse.json(response, { status: 201 });

  } catch (error) {
    return handleApiError(error, 'Failed to send message');
  }
}
