import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * GET /api/public/courses
 * Public endpoint — no auth required.
 * Returns active courses for use in external forms (e.g. CodingShark website).
 *
 * Query params:
 *   courseType — filter by type: 'regular' | 'workshop' | 'all' (default: all)
 *
 * Examples:
 *   /api/public/courses                      → all active courses
 *   /api/public/courses?courseType=workshop  → only workshops
 *   /api/public/courses?courseType=regular   → only regular courses
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const courseType = searchParams.get('courseType') || 'all';

    let query = supabaseAdmin
      .from('courses')
      .select('id, name, description, duration, price, course_type')
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (courseType !== 'all') {
      query = query.eq('course_type', courseType);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Public courses fetch error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch courses' },
        { status: 500 }
      );
    }

    const courses = (data || []).map(row => ({
      id:          row.id,
      name:        row.name,
      description: row.description,
      duration:    row.duration,
      price:       row.price,
      courseType:  row.course_type,
    }));

    return NextResponse.json({ success: true, data: courses });

  } catch (err) {
    console.error('Public courses error:', err);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
