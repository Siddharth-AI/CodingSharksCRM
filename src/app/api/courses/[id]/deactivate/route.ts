import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { authenticateApiRequest } from '@/middleware/authMiddleware';
import { handleApiError } from '@/utils/apiErrorHandling';
import { Course } from '@/types';

/**
 * PATCH /api/courses/[id]/deactivate - Deactivate course
 */
export async function PATCH(
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
        { success: false, error: 'Invalid course ID format' },
        { status: 400 }
      );
    }

    // Check if course exists
    const { data: existingCourse, error: fetchError } = await supabase
      .from('courses')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json(
          { success: false, error: 'Course not found' },
          { status: 404 }
        );
      }
      console.error('Database error:', fetchError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch course' },
        { status: 500 }
      );
    }

    // Check if course is already inactive
    if (!existingCourse.is_active) {
      return NextResponse.json(
        { success: false, error: 'Course is already inactive' },
        { status: 400 }
      );
    }

    // Deactivate course
    const { data, error: updateError } = await supabase
      .from('courses')
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Database error:', updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to deactivate course' },
        { status: 500 }
      );
    }

    // Transform data to match Course interface
    const deactivatedCourse: Course = {
      id: data.id,
      name: data.name,
      description: data.description,
      duration: data.duration,
      price: data.price ?? undefined,
      courseType: data.course_type,
      isActive: data.is_active,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };

    return NextResponse.json({
      success: true,
      data: deactivatedCourse,
      message: `Course "${deactivatedCourse.name}" deactivated successfully`,
    });

  } catch (error) {
    return handleApiError(error);
  }
}