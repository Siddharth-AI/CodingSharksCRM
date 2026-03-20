import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import {
  createCourseSchema,
  courseFiltersSchema
} from '@/models/course';
import { authenticateApiRequest } from '@/middleware/authMiddleware';
import { handleApiError } from '@/utils/apiErrorHandling';
import { Course, CourseType, CreateCourseRequest } from '@/types';

/**
 * GET /api/courses - Get all courses with filtering
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
    
    // Parse filter parameters
    const filters = {
      isActive: searchParams.get('isActive') ? searchParams.get('isActive') === 'true' : undefined,
      priceMin: searchParams.get('priceMin') ? parseFloat(searchParams.get('priceMin')!) : undefined,
      priceMax: searchParams.get('priceMax') ? parseFloat(searchParams.get('priceMax')!) : undefined,
      search: searchParams.get('search') || undefined,
    };

    // Remove undefined values
    const cleanFilters = Object.fromEntries(
      Object.entries(filters).filter(([_, value]) => value !== undefined)
    );

    // Validate filters
    if (Object.keys(cleanFilters).length > 0) {
      const { error: filterError } = courseFiltersSchema.validate(cleanFilters);
      if (filterError) {
        return NextResponse.json(
          { success: false, error: filterError.details[0].message },
          { status: 400 }
        );
      }
    }

    // Build Supabase query
    let query = supabaseAdmin
      .from('courses')
      .select('*');

    // Apply filters
    if (cleanFilters.isActive !== undefined) {
      query = query.eq('is_active', cleanFilters.isActive);
    }
    if (cleanFilters.priceMin !== undefined) {
      query = query.gte('price', cleanFilters.priceMin);
    }
    if (cleanFilters.priceMax !== undefined) {
      query = query.lte('price', cleanFilters.priceMax);
    }
    if (cleanFilters.search) {
      query = query.or(`name.ilike.%${cleanFilters.search}%,description.ilike.%${cleanFilters.search}%`);
    }

    // Order by name
    query = query.order('name', { ascending: true });

    const { data, error } = await query;

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch courses' },
        { status: 500 }
      );
    }

    // Transform data to match Course interface
    const courses: Course[] = (data || []).map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      duration: row.duration,
      price: row.price ?? undefined,
      courseType: row.course_type as CourseType,
      isActive: row.is_active,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    }));

    return NextResponse.json({
      success: true,
      data: courses,
    });

  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/courses - Create a new course
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

    // Validate input data
    const { error, value } = createCourseSchema.validate(body);
    if (error) {
      return NextResponse.json(
        { success: false, error: error.details[0].message },
        { status: 400 }
      );
    }

    const courseData: CreateCourseRequest = value;

    // Check for existing course with same name
    const { data: existingCourse } = await supabaseAdmin
      .from('courses')
      .select('id, name')
      .ilike('name', courseData.name)
      .single();

    if (existingCourse) {
      return NextResponse.json(
        { success: false, error: 'A course with this name already exists' },
        { status: 409 }
      );
    }

    // Insert new course
    const { data, error: insertError } = await supabaseAdmin
      .from('courses')
      .insert({
        name: courseData.name,
        description: courseData.description,
        duration: courseData.duration,
        price: courseData.price ?? undefined,
        course_type: courseData.courseType || 'regular',
        is_active: true, // New courses are active by default
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error('Database error:', insertError);
      return NextResponse.json(
        { success: false, error: 'Failed to create course' },
        { status: 500 }
      );
    }

    // Transform data to match Course interface
    const newCourse: Course = {
      id: data.id,
      name: data.name,
      description: data.description,
      duration: data.duration,
      price: data.price ?? undefined,
      courseType: data.course_type as CourseType,
      isActive: data.is_active,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };

    return NextResponse.json({
      success: true,
      data: newCourse,
      message: 'Course created successfully',
    }, { status: 201 });

  } catch (error) {
    return handleApiError(error);
  }
}