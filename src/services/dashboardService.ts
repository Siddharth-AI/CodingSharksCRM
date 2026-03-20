import { BaseService } from './baseService';
import {
  DashboardStats,
  ConversionData,
  TrendData,
  DateRange,
  LeadStage,
} from '@/types';

/**
 * Dashboard service for analytics and statistics
 */
export class DashboardService extends BaseService {
  constructor() {
    super('/dashboard');
  }

  /**
   * Get comprehensive dashboard statistics
   */
  async getStats(dateRange?: DateRange): Promise<DashboardStats> {
    const params = dateRange ? {
      from: this.formatDate(dateRange.from),
      to: this.formatDate(dateRange.to),
    } : {};
    
    return this.get<DashboardStats>('/stats', params);
  }

  /**
   * Get lead conversion funnel data
   */
  async getConversionFunnel(courseId?: string): Promise<ConversionData[]> {
    const params = courseId ? { courseId } : {};
    return this.get<ConversionData[]>('/conversion-funnel', params);
  }

  /**
   * Get lead trends over time
   */
  async getLeadTrends(
    period: 'daily' | 'weekly' | 'monthly' = 'daily',
    dateRange?: DateRange
  ): Promise<TrendData[]> {
    const params: any = { period };
    if (dateRange) {
      params.from = this.formatDate(dateRange.from);
      params.to = this.formatDate(dateRange.to);
    }
    
    return this.get<TrendData[]>('/lead-trends', params);
  }

  /**
   * Get leads count by stage
   */
  async getLeadsByStage(): Promise<Record<LeadStage, number>> {
    return this.get<Record<LeadStage, number>>('/leads-by-stage');
  }

  /**
   * Get leads distribution by course
   */
  async getLeadsByCourse(): Promise<Record<string, number>> {
    return this.get<Record<string, number>>('/leads-by-course');
  }

  /**
   * Get leads distribution by source
   */
  async getLeadsBySource(): Promise<Record<string, number>> {
    return this.get<Record<string, number>>('/leads-by-source');
  }

  /**
   * Get message delivery statistics
   */
  async getMessageStats(): Promise<{
    total: number;
    sent: number;
    delivered: number;
    read: number;
    failed: number;
    deliveryRate: number;
    readRate: number;
    avgDeliveryTime: number;
  }> {
    return this.get('/message-stats');
  }

  /**
   * Get conversion rates between stages
   */
  async getConversionRates(): Promise<{
    newToContacted: number;
    contactedToInterested: number;
    interestedToConverted: number;
    overallConversion: number;
  }> {
    return this.get('/conversion-rates');
  }

  /**
   * Get top performing courses
   */
  async getTopCourses(limit: number = 5): Promise<Array<{
    courseId: string;
    courseName: string;
    leadCount: number;
    conversionRate: number;
    revenue: number;
  }>> {
    return this.get('/top-courses', { limit });
  }

  /**
   * Get recent activities summary
   */
  async getRecentActivities(limit: number = 10): Promise<Array<{
    id: string;
    type: string;
    description: string;
    leadName: string;
    createdAt: Date;
  }>> {
    return this.get('/recent-activities', { limit });
  }

  /**
   * Get performance metrics
   */
  async getPerformanceMetrics(): Promise<{
    avgResponseTime: number;
    avgConversionTime: number;
    leadVelocity: number;
    messageEngagement: number;
    customerSatisfaction: number;
  }> {
    return this.get('/performance-metrics');
  }

  /**
   * Get revenue statistics
   */
  async getRevenueStats(dateRange?: DateRange): Promise<{
    totalRevenue: number;
    projectedRevenue: number;
    revenueByMonth: Array<{ month: string; revenue: number }>;
    revenueByCategory: Record<string, number>;
    averageDealSize: number;
  }> {
    const params = dateRange ? {
      from: this.formatDate(dateRange.from),
      to: this.formatDate(dateRange.to),
    } : {};
    
    return this.get('/revenue-stats', params);
  }

  /**
   * Get lead source performance
   */
  async getSourcePerformance(): Promise<Array<{
    source: string;
    leadCount: number;
    conversionRate: number;
    avgConversionTime: number;
    cost: number;
    roi: number;
  }>> {
    return this.get('/source-performance');
  }

  /**
   * Get time-based analytics
   */
  async getTimeAnalytics(): Promise<{
    peakHours: Array<{ hour: number; leadCount: number }>;
    peakDays: Array<{ day: string; leadCount: number }>;
    seasonalTrends: Array<{ month: string; leadCount: number }>;
  }> {
    return this.get('/time-analytics');
  }

  /**
   * Get comparative analytics (current vs previous period)
   */
  async getComparativeAnalytics(dateRange: DateRange): Promise<{
    current: {
      leads: number;
      conversions: number;
      revenue: number;
      messagesSent: number;
    };
    previous: {
      leads: number;
      conversions: number;
      revenue: number;
      messagesSent: number;
    };
    changes: {
      leads: { value: number; percentage: number };
      conversions: { value: number; percentage: number };
      revenue: { value: number; percentage: number };
      messagesSent: { value: number; percentage: number };
    };
  }> {
    return this.get('/comparative-analytics', {
      from: this.formatDate(dateRange.from),
      to: this.formatDate(dateRange.to),
    });
  }

  /**
   * Get lead quality metrics
   */
  async getLeadQualityMetrics(): Promise<{
    qualityScore: number;
    qualityBySource: Record<string, number>;
    qualityByCourse: Record<string, number>;
    qualityTrends: Array<{ date: string; score: number }>;
  }> {
    return this.get('/lead-quality-metrics');
  }

  /**
   * Get automation performance
   */
  async getAutomationPerformance(): Promise<{
    welcomeMessageStats: {
      sent: number;
      delivered: number;
      read: number;
      responseRate: number;
    };
    followUpStats: {
      day1: { sent: number; delivered: number; read: number };
      day2: { sent: number; delivered: number; read: number };
      day3: { sent: number; delivered: number; read: number };
    };
    overallEngagement: number;
  }> {
    return this.get('/automation-performance');
  }

  /**
   * Get forecasting data
   */
  async getForecast(period: 'week' | 'month' | 'quarter'): Promise<{
    expectedLeads: number;
    expectedConversions: number;
    expectedRevenue: number;
    confidence: number;
    trends: Array<{ date: string; predicted: number; actual?: number }>;
  }> {
    return this.get('/forecast', { period });
  }

  /**
   * Get goal tracking
   */
  async getGoalTracking(): Promise<{
    monthlyLeadGoal: { target: number; current: number; percentage: number };
    monthlyConversionGoal: { target: number; current: number; percentage: number };
    monthlyRevenueGoal: { target: number; current: number; percentage: number };
    onTrack: boolean;
  }> {
    return this.get('/goal-tracking');
  }

  /**
   * Get team performance (if multiple admin users)
   */
  async getTeamPerformance(): Promise<Array<{
    userId: string;
    userName: string;
    leadsAssigned: number;
    leadsConverted: number;
    conversionRate: number;
    avgResponseTime: number;
    messagesSent: number;
  }>> {
    return this.get('/team-performance');
  }

  /**
   * Export dashboard data to Excel
   */
  async exportToExcel(dateRange?: DateRange): Promise<Blob> {
    const params = dateRange ? {
      from: this.formatDate(dateRange.from),
      to: this.formatDate(dateRange.to),
    } : {};
    
    const response = await this.get<ArrayBuffer>('/export-excel', params);
    return new Blob([response], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
  }

  /**
   * Get real-time statistics (for live dashboard updates)
   */
  async getRealTimeStats(): Promise<{
    activeLeads: number;
    todayLeads: number;
    todayMessages: number;
    onlineUsers: number;
    systemStatus: 'healthy' | 'warning' | 'error';
  }> {
    return this.get('/realtime-stats');
  }

  /**
   * Get custom report data
   */
  async getCustomReport(config: {
    metrics: string[];
    dimensions: string[];
    filters?: Record<string, any>;
    dateRange?: DateRange;
  }): Promise<{
    data: Array<Record<string, any>>;
    summary: Record<string, number>;
    metadata: {
      totalRows: number;
      generatedAt: Date;
      filters: Record<string, any>;
    };
  }> {
    const params: any = { ...config };
    if (config.dateRange) {
      params.from = this.formatDate(config.dateRange.from);
      params.to = this.formatDate(config.dateRange.to);
    }
    
    return this.post('/custom-report', params);
  }

  /**
   * Get alert thresholds and current status
   */
  async getAlerts(): Promise<Array<{
    id: string;
    type: 'warning' | 'error' | 'info';
    message: string;
    threshold: number;
    currentValue: number;
    isActive: boolean;
    createdAt: Date;
  }>> {
    return this.get('/alerts');
  }
}

// Create and export singleton instance
export const dashboardService = new DashboardService();