import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { RootState } from './index';
import {
  ApiResponse, 
  LoginRequest, 
  LoginResponse, 
  LogoutResponse,
  AdminUser,
  Lead,
  Course,
  MessageTemplate,
  WhatsAppMessage,
  Activity,
  DashboardStats,
  TrendData,
  ConversionData,
  CreateLeadRequest,
  UpdateLeadRequest,
  CreateCourseRequest,
  UpdateCourseRequest,
  CreateMessageTemplateRequest,
  UpdateMessageTemplateRequest,
  CreateMessageRequest,
  LeadFilters,
  PaginatedResponse,
  DateRange
} from '@/types';

// Base query with authentication and API debugging
const baseQuery = fetchBaseQuery({
  baseUrl: '/api',
  prepareHeaders: (headers, { getState }) => {
    // Get token from auth state
    const token = (getState() as RootState).auth.token;
    
    if (token) {
      headers.set('authorization', `Bearer ${token}`);
    }
    
    headers.set('content-type', 'application/json');
    return headers;
  },
});

// Base query with retry logic and error handling
const baseQueryWithRetry = async (args: any, api: any, extraOptions: any) => {
  let result = await baseQuery(args, api, extraOptions);

  // Handle authentication errors
  if (result.error && 'status' in result.error && result.error.status === 401) {
    api.dispatch({ type: 'auth/logout' });
  }

  // Retry once on network errors
  if (result.error && 'status' in result.error && result.error.status === 'FETCH_ERROR') {
    await new Promise(resolve => setTimeout(resolve, 1000));
    result = await baseQuery(args, api, extraOptions);
  }

  return result;
};

// Create API slice
export const api = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithRetry,
  tagTypes: ['Lead', 'Course', 'MessageTemplate', 'WhatsAppMessage', 'Activity', 'Dashboard', 'Auth'],
  endpoints: (builder) => ({
    // Health check endpoint
    healthCheck: builder.query<ApiResponse<{ status: string }>, void>({
      query: () => '/health',
    }),

    // Authentication endpoints
    login: builder.mutation<LoginResponse, LoginRequest>({
      query: (credentials) => ({
        url: '/auth/login',
        method: 'POST',
        body: credentials,
      }),
      invalidatesTags: ['Auth'],
    }),

    logout: builder.mutation<LogoutResponse, void>({
      query: () => ({
        url: '/auth/logout',
        method: 'POST',
      }),
      invalidatesTags: ['Auth'],
    }),

    verifyToken: builder.query<ApiResponse<AdminUser>, void>({
      query: () => '/auth/verify',
      providesTags: ['Auth'],
    }),

    refreshToken: builder.mutation<LoginResponse, void>({
      query: () => ({
        url: '/auth/refresh',
        method: 'POST',
      }),
      invalidatesTags: ['Auth'],
    }),

    getProfile: builder.query<ApiResponse<AdminUser>, void>({
      query: () => '/auth/profile',
      providesTags: ['Auth'],
    }),

    // Lead endpoints
    getLeads: builder.query<PaginatedResponse<Lead>, { page?: number; limit?: number; filters?: LeadFilters }>({
      query: ({ page = 1, limit = 10, filters = {} }) => {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: limit.toString(),
          ...Object.entries(filters).reduce((acc, [key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
              acc[key] = value.toString();
            }
            return acc;
          }, {} as Record<string, string>),
        });
        return `/leads?${params}`;
      },
      providesTags: (result) =>
        result
          ? [
              ...result.data.map(({ id }) => ({ type: 'Lead' as const, id })),
              { type: 'Lead', id: 'LIST' },
            ]
          : [{ type: 'Lead', id: 'LIST' }],
    }),

    getLeadById: builder.query<ApiResponse<Lead>, string>({
      query: (id) => `/leads/${id}`,
      providesTags: (result, error, id) => [{ type: 'Lead', id }],
    }),

    createLead: builder.mutation<ApiResponse<Lead>, CreateLeadRequest>({
      query: (leadData) => ({
        url: '/leads',
        method: 'POST',
        body: leadData,
      }),
      invalidatesTags: [{ type: 'Lead', id: 'LIST' }, 'Dashboard'],
    }),

    updateLead: builder.mutation<ApiResponse<Lead>, { id: string; data: UpdateLeadRequest }>({
      query: ({ id, data }) => ({
        url: `/leads/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Lead', id },
        { type: 'Lead', id: 'LIST' },
        'Dashboard',
      ],
    }),

    deleteLead: builder.mutation<ApiResponse<void>, string>({
      query: (id) => ({
        url: `/leads/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, id) => [
        { type: 'Lead', id },
        { type: 'Lead', id: 'LIST' },
        'Dashboard',
      ],
    }),

    updateLeadStage: builder.mutation<ApiResponse<Lead>, { id: string; stage: string }>({
      query: ({ id, stage }) => ({
        url: `/leads/${id}/stage`,
        method: 'PATCH',
        body: { stage },
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Lead', id },
        { type: 'Lead', id: 'LIST' },
        'Dashboard',
        'Activity',
      ],
    }),

    bulkUpdateStages: builder.mutation<ApiResponse<Lead[]>, { updates: Array<{ id: string; stage: string }> }>({
      query: ({ updates }) => ({
        url: '/leads/bulk-update-stages',
        method: 'POST',
        body: { updates },
      }),
      invalidatesTags: [{ type: 'Lead', id: 'LIST' }, 'Dashboard', 'Activity'],
    }),

    searchLeads: builder.query<PaginatedResponse<Lead>, { query: string; page?: number; limit?: number }>({
      query: ({ query, page = 1, limit = 10 }) => {
        const params = new URLSearchParams({
          q: query,
          page: page.toString(),
          limit: limit.toString(),
        });
        return `/leads/search?${params}`;
      },
      providesTags: (result) =>
        result
          ? [
              ...result.data.map(({ id }) => ({ type: 'Lead' as const, id })),
              { type: 'Lead', id: 'SEARCH' },
            ]
          : [{ type: 'Lead', id: 'SEARCH' }],
    }),

    getLeadStatistics: builder.query<ApiResponse<{
      total: number;
      byStage: Record<string, number>;
      bySource: Record<string, number>;
      byCourse: Record<string, number>;
      conversionRate: number;
      recentLeads: number;
      followUpRequired: number;
      averageTimeToConversion: number;
    }>, void>({
      query: () => '/leads/statistics',
      providesTags: ['Dashboard'],
    }),

    checkDuplicateLead: builder.query<ApiResponse<{ data: Lead[]; count: number; mobile: string }>, string>({
      query: (mobile) => `/leads/check-duplicate?mobile=${encodeURIComponent(mobile)}`,
      providesTags: ['Lead'],
    }),

    exportLeads: builder.mutation<Blob, { filters?: LeadFilters; format?: 'csv' }>({
      query: ({ filters, format = 'csv' }) => ({
        url: '/leads/export',
        method: 'POST',
        body: { filters, format },
        responseHandler: (response: Response) => response.blob(),
      }),
    }),

    // Course endpoints
    getCourses: builder.query<ApiResponse<Course[]>, void>({
      query: () => '/courses',
      providesTags: (result) =>
        result?.data
          ? [
              ...result.data.map(({ id }) => ({ type: 'Course' as const, id })),
              { type: 'Course', id: 'LIST' },
            ]
          : [{ type: 'Course', id: 'LIST' }],
    }),

    getCourseById: builder.query<ApiResponse<Course>, string>({
      query: (id) => `/courses/${id}`,
      providesTags: (result, error, id) => [{ type: 'Course', id }],
    }),

    createCourse: builder.mutation<ApiResponse<Course>, CreateCourseRequest>({
      query: (courseData) => ({
        url: '/courses',
        method: 'POST',
        body: courseData,
      }),
      invalidatesTags: [{ type: 'Course', id: 'LIST' }],
    }),

    updateCourse: builder.mutation<ApiResponse<Course>, { id: string; data: UpdateCourseRequest }>({
      query: ({ id, data }) => ({
        url: `/courses/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Course', id },
        { type: 'Course', id: 'LIST' },
        'MessageTemplate',
      ],
    }),

    deleteCourse: builder.mutation<ApiResponse<void>, string>({
      query: (id) => ({
        url: `/courses/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, id) => [
        { type: 'Course', id },
        { type: 'Course', id: 'LIST' },
        'MessageTemplate',
      ],
    }),

    // Message Template endpoints
    getTemplates: builder.query<PaginatedResponse<MessageTemplate>, { 
      page?: number; 
      limit?: number; 
      courseId?: string; 
      type?: string; 
      isActive?: boolean; 
      search?: string;
      sortBy?: string;
      sortOrder?: string;
    }>({
      query: ({ page = 1, limit = 10, courseId, type, isActive, search, sortBy, sortOrder }) => {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: limit.toString(),
        });
        if (courseId) params.append('courseId', courseId);
        if (type) params.append('type', type);
        if (isActive !== undefined) params.append('isActive', isActive.toString());
        if (search) params.append('search', search);
        if (sortBy) params.append('sortBy', sortBy);
        if (sortOrder) params.append('sortOrder', sortOrder);
        return `/templates?${params}`;
      },
      providesTags: (result) =>
        result?.data
          ? [
              ...result.data.map(({ id }) => ({ type: 'MessageTemplate' as const, id })),
              { type: 'MessageTemplate', id: 'LIST' },
            ]
          : [{ type: 'MessageTemplate', id: 'LIST' }],
    }),

    getTemplateById: builder.query<ApiResponse<MessageTemplate>, string>({
      query: (id) => `/templates/${id}`,
      providesTags: (result, error, id) => [{ type: 'MessageTemplate', id }],
    }),

    createTemplate: builder.mutation<ApiResponse<MessageTemplate>, CreateMessageTemplateRequest>({
      query: (templateData) => ({
        url: '/templates',
        method: 'POST',
        body: templateData,
      }),
      invalidatesTags: [{ type: 'MessageTemplate', id: 'LIST' }],
    }),

    updateTemplate: builder.mutation<ApiResponse<MessageTemplate>, { id: string; data: UpdateMessageTemplateRequest }>({
      query: ({ id, data }) => ({
        url: `/templates/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'MessageTemplate', id },
        { type: 'MessageTemplate', id: 'LIST' },
      ],
    }),

    deleteTemplate: builder.mutation<ApiResponse<void>, string>({
      query: (id) => ({
        url: `/templates/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, id) => [
        { type: 'MessageTemplate', id },
        { type: 'MessageTemplate', id: 'LIST' },
      ],
    }),

    getTemplatePreview: builder.query<ApiResponse<{
      preview: string;
      template: MessageTemplate;
      lead?: any;
      course?: any;
      missingVariables: string[];
      substitutionCount: number;
      variablesUsed: string[];
    }>, string>({
      query: (id) => `/templates/${id}/preview`,
      providesTags: (result, error, id) => [{ type: 'MessageTemplate', id }],
    }),

    generateTemplatePreview: builder.mutation<ApiResponse<{
      preview: string;
      template: MessageTemplate;
      lead?: any;
      course?: any;
      missingVariables: string[];
      substitutionCount: number;
      variablesUsed: string[];
    }>, { 
      id: string; 
      leadId?: string; 
      courseId?: string; 
      customVariables?: Record<string, string>;
      useDefaultData?: boolean;
    }>({
      query: ({ id, leadId, courseId, customVariables, useDefaultData }) => ({
        url: `/templates/${id}/preview`,
        method: 'POST',
        body: { leadId, courseId, customVariables, useDefaultData },
      }),
    }),

    getTemplateStatistics: builder.query<ApiResponse<{
      summary: {
        totalTemplates: number;
        activeTemplates: number;
        totalMessagesSent: number;
        avgDeliveryRate: number;
        avgReadRate: number;
      };
      templateStats: Array<{
        template: MessageTemplate;
        messagesSent: number;
        deliveryRate: number;
        readRate: number;
        lastUsed: Date | null;
        performance: 'High' | 'Medium' | 'Low';
      }>;
      distribution: {
        byType: Record<string, number>;
        byCourse: Array<{ courseId: string; courseName: string; count: number }>;
      };
      performance: {
        topPerforming: Array<{
          template: MessageTemplate;
          messagesSent: number;
          deliveryRate: number;
          readRate: number;
        }>;
        underperforming: Array<{
          template: MessageTemplate;
          messagesSent: number;
          deliveryRate: number;
          readRate: number;
        }>;
      };
      trends: Array<{
        date: string;
        messagesSent: number;
        deliveryRate: number;
        readRate: number;
      }> | null;
      dateRange?: { from: string; to: string };
    }>, { 
      courseId?: string; 
      dateFrom?: string; 
      dateTo?: string; 
      type?: string;
    }>({
      query: ({ courseId, dateFrom, dateTo, type }) => {
        const params = new URLSearchParams();
        if (courseId) params.append('courseId', courseId);
        if (dateFrom) params.append('dateFrom', dateFrom);
        if (dateTo) params.append('dateTo', dateTo);
        if (type) params.append('type', type);
        return `/templates/statistics?${params}`;
      },
      providesTags: ['MessageTemplate', 'Dashboard'],
    }),

    bulkTemplateOperation: builder.mutation<ApiResponse<{
      results: Array<{ id: string; success: boolean; error?: string }>;
      summary: {
        total: number;
        successful: number;
        failed: number;
      };
    }>, { 
      templateIds: string[]; 
      operation: 'activate' | 'deactivate' | 'delete';
    }>({
      query: ({ templateIds, operation }) => ({
        url: '/templates/bulk',
        method: 'POST',
        body: { templateIds, operation },
      }),
      invalidatesTags: [{ type: 'MessageTemplate', id: 'LIST' }],
    }),

    // WhatsApp Message endpoints
    getMessages: builder.query<ApiResponse<WhatsAppMessage[]>, { leadId?: string; page?: number; limit?: number }>({
      query: ({ leadId, page = 1, limit = 50 }) => {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: limit.toString(),
        });
        if (leadId) {
          params.append('leadId', leadId);
        }
        return `/messages?${params}`;
      },
      providesTags: (result) =>
        result?.data
          ? [
              ...result.data.map(({ id }) => ({ type: 'WhatsAppMessage' as const, id })),
              { type: 'WhatsAppMessage', id: 'LIST' },
            ]
          : [{ type: 'WhatsAppMessage', id: 'LIST' }],
    }),

    sendMessage: builder.mutation<ApiResponse<WhatsAppMessage>, CreateMessageRequest>({
      query: (messageData) => ({
        url: '/messages/send',
        method: 'POST',
        body: messageData,
      }),
      invalidatesTags: [{ type: 'WhatsAppMessage', id: 'LIST' }, 'Activity', 'Dashboard'],
    }),

    resendMessage: builder.mutation<ApiResponse<WhatsAppMessage>, string>({
      query: (messageId) => ({
        url: `/messages/${messageId}/resend`,
        method: 'POST',
      }),
      invalidatesTags: (result, error, messageId) => [
        { type: 'WhatsAppMessage', id: messageId },
        { type: 'WhatsAppMessage', id: 'LIST' },
        'Activity',
      ],
    }),

    deleteMessage: builder.mutation<ApiResponse<void>, string>({
      query: (messageId) => ({
        url: `/messages/${messageId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, messageId) => [
        { type: 'WhatsAppMessage', id: messageId },
        { type: 'WhatsAppMessage', id: 'LIST' },
      ],
    }),

    getMessageStatus: builder.query<ApiResponse<{ status: string }>, string>({
      query: (messageId) => `/messages/${messageId}/status`,
      providesTags: (result, error, messageId) => [{ type: 'WhatsAppMessage', id: messageId }],
    }),

    // Activity endpoints
    getActivities: builder.query<ApiResponse<Activity[]>, { leadId?: string; page?: number; limit?: number; type?: string }>({
      query: ({ leadId, page = 1, limit = 20, type }) => {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: limit.toString(),
        });
        if (leadId) {
          params.append('leadId', leadId);
        }
        if (type) {
          params.append('type', type);
        }
        return `/activities?${params}`;
      },
      providesTags: (result) =>
        result?.data
          ? [
              ...result.data.map(({ id }) => ({ type: 'Activity' as const, id })),
              { type: 'Activity', id: 'LIST' },
            ]
          : [{ type: 'Activity', id: 'LIST' }],
    }),

    // Dashboard endpoints
    getDashboardStats: builder.query<ApiResponse<DashboardStats>, DateRange>({
      query: ({ from, to }) => {
        const params = new URLSearchParams({ from, to });
        return `/dashboard/stats?${params}`;
      },
      providesTags: ['Dashboard'],
    }),

    getDashboardTrends: builder.query<ApiResponse<TrendData[]>, { period: 'daily' | 'weekly' | 'monthly'; dateRange: DateRange }>({
      query: ({ period, dateRange }) => {
        const params = new URLSearchParams({ period, from: dateRange.from, to: dateRange.to });
        return `/dashboard/trends?${params}`;
      },
      providesTags: ['Dashboard'],
    }),

    getDashboardConversion: builder.query<ApiResponse<ConversionData[]>, DateRange>({
      query: ({ from, to }) => {
        const params = new URLSearchParams({ from, to });
        return `/dashboard/conversion?${params}`;
      },
      providesTags: ['Dashboard'],
    }),

    exportDashboardData: builder.mutation<Blob, { format: 'csv' | 'xlsx'; dateRange: DateRange }>({
      query: ({ format, dateRange }) => ({
        url: '/dashboard/export',
        method: 'POST',
        body: {
          format,
          from: dateRange.from,
          to: dateRange.to,
        },
        responseHandler: (response: Response) => response.blob(),
      }),
    }),

    // Workflow endpoints
    scheduleWelcomeMessage: builder.mutation<ApiResponse<{ success: boolean; scheduledMessageId?: string; error?: string }>, {
      leadId: string;
      templateId?: string;
      customContent?: string;
    }>({
      query: ({ leadId, templateId, customContent }) => ({
        url: '/workflows/schedule',
        method: 'POST',
        body: {
          leadId,
          workflowType: 'welcome',
          templateId,
          customContent,
        },
      }),
      invalidatesTags: [{ type: 'WhatsAppMessage', id: 'LIST' }, 'Activity'],
    }),

    scheduleFollowUpSequence: builder.mutation<ApiResponse<{ success: boolean; scheduledCount: number; error?: string }>, {
      leadId: string;
      startDate?: string;
    }>({
      query: ({ leadId, startDate }) => ({
        url: '/workflows/schedule',
        method: 'POST',
        body: {
          leadId,
          workflowType: 'follow_up',
          startDate,
        },
      }),
      invalidatesTags: [{ type: 'WhatsAppMessage', id: 'LIST' }, 'Activity'],
    }),

    scheduleNurturingSequence: builder.mutation<ApiResponse<{ success: boolean; scheduledCount: number; error?: string }>, {
      leadId: string;
      startDate?: string;
    }>({
      query: ({ leadId, startDate }) => ({
        url: '/workflows/schedule',
        method: 'POST',
        body: {
          leadId,
          workflowType: 'nurturing',
          startDate,
        },
      }),
      invalidatesTags: [{ type: 'WhatsAppMessage', id: 'LIST' }, 'Activity'],
    }),

    processDueMessages: builder.mutation<ApiResponse<{
      success: boolean;
      processed: number;
      sent: number;
      failed: number;
      errors: string[];
    }>, void>({
      query: () => ({
        url: '/workflows/process',
        method: 'POST',
      }),
      invalidatesTags: [{ type: 'WhatsAppMessage', id: 'LIST' }, 'Activity', 'Dashboard'],
    }),

    cancelScheduledMessages: builder.mutation<ApiResponse<{ success: boolean; cancelledCount: number; error?: string }>, {
      leadId: string;
      workflowType?: 'welcome' | 'follow_up' | 'nurturing' | 'conversion' | 'custom';
    }>({
      query: ({ leadId, workflowType }) => ({
        url: '/workflows/cancel',
        method: 'POST',
        body: { leadId, workflowType },
      }),
      invalidatesTags: [{ type: 'WhatsAppMessage', id: 'LIST' }],
    }),

    getScheduledMessages: builder.query<ApiResponse<Array<{
      id: string;
      leadId: string;
      templateId?: string;
      content: string;
      scheduledAt: Date;
      status: 'pending' | 'sent' | 'failed' | 'cancelled';
      workflowType: 'welcome' | 'follow_up' | 'nurturing' | 'conversion' | 'custom';
      sequenceNumber?: number;
      totalInSequence?: number;
    }>>, string>({
      query: (leadId) => `/workflows/scheduled/${leadId}`,
      providesTags: (result, error, leadId) => [{ type: 'WhatsAppMessage', id: `SCHEDULED_${leadId}` }],
    }),

    getWorkflowStatistics: builder.query<ApiResponse<{
      totalScheduled: number;
      totalSent: number;
      totalFailed: number;
      byWorkflowType: Record<string, { scheduled: number; sent: number; failed: number }>;
      averageDeliveryTime: number;
    }>, { dateFrom?: string; dateTo?: string }>({
      query: ({ dateFrom, dateTo }) => {
        const params = new URLSearchParams();
        if (dateFrom) params.append('dateFrom', dateFrom);
        if (dateTo) params.append('dateTo', dateTo);
        return `/workflows/statistics?${params}`;
      },
      providesTags: ['Dashboard'],
    }),
  }),
});

// Export hooks
export const { 
  // Health check
  useHealthCheckQuery,
  
  // Authentication hooks
  useLoginMutation,
  useLogoutMutation,
  useVerifyTokenQuery,
  useRefreshTokenMutation,
  useGetProfileQuery,
  
  // Lead hooks
  useGetLeadsQuery,
  useGetLeadByIdQuery,
  useCreateLeadMutation,
  useUpdateLeadMutation,
  useDeleteLeadMutation,
  useUpdateLeadStageMutation,
  useBulkUpdateStagesMutation,
  useSearchLeadsQuery,
  useGetLeadStatisticsQuery,
  useCheckDuplicateLeadQuery,
  useExportLeadsMutation,
  
  // Course hooks
  useGetCoursesQuery,
  useGetCourseByIdQuery,
  useCreateCourseMutation,
  useUpdateCourseMutation,
  useDeleteCourseMutation,
  
  // Template hooks
  useGetTemplatesQuery,
  useGetTemplateByIdQuery,
  useCreateTemplateMutation,
  useUpdateTemplateMutation,
  useDeleteTemplateMutation,
  useGetTemplatePreviewQuery,
  useGenerateTemplatePreviewMutation,
  useGetTemplateStatisticsQuery,
  useBulkTemplateOperationMutation,
  
  // Message hooks
  useGetMessagesQuery,
  useSendMessageMutation,
  useResendMessageMutation,
  useDeleteMessageMutation,
  useGetMessageStatusQuery,
  
  // Activity hooks
  useGetActivitiesQuery,
  
  // Dashboard hooks
  useGetDashboardStatsQuery,
  useGetDashboardTrendsQuery,
  useGetDashboardConversionQuery,
  useExportDashboardDataMutation,

  // Workflow hooks
  useScheduleWelcomeMessageMutation,
  useScheduleFollowUpSequenceMutation,
  useScheduleNurturingSequenceMutation,
  useProcessDueMessagesMutation,
  useCancelScheduledMessagesMutation,
  useGetScheduledMessagesQuery,
  useGetWorkflowStatisticsQuery,
} = api;