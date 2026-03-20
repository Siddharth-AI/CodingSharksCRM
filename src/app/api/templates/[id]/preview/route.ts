import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { generateTemplatePreview } from '@/models/messageTemplate';
import { processTemplate } from '@/utils/templateUtils';
import { authenticateApiRequest } from '@/middleware/authMiddleware';
import { handleApiError } from '@/utils/apiErrorHandling';
import { MessageTemplate, TemplateType, Lead, Course, ApiResponse } from '@/types';

/**
 * POST /api/templates/[id]/preview - Generate template preview with variable substitution
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Apply authentication middleware
    const authResult = await authenticateApiRequest(request);
    if (!authResult.isAuthenticated) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { leadId, courseId, customVariables, useDefaultData } = body;

    // Get template
    const { data: templateData, error: templateError } = await supabase
      .from('message_templates')
      .select('*')
      .eq('id', id)
      .single();

    if (templateError || !templateData) {
      return NextResponse.json(
        { success: false, error: 'Template not found' },
        { status: 404 }
      );
    }

    const template: MessageTemplate = {
      id: templateData.id,
      courseId: templateData.course_id,
      type: templateData.type as TemplateType,
      name: templateData.name,
      content: templateData.content,
      variables: templateData.variables || [],
      variableDefaults: templateData.variable_defaults || {},
      isActive: templateData.is_active,
      createdAt: new Date(templateData.created_at),
      updatedAt: new Date(templateData.updated_at),
    };

    let previewContent: string;
    let lead: Lead | undefined;
    let course: Course | undefined;
    let missingVariables: string[] = [];
    let substitutionCount = 0;

    if (useDefaultData) {
      // Use default sample data
      previewContent = generateTemplatePreview(template);
    } else {
      // Use specific lead and course data
      if (leadId) {
        const { data: leadData, error: leadError } = await supabase
          .from('leads')
          .select('*')
          .eq('id', leadId)
          .single();

        if (leadError || !leadData) {
          return NextResponse.json(
            { success: false, error: 'Lead not found' },
            { status: 404 }
          );
        }

        lead = {
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
      }

      if (courseId || template.courseId) {
        const targetCourseId = courseId || template.courseId;
        const { data: courseData, error: courseError } = await supabase
          .from('courses')
          .select('*')
          .eq('id', targetCourseId)
          .single();

        if (courseError || !courseData) {
          return NextResponse.json(
            { success: false, error: 'Course not found' },
            { status: 404 }
          );
        }

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

      if (lead) {
        const result = processTemplate(template, lead, course, customVariables);
        previewContent = result.content;
        missingVariables = result.missingVariables;
        substitutionCount = result.substitutionCount;
      } else {
        // No lead provided, use default preview
        previewContent = generateTemplatePreview(template);
      }
    }

    const response: ApiResponse<{
      preview: string;
      template: MessageTemplate;
      lead?: Lead;
      course?: Course;
      missingVariables: string[];
      substitutionCount: number;
      variablesUsed: string[];
    }> = {
      success: true,
      data: {
        preview: previewContent,
        template,
        lead,
        course,
        missingVariables,
        substitutionCount,
        variablesUsed: template.variables,
      },
    };

    return NextResponse.json(response);

  } catch (error) {
    return handleApiError(error, 'Failed to generate template preview');
  }
}

/**
 * GET /api/templates/[id]/preview - Get default template preview
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Apply authentication middleware
    const authResult = await authenticateApiRequest(request);
    if (!authResult.isAuthenticated) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Get template
    const { data: templateData, error: templateError } = await supabase
      .from('message_templates')
      .select('*')
      .eq('id', id)
      .single();

    if (templateError || !templateData) {
      return NextResponse.json(
        { success: false, error: 'Template not found' },
        { status: 404 }
      );
    }

    const template: MessageTemplate = {
      id: templateData.id,
      courseId: templateData.course_id,
      type: templateData.type as TemplateType,
      name: templateData.name,
      content: templateData.content,
      variables: templateData.variables || [],
      variableDefaults: templateData.variable_defaults || {},
      isActive: templateData.is_active,
      createdAt: new Date(templateData.created_at),
      updatedAt: new Date(templateData.updated_at),
    };

    const previewContent = generateTemplatePreview(template);

    const response: ApiResponse<{
      preview: string;
      template: MessageTemplate;
      variablesUsed: string[];
    }> = {
      success: true,
      data: {
        preview: previewContent,
        template,
        variablesUsed: template.variables,
      },
    };

    return NextResponse.json(response);

  } catch (error) {
    return handleApiError(error, 'Failed to generate template preview');
  }
}