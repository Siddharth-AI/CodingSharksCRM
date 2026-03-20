import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { updateCourseSchema } from '@/models/course';
import { authenticateApiRequest } from '@/middleware/authMiddleware';
import { handleApiError } from '@/utils/apiErrorHandling';
import { Course, UpdateCourseRequest } from '@/types';

/**
 * GET /api/courses/[id] - Get course by ID
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
        { success: false, error: 'Invalid course ID format' },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('courses')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { success: false, error: 'Course not found' },
          { status: 404 }
        );
      }
      console.error('Database error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch course' },
        { status: 500 }
      );
    }

    // Transform data to match Course interface
    const course: Course = {
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
      data: course,
    });

  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PUT /api/courses/[id] - Update course by ID
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
        { success: false, error: 'Invalid course ID format' },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Validate input data
    const { error, value } = updateCourseSchema.validate(body);
    if (error) {
      return NextResponse.json(
        { success: false, error: error.details[0].message },
        { status: 400 }
      );
    }

    const updateData: UpdateCourseRequest = value;

    // Check if course exists
    const { data: existingCourse, error: fetchError } = await supabaseAdmin
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

    // Check for name uniqueness if name is being updated
    if (updateData.name && updateData.name !== existingCourse.name) {
      const { data: duplicateCourse } = await supabaseAdmin
        .from('courses')
        .select('id')
        .ilike('name', updateData.name)
        .neq('id', id)
        .single();

      if (duplicateCourse) {
        return NextResponse.json(
          { success: false, error: 'A course with this name already exists' },
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
    if (updateData.description !== undefined) {
      updateObject.description = updateData.description;
    }
    if (updateData.duration !== undefined) {
      updateObject.duration = updateData.duration;
    }
    if (updateData.price !== undefined) {
      updateObject.price = updateData.price;
    }
    if (updateData.courseType !== undefined) {
      updateObject.course_type = updateData.courseType;
    }
    if (updateData.isActive !== undefined) {
      updateObject.is_active = updateData.isActive;
    }

    // Update course
    const { data, error: updateError } = await supabaseAdmin
      .from('courses')
      .update(updateObject)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Database error:', updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to update course' },
        { status: 500 }
      );
    }

    // Transform data to match Course interface
    const updatedCourse: Course = {
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
      data: updatedCourse,
      message: 'Course updated successfully',
    });

  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * DELETE /api/courses/[id] - Delete course by ID
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
        { success: false, error: 'Invalid course ID format' },
        { status: 400 }
      );
    }

    // Check if course exists
    const { data: existingCourse, error: fetchError } = await supabaseAdmin
      .from('courses')
      .select('id, name')
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

    // Check if course has associated leads
    const { count: leadCount } = await supabaseAdmin
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .eq('course_interest', existingCourse.name);

    if (leadCount && leadCount > 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Cannot delete course. ${leadCount} lead(s) are interested in this course. Please deactivate the course instead.` 
        },
        { status: 409 }
      );
    }

    // Check if course has associated message templates
    const { count: templateCount } = await supabaseAdmin
      .from('message_templates')
      .select('*', { count: 'exact', head: true })
      .eq('course_id', id);

    if (templateCount && templateCount > 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Cannot delete course. ${templateCount} message template(s) are associated with this course. Please delete the templates first.` 
        },
        { status: 409 }
      );
    }

    // Delete the course
    const { error: deleteError } = await supabaseAdmin
      .from('courses')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Database error:', deleteError);
      return NextResponse.json(
        { success: false, error: 'Failed to delete course' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Course "${existingCourse.name}" deleted successfully`,
    });

  } catch (error) {
    return handleApiError(error);
  }
}