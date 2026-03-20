import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { authenticateApiRequest } from '@/middleware/authMiddleware';
import { handleApiError } from '@/utils/apiErrorHandling';

/**
 * GET /api/courses/statistics - Get course statistics
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

    // Get total courses count
    const { count: totalCourses, error: totalError } = await supabase
      .from('courses')
      .select('*', { count: 'exact', head: true });

    if (totalError) {
      console.error('Database error:', totalError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch total courses count' },
        { status: 500 }
      );
    }

    // Get active courses count
    const { count: activeCourses, error: activeError } = await supabase
      .from('courses')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    if (activeError) {
      console.error('Database error:', activeError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch active courses count' },
        { status: 500 }
      );
    }

    // Get price statistics
    const { data: priceData, error: priceError } = await supabase
      .from('courses')
      .select('price')
      .eq('is_active', true);

    if (priceError) {
      console.error('Database error:', priceError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch price data' },
        { status: 500 }
      );
    }

    const prices = priceData.map(course => course.price);
    const priceStats = {
      min: prices.length > 0 ? Math.min(...prices) : 0,
      max: prices.length > 0 ? Math.max(...prices) : 0,
      average: prices.length > 0 ? prices.reduce((sum, price) => sum + price, 0) / prices.length : 0,
    };

    // Get lead interest statistics
    const { data: leadData, error: leadError } = await supabase
      .from('leads')
      .select('course_interest, stage');

    if (leadError) {
      console.error('Database error:', leadError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch lead data' },
        { status: 500 }
      );
    }

    // Count leads by course interest
    const courseInterestCount = leadData.reduce((acc, lead) => {
      const course = lead.course_interest;
      if (!acc[course]) {
        acc[course] = { total: 0, converted: 0 };
      }
      acc[course].total++;
      if (lead.stage === 'converted') {
        acc[course].converted++;
      }
      return acc;
    }, {} as Record<string, { total: number; converted: number }>);

    // Get most popular courses
    const popularCourses = Object.entries(courseInterestCount)
      .sort(([, a], [, b]) => b.total - a.total)
      .slice(0, 5)
      .map(([course, stats]) => ({
        course,
        leadCount: stats.total,
        conversionRate: stats.total > 0 ? Math.round((stats.converted / stats.total) * 10000) / 100 : 0,
      }));

    // Get recent courses (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { count: recentCourses, error: recentError } = await supabase
      .from('courses')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', thirtyDaysAgo.toISOString());

    if (recentError) {
      console.error('Database error:', recentError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch recent courses count' },
        { status: 500 }
      );
    }

    const statistics = {
      total: totalCourses || 0,
      active: activeCourses || 0,
      inactive: (totalCourses || 0) - (activeCourses || 0),
      priceStats: {
        ...priceStats,
        average: Math.round(priceStats.average * 100) / 100,
      },
      popularCourses,
      recentCourses: recentCourses || 0,
      totalLeadInterest: Object.values(courseInterestCount).reduce((sum, stats) => sum + stats.total, 0),
    };

    return NextResponse.json({
      success: true,
      data: statistics,
    });

  } catch (error) {
    return handleApiError(error);
  }
}