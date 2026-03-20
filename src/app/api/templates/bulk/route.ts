import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { authenticateApiRequest } from '@/middleware/authMiddleware';
import { handleApiError } from '@/utils/apiErrorHandling';
import { ApiResponse } from '@/types';
import Joi from 'joi';

/**
 * POST /api/templates/bulk - Bulk operations on templates (activate, deactivate, delete)
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
    const schema = Joi.object({
      templateIds: Joi.array().items(Joi.string().uuid()).min(1).max(100).required(),
      operation: Joi.string().valid('activate', 'deactivate', 'delete').required(),
    });

    const { error: validationError, value: validatedData } = schema.validate(body);
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

    const { templateIds, operation } = validatedData;

    // Check if all templates exist
    const { data: existingTemplates, error: fetchError } = await supabase
      .from('message_templates')
      .select('id, name, is_active')
      .in('id', templateIds);

    if (fetchError) {
      console.error('Database error:', fetchError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch templates' },
        { status: 500 }
      );
    }

    const foundIds = existingTemplates?.map(t => t.id) || [];
    const missingIds = templateIds.filter((id: string) => !foundIds.includes(id));

    if (missingIds.length > 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Templates not found: ${missingIds.join(', ')}` 
        },
        { status: 404 }
      );
    }

    let results: Array<{ id: string; success: boolean; error?: string }> = [];

    switch (operation) {
      case 'activate':
        {
          const { data, error } = await supabase
            .from('message_templates')
            .update({ 
              is_active: true,
              updated_at: new Date().toISOString(),
            })
            .in('id', templateIds)
            .select('id');

          if (error) {
            console.error('Database error:', error);
            return NextResponse.json(
              { success: false, error: 'Failed to activate templates' },
              { status: 500 }
            );
          }

          results = templateIds.map((id: string) => ({
            id,
            success: true,
          }));
        }
        break;

      case 'deactivate':
        {
          const { data, error } = await supabase
            .from('message_templates')
            .update({ 
              is_active: false,
              updated_at: new Date().toISOString(),
            })
            .in('id', templateIds)
            .select('id');

          if (error) {
            console.error('Database error:', error);
            return NextResponse.json(
              { success: false, error: 'Failed to deactivate templates' },
              { status: 500 }
            );
          }

          results = templateIds.map((id: string) => ({
            id,
            success: true,
          }));
        }
        break;

      case 'delete':
        {
          // Check if any templates are being used in messages
          const { data: messagesUsingTemplates, error: messagesError } = await supabase
            .from('whatsapp_messages')
            .select('template_id')
            .in('template_id', templateIds);

          if (messagesError) {
            console.error('Database error checking template usage:', messagesError);
            return NextResponse.json(
              { success: false, error: 'Failed to check template usage' },
              { status: 500 }
            );
          }

          const usedTemplateIds = [...new Set(messagesUsingTemplates?.map(m => m.template_id) || [])];
          const canDeleteIds = templateIds.filter((id: string) => !usedTemplateIds.includes(id));
          const cannotDeleteIds = templateIds.filter((id: string) => usedTemplateIds.includes(id));

          // Delete templates that are not being used
          if (canDeleteIds.length > 0) {
            const { error: deleteError } = await supabase
              .from('message_templates')
              .delete()
              .in('id', canDeleteIds);

            if (deleteError) {
              console.error('Database error:', deleteError);
              return NextResponse.json(
                { success: false, error: 'Failed to delete some templates' },
                { status: 500 }
              );
            }
          }

          // Build results
          results = [
            ...canDeleteIds.map((id: string) => ({ id, success: true })),
            ...cannotDeleteIds.map((id: string) => ({ 
              id, 
              success: false, 
              error: 'Template is being used in messages and cannot be deleted' 
            })),
          ];
        }
        break;
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    const response: ApiResponse<{
      results: typeof results;
      summary: {
        total: number;
        successful: number;
        failed: number;
      };
    }> = {
      success: failureCount === 0,
      data: {
        results,
        summary: {
          total: templateIds.length,
          successful: successCount,
          failed: failureCount,
        },
      },
      message: `Bulk ${operation} completed. ${successCount} successful, ${failureCount} failed.`,
    };

    return NextResponse.json(response);

  } catch (error) {
    return handleApiError(error, 'Failed to perform bulk operation');
  }
}