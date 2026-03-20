import { BaseService } from './baseService';
import {
  Activity,
  ActivityType,
  PaginatedResponse,
  PaginationState,
} from '@/types';

/**
 * Activity service for managing activity timeline operations
 */
export class ActivityService extends BaseService {
  constructor() {
    super('/activities');
  }

  /**
   * Create a new activity
   */
  async create(activityData: {
    leadId: string;
    type: ActivityType;
    description: string;
    metadata?: Record<string, any>;
  }): Promise<Activity> {
    return this.post<Activity>('', activityData);
  }

  /**
   * Get activity by ID
   */
  async getById(id: string): Promise<Activity> {
    return this.get<Activity>(`/${id}`);
  }

  /**
   * Get activities by lead ID
   */
  async getByLead(
    leadId: string,
    pagination?: Partial<PaginationState>
  ): Promise<PaginatedResponse<Activity>> {
    const params = this.buildQueryParams({ leadId }, pagination);
    return this.getPaginated<Activity>('/by-lead', params);
  }

  /**
   * Get activities by type
   */
  async getByType(
    type: ActivityType,
    pagination?: Partial<PaginationState>
  ): Promise<PaginatedResponse<Activity>> {
    const params = this.buildQueryParams({ type }, pagination);
    return this.getPaginated<Activity>('/by-type', params);
  }

  /**
   * Get all activities with filtering
   */
  async getAll(
    filters?: {
      leadId?: string;
      type?: ActivityType;
      createdBy?: string;
      dateFrom?: Date;
      dateTo?: Date;
    },
    pagination?: Partial<PaginationState>
  ): Promise<PaginatedResponse<Activity>> {
    const params = this.buildQueryParams(filters, pagination);
    return this.getPaginated<Activity>('', params);
  }

  /**
   * Get recent activities
   */
  async getRecent(limit: number = 20): Promise<Activity[]> {
    return this.get<Activity[]>('/recent', { limit });
  }

  /**
   * Get activities by date range
   */
  async getByDateRange(from: Date, to: Date): Promise<Activity[]> {
    return this.get<Activity[]>('/by-date-range', {
      from: this.formatDate(from),
      to: this.formatDate(to),
    });
  }

  /**
   * Get activity statistics
   */
  async getStatistics(): Promise<{
    total: number;
    byType: Record<ActivityType, number>;
    byDay: Array<{ date: string; count: number }>;
    mostActiveLeads: Array<{ leadId: string; leadName: string; activityCount: number }>;
  }> {
    return this.get('/statistics');
  }

  /**
   * Get activity timeline for a lead (chronological order)
   */
  async getTimeline(leadId: string): Promise<Activity[]> {
    return this.get<Activity[]>('/timeline', { leadId });
  }

  /**
   * Search activities by description
   */
  async search(
    query: string,
    pagination?: Partial<PaginationState>
  ): Promise<PaginatedResponse<Activity>> {
    const params = this.buildQueryParams({ search: query }, pagination);
    return this.getPaginated<Activity>('/search', params);
  }

  /**
   * Log lead creation activity
   */
  async logLeadCreated(leadId: string, metadata?: Record<string, any>): Promise<Activity> {
    return this.create({
      leadId,
      type: ActivityType.LEAD_CREATED,
      description: 'Lead was created',
      metadata,
    });
  }

  /**
   * Log stage change activity
   */
  async logStageChanged(
    leadId: string,
    fromStage: string,
    toStage: string,
    metadata?: Record<string, any>
  ): Promise<Activity> {
    return this.create({
      leadId,
      type: ActivityType.STAGE_CHANGED,
      description: `Stage changed from ${fromStage} to ${toStage}`,
      metadata: { fromStage, toStage, ...metadata },
    });
  }

  /**
   * Log message sent activity
   */
  async logMessageSent(
    leadId: string,
    messageId: string,
    messageContent: string,
    metadata?: Record<string, any>
  ): Promise<Activity> {
    return this.create({
      leadId,
      type: ActivityType.MESSAGE_SENT,
      description: `WhatsApp message sent: ${messageContent.substring(0, 50)}...`,
      metadata: { messageId, messageContent, ...metadata },
    });
  }

  /**
   * Log note added activity
   */
  async logNoteAdded(
    leadId: string,
    note: string,
    metadata?: Record<string, any>
  ): Promise<Activity> {
    return this.create({
      leadId,
      type: ActivityType.NOTE_ADDED,
      description: `Note added: ${note.substring(0, 50)}...`,
      metadata: { note, ...metadata },
    });
  }

  /**
   * Log lead updated activity
   */
  async logLeadUpdated(
    leadId: string,
    changes: Record<string, any>,
    metadata?: Record<string, any>
  ): Promise<Activity> {
    const changedFields = Object.keys(changes).join(', ');
    return this.create({
      leadId,
      type: ActivityType.LEAD_UPDATED,
      description: `Lead updated: ${changedFields}`,
      metadata: { changes, ...metadata },
    });
  }

  /**
   * Get activity counts by type for a lead
   */
  async getCountsByType(leadId: string): Promise<Record<ActivityType, number>> {
    return this.get<Record<ActivityType, number>>('/counts-by-type', { leadId });
  }

  /**
   * Get activity summary for dashboard
   */
  async getSummary(): Promise<{
    todayCount: number;
    weekCount: number;
    monthCount: number;
    topActivityTypes: Array<{ type: ActivityType; count: number }>;
    recentActivities: Activity[];
  }> {
    return this.get('/summary');
  }

  /**
   * Export activities to CSV
   */
  async exportToCsv(filters?: {
    leadId?: string;
    type?: ActivityType;
    dateFrom?: Date;
    dateTo?: Date;
  }): Promise<Blob> {
    const params = this.buildQueryParams(filters);
    const response = await this.get<string>('/export', params);
    return new Blob([response], { type: 'text/csv' });
  }

  /**
   * Get activities with lead information
   */
  async getWithLeadInfo(
    filters?: {
      type?: ActivityType;
      dateFrom?: Date;
      dateTo?: Date;
    },
    pagination?: Partial<PaginationState>
  ): Promise<PaginatedResponse<Activity & { leadName: string; leadEmail: string }>> {
    const params = this.buildQueryParams(filters, pagination);
    return this.getPaginated('/with-lead-info', params);
  }

  /**
   * Delete activity by ID
   */
  async deleteById(id: string): Promise<void> {
    return this.delete<void>(`/${id}`);
  }

  /**
   * Bulk delete activities
   */
  async bulkDelete(activityIds: string[]): Promise<void> {
    return this.post<void>('/bulk-delete', { activityIds });
  }

  /**
   * Get activity trends over time
   */
  async getTrends(period: 'daily' | 'weekly' | 'monthly' = 'daily'): Promise<Array<{
    date: string;
    count: number;
    byType: Record<ActivityType, number>;
  }>> {
    return this.get('/trends', { period });
  }

  /**
   * Get most active time periods
   */
  async getActiveTimePeriods(): Promise<{
    hourly: Array<{ hour: number; count: number }>;
    daily: Array<{ day: string; count: number }>;
    monthly: Array<{ month: string; count: number }>;
  }> {
    return this.get('/active-time-periods');
  }
}

// Create and export singleton instance
export const activityService = new ActivityService();