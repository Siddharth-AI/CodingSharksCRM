import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { 
  createMessageTemplateSchema, 
  validateTemplateVariables,
  extractVariablesFromContent,
  validateWhatsAppCompliance 
} from '@/models/messageTemplate';
import { authenticateApiRequest } from '@/middleware/authMiddleware';
import { handleApiError } from '@/utils/apiErrorHandling';
import { MessageTemplate, TemplateType, ApiResponse, PaginatedResponse } from '@/types';

/**
 * GET /api/templates - Get all message templates with filtering and pagination
 */
export async function GET(request: NextRequest) {
  try {
    // Apply authentication middleware
    const authResult = await authenticateApiRequest(request);
    if (!authResult.isAuthenticated) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    
    // Parse query parameters
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const courseId = searchParams.get('courseId');
    const type = searchParams.get('type') as TemplateType;
    const isActive = searchParams.get('isActive');
    const search = searchParams.get('search');
    const sortBy = searchParams.get('sortBy') || 'created_at';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // Build query
    let query = supabaseAdmin
      .from('message_templates')
      .select(`
        id,
        course_id,
        type,
        name,
        content,
        variables,
        variable_defaults,
        media_image_url,
        media_video_url,
        is_active,
        created_at,
        updated_at
      `, { count: 'exact' });

    // Apply filters
    if (courseId) {
      query = query.eq('course_id', courseId);
    }

    if (type) {
      query = query.eq('type', type);
    }

    if (isActive !== null && isActive !== undefined) {
      query = query.eq('is_active', isActive === 'true');
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,content.ilike.%${search}%`);
    }

    // Apply sorting
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });

    // Apply pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch templates' },
        { status: 500 }
      );
    }

    // Transform data to match interface
    const templates: MessageTemplate[] = (data || []).map(item => ({
      id:               item.id,
      courseId:         item.course_id,
      type:             item.type as TemplateType,
      name:             item.name,
      content:          item.content,
      variables:        item.variables || [],
      variableDefaults: item.variable_defaults || {},
      mediaImageUrl:    item.media_image_url || undefined,
      mediaVideoUrl:    item.media_video_url || undefined,
      isActive:         item.is_active,
      createdAt:        new Date(item.created_at),
      updatedAt:        new Date(item.updated_at),
    }));

    const response: PaginatedResponse<MessageTemplate> = {
      data: templates,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    };

    return NextResponse.json({
      success: true,
      data: response.data,
      pagination: response.pagination,
    });

  } catch (error) {
    return handleApiError(error, 'Failed to fetch templates');
  }
}

/**
 * POST /api/templates - Create a new message template
 */
export async function POST(request: NextRequest) {
  try {
    // Apply authentication middleware
    const authResult = await authenticateApiRequest(request);
    if (!authResult.isAuthenticated) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: 401 }
      );
    }

    const body = await request.json();

    // Validate request body
    const { error: validationError, value: validatedData } = createMessageTemplateSchema.validate(body);
    if (validationError) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Validation failed',
          details: validationError.details.map(d => ({
            field: d.path.join('.'),
            message: d.message,
          }))
        },
        { status: 400 }
      );
    }

    // Extract variables from content
    const extractedVariables = extractVariablesFromContent(validatedData.content);
    
    // Validate template variables
    const variableValidation = validateTemplateVariables(validatedData.content, validatedData.variables);
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
    const complianceCheck = validateWhatsAppCompliance(validatedData.content);
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

    // Check if course exists
    const { data: courseData, error: courseError } = await supabaseAdmin
      .from('courses')
      .select('id')
      .eq('id', validatedData.courseId)
      .single();

    if (courseError || !courseData) {
      return NextResponse.json(
        { success: false, error: 'Course not found' },
        { status: 404 }
      );
    }

    // Check for duplicate template name within the same course
    const { data: existingTemplate } = await supabaseAdmin
      .from('message_templates')
      .select('id')
      .eq('course_id', validatedData.courseId)
      .eq('name', validatedData.name)
      .single();

    if (existingTemplate) {
      return NextResponse.json(
        { success: false, error: 'Template with this name already exists for this course' },
        { status: 409 }
      );
    }

    // Always derive variables from content (auto-extract)
    const finalVariables = extractVariablesFromContent(validatedData.content);

    // Create template
    const { data, error } = await supabaseAdmin
      .from('message_templates')
      .insert({
        course_id:         validatedData.courseId,
        type:              validatedData.type,
        name:              validatedData.name,
        content:           validatedData.content,
        variables:         finalVariables,
        variable_defaults: validatedData.variableDefaults || {},
        media_image_url:   validatedData.mediaImageUrl || null,
        media_video_url:   validatedData.mediaVideoUrl || null,
        is_active:         true,
        created_at:        new Date().toISOString(),
        updated_at:        new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to create template' },
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

    const response: ApiResponse<MessageTemplate> = {
      success: true,
      data: template,
      message: 'Template created successfully',
    };

    return NextResponse.json(response, { status: 201 });

  } catch (error) {
    return handleApiError(error, 'Failed to create template');
  }
}