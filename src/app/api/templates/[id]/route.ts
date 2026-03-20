import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import {
  updateMessageTemplateSchema,
  validateTemplateVariables,
  extractVariablesFromContent,
  validateWhatsAppCompliance,
} from '@/models/messageTemplate';
import { authenticateApiRequest } from '@/middleware/authMiddleware';
import { handleApiError } from '@/utils/apiErrorHandling';
import { MessageTemplate, TemplateType, UpdateMessageTemplateRequest } from '@/types';

/**
 * GET /api/templates/[id] - Get template by ID
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

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid template ID format' },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('message_templates')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { success: false, error: 'Template not found' },
          { status: 404 }
        );
      }
      console.error('Database error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch template' },
        { status: 500 }
      );
    }

    const template: MessageTemplate = {
      id:               data.id,
      courseId:         data.course_id,
      type:             data.type as TemplateType,
      name:             data.name,
      content:          data.content,
      variables:        data.variables || [],
      variableDefaults: data.variable_defaults || {},
      mediaImageUrl:    data.media_image_url || undefined,
      mediaVideoUrl:    data.media_video_url || undefined,
      isActive:         data.is_active,
      createdAt:        new Date(data.created_at),
      updatedAt:        new Date(data.updated_at),
    };

    return NextResponse.json({ success: true, data: template });

  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PUT /api/templates/[id] - Update template by ID
 */
export async function PUT(
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

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid template ID format' },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Validate input data
    const { error, value } = updateMessageTemplateSchema.validate(body);
    if (error) {
      return NextResponse.json(
        { success: false, error: error.details[0].message },
        { status: 400 }
      );
    }

    const updateData: UpdateMessageTemplateRequest = value;

    // Check if template exists
    const { data: existingTemplate, error: fetchError } = await supabaseAdmin
      .from('message_templates')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json(
          { success: false, error: 'Template not found' },
          { status: 404 }
        );
      }
      console.error('Database error:', fetchError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch template' },
        { status: 500 }
      );
    }

    // Validate template variables if content is being updated
    if (updateData.content) {
      const variableValidation = validateTemplateVariables(
        updateData.content, 
        updateData.variables || existingTemplate.variables || []
      );
      if (!variableValidation.isValid) {
        return NextResponse.json(
          {
            success: false,
            error: 'Template variable validation failed',
            details: variableValidation.errors,
            warnings: variableValidation.warnings,
          },
          { status: 400 }
        );
      }

      // Validate WhatsApp compliance
      const complianceCheck = validateWhatsAppCompliance(updateData.content);
      if (!complianceCheck.isCompliant) {
        return NextResponse.json(
          {
            success: false,
            error: 'WhatsApp compliance validation failed',
            details: complianceCheck.violations,
            warnings: complianceCheck.warnings,
          },
          { status: 400 }
        );
      }
    }

    // Check for name uniqueness if name is being updated
    if (updateData.name && updateData.name !== existingTemplate.name) {
      const { data: duplicateTemplate } = await supabaseAdmin
        .from('message_templates')
        .select('id')
        .eq('course_id', existingTemplate.course_id)
        .eq('name', updateData.name)
        .neq('id', id)
        .single();

      if (duplicateTemplate) {
        return NextResponse.json(
          { success: false, error: 'Template with this name already exists for this course' },
          { status: 409 }
        );
      }
    }

    // Prepare update object
    const updateObject: any = {
      updated_at: new Date().toISOString(),
    };

    if (updateData.name !== undefined) {
      updateObject.name = updateData.name;
    }
    if (updateData.content !== undefined) {
      updateObject.content = updateData.content;
      // Always re-derive variables from the new content
      updateObject.variables = extractVariablesFromContent(updateData.content);
    } else if (updateData.variables !== undefined) {
      updateObject.variables = updateData.variables;
    }
    if (updateData.variableDefaults !== undefined) {
      updateObject.variable_defaults = updateData.variableDefaults;
    }
    if (updateData.type !== undefined) {
      updateObject.type = updateData.type;
    }
    if (updateData.isActive !== undefined) {
      updateObject.is_active = updateData.isActive;
    }
    if (updateData.mediaImageUrl !== undefined) {
      updateObject.media_image_url = updateData.mediaImageUrl || null;
    }
    if (updateData.mediaVideoUrl !== undefined) {
      updateObject.media_video_url = updateData.mediaVideoUrl || null;
    }

    // Update template
    const { data, error: updateError } = await supabaseAdmin
      .from('message_templates')
      .update(updateObject)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Database error:', updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to update template' },
        { status: 500 }
      );
    }

    const updatedTemplate: MessageTemplate = {
      id:               data.id,
      courseId:         data.course_id,
      type:             data.type as TemplateType,
      name:             data.name,
      content:          data.content,
      variables:        data.variables || [],
      variableDefaults: data.variable_defaults || {},
      isActive:         data.is_active,
      createdAt:        new Date(data.created_at),
      updatedAt:        new Date(data.updated_at),
    };

    return NextResponse.json({
      success: true,
      data: updatedTemplate,
      message: 'Template updated successfully',
    });

  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * DELETE /api/templates/[id] - Delete template by ID
 */
export async function DELETE(
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

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid template ID format' },
        { status: 400 }
      );
    }

    // Check if template exists
    const { data: existingTemplate, error: fetchError } = await supabaseAdmin
      .from('message_templates')
      .select('id, name')
      .eq('id', id)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json(
          { success: false, error: 'Template not found' },
          { status: 404 }
        );
      }
      console.error('Database error:', fetchError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch template' },
        { status: 500 }
      );
    }

    // Detach this template from any existing messages (messages are already sent)
    await supabaseAdmin
      .from('whatsapp_messages')
      .update({ template_id: null })
      .eq('template_id', id);

    // Delete the template
    const { error: deleteError } = await supabaseAdmin
      .from('message_templates')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Database error:', deleteError);
      return NextResponse.json(
        { success: false, error: 'Failed to delete template' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Template "${existingTemplate.name}" deleted successfully`,
    });

  } catch (error) {
    return handleApiError(error);
  }
}