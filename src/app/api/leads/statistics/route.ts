import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { authenticateApiRequest } from '@/middleware/authMiddleware';
import { handleApiError } from '@/utils/apiErrorHandling';
import { LeadStage, LeadSource } from '@/types';

/**
 * GET /api/leads/statistics - Get lead statistics for dashboard
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

    // Get total leads count
    const { count: totalLeads, error: totalError } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true });

    if (totalError) {
      console.error('Database error:', totalError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch total leads count' },
        { status: 500 }
      );
    }

    // Get leads count by stage
    const { data: stageData, error: stageError } = await supabase
      .from('leads')
      .select('stage')
      .order('stage');

    if (stageError) {
      console.error('Database error:', stageError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch leads by stage' },
        { status: 500 }
      );
    }

    // Count leads by stage
    const byStage = stageData.reduce((acc, lead) => {
      acc[lead.stage as LeadStage] = (acc[lead.stage as LeadStage] || 0) + 1;
      return acc;
    }, {} as Record<LeadStage, number>);

    // Ensure all stages are represented
    Object.values(LeadStage).forEach(stage => {
      if (!(stage in byStage)) {
        byStage[stage] = 0;
      }
    });

    // Get leads count by source
    const { data: sourceData, error: sourceError } = await supabase
      .from('leads')
      .select('source')
      .order('source');

    if (sourceError) {
      console.error('Database error:', sourceError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch leads by source' },
        { status: 500 }
      );
    }

    // Count leads by source
    const bySource = sourceData.reduce((acc, lead) => {
      acc[lead.source as LeadSource] = (acc[lead.source as LeadSource] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Get leads count by course interest
    const { data: courseData, error: courseError } = await supabase
      .from('leads')
      .select('course_interest')
      .order('course_interest');

    if (courseError) {
      console.error('Database error:', courseError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch leads by course' },
        { status: 500 }
      );
    }

    // Count leads by course interest
    const byCourse = courseData.reduce((acc, lead) => {
      const course = lead.course_interest || 'Unknown';
      acc[course] = (acc[course] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Calculate conversion rate
    const convertedCount = byStage[LeadStage.CONVERTED] || 0;
    const conversionRate = totalLeads && totalLeads > 0 
      ? Math.round((convertedCount / totalLeads) * 10000) / 100 // Round to 2 decimal places
      : 0;

    // Get recent leads (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { count: recentLeadsCount, error: recentError } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', thirtyDaysAgo.toISOString());

    if (recentError) {
      console.error('Database error:', recentError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch recent leads count' },
        { status: 500 }
      );
    }

    // Get leads requiring follow-up (contacted but not progressed in 24+ hours)
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    const { count: followUpCount, error: followUpError } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .eq('stage', LeadStage.CONTACTED)
      .lte('last_contacted_at', oneDayAgo.toISOString());

    if (followUpError) {
      console.error('Database error:', followUpError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch follow-up leads count' },
        { status: 500 }
      );
    }

    // Get average time to conversion (for converted leads)
    const { data: convertedLeads, error: convertedError } = await supabase
      .from('leads')
      .select('created_at, updated_at')
      .eq('stage', LeadStage.CONVERTED);

    if (convertedError) {
      console.error('Database error:', convertedError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch converted leads' },
        { status: 500 }
      );
    }

    let averageTimeToConversion = 0;
    if (convertedLeads && convertedLeads.length > 0) {
      const totalTime = convertedLeads.reduce((sum, lead) => {
        const createdAt = new Date(lead.created_at);
        const updatedAt = new Date(lead.updated_at);
        return sum + (updatedAt.getTime() - createdAt.getTime());
      }, 0);
      
      averageTimeToConversion = Math.round(totalTime / convertedLeads.length / (1000 * 60 * 60 * 24)); // Convert to days
    }

    const statistics = {
      total: totalLeads || 0,
      byStage,
      bySource,
      byCourse,
      conversionRate,
      recentLeads: recentLeadsCount || 0,
      followUpRequired: followUpCount || 0,
      averageTimeToConversion, // in days
    };

    return NextResponse.json({
      success: true,
      data: statistics,
    });

  } catch (error) {
    return handleApiError(error);
  }
}