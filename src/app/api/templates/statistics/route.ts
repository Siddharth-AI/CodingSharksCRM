import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { authenticateApiRequest } from '@/middleware/authMiddleware';
import { handleApiError } from '@/utils/apiErrorHandling';
import { generateTemplateReport } from '@/utils/templateUtils';
import { MessageTemplate, TemplateType, ApiResponse } from '@/types';

/**
 * GET /api/templates/statistics - Get template usage statistics and performance metrics
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
    const courseId = searchParams.get('courseId');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const templateType = searchParams.get('type') as TemplateType;

    // Get templates with optional filtering
    let templatesQuery = supabase
      .from('message_templates')
      .select('*');

    if (courseId) {
      templatesQuery = templatesQuery.eq('course_id', courseId);
    }

    if (templateType) {
      templatesQuery = templatesQuery.eq('type', templateType);
    }

    const { data: templatesData, error: templatesError } = await templatesQuery;

    if (templatesError) {
      console.error('Database error:', templatesError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch templates' },
        { status: 500 }
      );
    }

    // Get messages with optional date filtering
    let messagesQuery = supabase
      .from('whatsapp_messages')
      .select('*')
      .not('template_id', 'is', null);

    if (dateFrom) {
      messagesQuery = messagesQuery.gte('created_at', dateFrom);
    }

    if (dateTo) {
      messagesQuery = messagesQuery.lte('created_at', dateTo);
    }

    const { data: messagesData, error: messagesError } = await messagesQuery;

    if (messagesError) {
      console.error('Database error:', messagesError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch messages' },
        { status: 500 }
      );
    }

    // Transform templates data
    const templates: MessageTemplate[] = (templatesData || []).map(item => ({
      id: item.id,
      courseId: item.course_id,
      type: item.type as TemplateType,
      name: item.name,
      content: item.content,
      variables: item.variables || [],
      variableDefaults: item.variable_defaults || {},
      isActive: item.is_active,
      createdAt: new Date(item.created_at),
      updatedAt: new Date(item.updated_at),
    }));

    // Generate comprehensive report
    const dateRange = dateFrom && dateTo ? {
      from: new Date(dateFrom),
      to: new Date(dateTo),
    } : undefined;

    const report = generateTemplateReport(templates, messagesData || [], dateRange);

    // Calculate additional statistics
    const templatesByType = templates.reduce((acc, template) => {
      acc[template.type] = (acc[template.type] || 0) + 1;
      return acc;
    }, {} as Record<TemplateType, number>);

    const templatesByCourse = templates.reduce((acc, template) => {
      acc[template.courseId] = (acc[template.courseId] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Get course names for better reporting
    const courseIds = [...new Set(templates.map(t => t.courseId))];
    const { data: coursesData } = await supabase
      .from('courses')
      .select('id, name')
      .in('id', courseIds);

    const courseNames = (coursesData || []).reduce((acc, course) => {
      acc[course.id] = course.name;
      return acc;
    }, {} as Record<string, string>);

    // Calculate performance metrics
    const topPerformingTemplates = report.templateStats
      .filter(stat => stat.messagesSent > 0)
      .sort((a, b) => {
        // Sort by performance score (delivery rate * read rate * usage)
        const scoreA = (a.deliveryRate / 100) * (a.readRate / 100) * Math.log(a.messagesSent + 1);
        const scoreB = (b.deliveryRate / 100) * (b.readRate / 100) * Math.log(b.messagesSent + 1);
        return scoreB - scoreA;
      })
      .slice(0, 5);

    const underperformingTemplates = report.templateStats
      .filter(stat => stat.messagesSent > 10 && stat.performance === 'Low')
      .slice(0, 5);

    // Calculate trends (if date range is provided)
    let trends = null;
    if (dateRange && messagesData) {
      const dailyStats = messagesData.reduce((acc, message) => {
        const date = new Date(message.created_at).toISOString().split('T')[0];
        if (!acc[date]) {
          acc[date] = { sent: 0, delivered: 0, read: 0 };
        }
        acc[date].sent++;
        if (message.delivered_at) acc[date].delivered++;
        if (message.read_at) acc[date].read++;
        return acc;
      }, {} as Record<string, { sent: number; delivered: number; read: number }>);

      trends = (Object.entries(dailyStats) as Array<[string, { sent: number; delivered: number; read: number }]>)
        .map(([date, stats]) => ({
          date,
          messagesSent: stats.sent,
          deliveryRate: stats.sent > 0 ? (stats.delivered / stats.sent) * 100 : 0,
          readRate: stats.sent > 0 ? (stats.read / stats.sent) * 100 : 0,
        }))
        .sort((a, b) => a.date.localeCompare(b.date));
    }

    const response: ApiResponse<{
      summary: typeof report.summary;
      templateStats: typeof report.templateStats;
      distribution: {
        byType: Record<TemplateType, number>;
        byCourse: Array<{ courseId: string; courseName: string; count: number }>;
      };
      performance: {
        topPerforming: typeof topPerformingTemplates;
        underperforming: typeof underperformingTemplates;
      };
      trends: typeof trends;
      dateRange?: { from: Date; to: Date };
    }> = {
      success: true,
      data: {
        summary: report.summary,
        templateStats: report.templateStats,
        distribution: {
          byType: templatesByType,
          byCourse: Object.entries(templatesByCourse).map(([courseId, count]) => ({
            courseId,
            courseName: courseNames[courseId] || 'Unknown Course',
            count,
          })),
        },
        performance: {
          topPerforming: topPerformingTemplates,
          underperforming: underperformingTemplates,
        },
        trends,
        dateRange,
      },
    };

    return NextResponse.json(response);

  } catch (error) {
    return handleApiError(error, 'Failed to fetch template statistics');
  }
}