import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { whatsappService } from '@/services/whatsappService';
import { bulkSendSchema } from '@/models/whatsappMessage';
import { processTemplate } from '@/utils/templateUtils';
import { authenticateApiRequest } from '@/middleware/authMiddleware';
import { handleApiError } from '@/utils/apiErrorHandling';
import { ApiResponse, Lead, Course, MessageTemplate } from '@/types';

/**
 * POST /api/messages/bulk-send - Send WhatsApp messages to multiple leads via Wapmonkey
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

    const { error: validationError, value: validatedData } = bulkSendSchema.validate(body);
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

    const {
      leadIds,
      templateId,
      content,
      useTemplate,
      templateVariables,
      scheduledAt,
      batchSize,
      delayBetweenMessages,
    } = validatedData;

    // Fetch all leads
    const { data: leadsData, error: leadsError } = await supabase
      .from('leads')
      .select('*')
      .in('id', leadIds);

    if (leadsError) {
      return NextResponse.json({ success: false, error: 'Failed to fetch leads' }, { status: 500 });
    }

    if (!leadsData || leadsData.length === 0) {
      return NextResponse.json({ success: false, error: 'No valid leads found' }, { status: 404 });
    }

    const leads: Lead[] = leadsData.map(l => ({
      id: l.id,
      name: l.name,
      email: l.email,
      mobile: l.mobile,
      courseInterest: l.course_interest,
      stage: l.stage,
      source: l.source,
      createdAt: new Date(l.created_at),
      updatedAt: new Date(l.updated_at),
      lastContactedAt: l.last_contacted_at ? new Date(l.last_contacted_at) : undefined,
      notes: l.notes,
    }));

    let template: MessageTemplate | undefined;
    let course: Course | undefined;

    if (useTemplate && templateId) {
      const { data: templateData, error: templateError } = await supabase
        .from('message_templates')
        .select('*')
        .eq('id', templateId)
        .single();

      if (templateError || !templateData) {
        return NextResponse.json({ success: false, error: 'Template not found' }, { status: 404 });
      }

      template = {
        id: templateData.id,
        courseId: templateData.course_id,
        type: templateData.type,
        name: templateData.name,
        content: templateData.content,
        variables: templateData.variables || [],
        variableDefaults: templateData.variable_defaults || {},
        isActive: templateData.is_active,
        createdAt: new Date(templateData.created_at),
        updatedAt: new Date(templateData.updated_at),
      };

      if (template.courseId) {
        const { data: courseData } = await supabase
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
    }

    const results: Array<{
      leadId: string;
      leadName: string;
      success: boolean;
      messageId?: string;
      error?: string;
    }> = [];

    // Process in batches with delay between batches
    for (let i = 0; i < leads.length; i += batchSize) {
      const batch = leads.slice(i, i + batchSize);

      const batchResults = await Promise.all(
        batch.map(async lead => {
          if (!whatsappService.isValidPhoneNumber(lead.mobile)) {
            return { leadId: lead.id, leadName: lead.name, success: false, error: 'Invalid phone number' };
          }

          let finalContent = content as string | undefined;

          if (useTemplate && template) {
            const processed = processTemplate(template, lead, course, templateVariables);
            if (processed.missingVariables.length > 0) {
              return {
                leadId: lead.id,
                leadName: lead.name,
                success: false,
                error: `Missing template variables: ${processed.missingVariables.join(', ')}`,
              };
            }
            finalContent = processed.content;
          }

          if (!finalContent) {
            return { leadId: lead.id, leadName: lead.name, success: false, error: 'No message content' };
          }

          const sendResult = await whatsappService.sendTextMessage(
            lead.mobile,
            finalContent,
            { leadId: lead.id, templateId, scheduledAt }
          );

          if (sendResult.success) {
            await supabase.from('activities').insert({
              lead_id: lead.id,
              type: 'message_sent',
              description: `Bulk WhatsApp message sent: ${finalContent.substring(0, 50)}${finalContent.length > 50 ? '...' : ''}`,
              metadata: { messageId: sendResult.messageId, templateUsed: useTemplate, templateId, bulkSend: true },
              created_by: authResult.user!.id,
              created_at: new Date().toISOString(),
            });
          }

          return {
            leadId: lead.id,
            leadName: lead.name,
            success: sendResult.success,
            messageId: sendResult.messageId,
            error: sendResult.error,
          };
        })
      );

      results.push(...batchResults);

      // Delay between batches (not after the last one)
      if (i + batchSize < leads.length && delayBetweenMessages > 0) {
        await new Promise(resolve => setTimeout(resolve, delayBetweenMessages));
      }
    }

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    const response: ApiResponse<{
      results: typeof results;
      summary: { total: number; successful: number; failed: number; successRate: number };
    }> = {
      success: failed === 0,
      data: {
        results,
        summary: {
          total: results.length,
          successful,
          failed,
          successRate: Math.round((successful / results.length) * 10000) / 100,
        },
      },
      message: `Bulk send completed. ${successful} successful, ${failed} failed.`,
    };

    return NextResponse.json(response, { status: 201 });

  } catch (error) {
    return handleApiError(error, 'Failed to send bulk messages');
  }
}
