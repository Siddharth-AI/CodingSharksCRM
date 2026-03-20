import { BaseService } from './baseService';
import {
  Lead,
  CreateLeadRequest,
  UpdateLeadRequest,
  LeadFilters,
  PaginatedResponse,
  PaginationState,
  LeadStage,
  ConversionData,
} from '@/types';
import { 
  formatMobileNumber,
  createLeadSchema,
  updateLeadSchema,
  leadFiltersSchema,
  paginationSchema 
} from '@/models/lead';
import { buildLeadQueryParams } from '@/utils/leadUtils';

/**
 * Lead service for managing lead operations
 */
export class LeadService extends BaseService {
  constructor() {
    super('/leads');
  }

  /**
   * Create a new lead with validation
   */
  async create(leadData: CreateLeadRequest): Promise<Lead> {
    // Validate input data
    const { error, value } = createLeadSchema.validate(leadData);
    if (error) {
      throw new Error(`Validation error: ${error.details[0].message}`);
    }

    // Format mobile number
    const formattedData = {
      ...value,
      mobile: formatMobileNumber(value.mobile),
    };

    return this.post<Lead>('', formattedData);
  }

  /**
   * Get lead by ID
   */
  async getById(id: string): Promise<Lead> {
    return this.get<Lead>(`/${id}`);
  }

  /**
   * Get all leads with optional filtering and pagination
   */
  async getAll(
    filters?: LeadFilters,
    pagination?: Partial<PaginationState>
  ): Promise<PaginatedResponse<Lead>> {
    // Validate filters
    if (filters) {
      const { error } = leadFiltersSchema.validate(filters);
      if (error) {
        throw new Error(`Filter validation error: ${error.details[0].message}`);
      }
    }

    // Validate pagination
    if (pagination) {
      const { error } = paginationSchema.validate(pagination);
      if (error) {
        throw new Error(`Pagination validation error: ${error.details[0].message}`);
      }
    }

    const params = buildLeadQueryParams(filters, pagination);
    return this.getPaginated<Lead>('', params);
  }

  /**
   * Update lead by ID with validation
   */
  async update(id: string, updates: UpdateLeadRequest): Promise<Lead> {
    // Validate input data
    const { error, value } = updateLeadSchema.validate(updates);
    if (error) {
      throw new Error(`Validation error: ${error.details[0].message}`);
    }

    // Format mobile number if provided
    const formattedData = {
      ...value,
      ...(value.mobile && { mobile: formatMobileNumber(value.mobile) }),
    };

    return this.put<Lead>(`/${id}`, formattedData);
  }

  /**
   * Delete lead by ID
   */
  async deleteById(id: string): Promise<void> {
    return this.delete<void>(`/${id}`);
  }

  /**
   * Get leads by stage
   */
  async getByStage(stage: LeadStage): Promise<Lead[]> {
    return this.get<Lead[]>('/by-stage', { stage });
  }

  /**
   * Get leads by course interest
   */
  async getByCourse(courseId: string): Promise<Lead[]> {
    return this.get<Lead[]>('/by-course', { courseId });
  }

  /**
   * Update lead stage
   */
  async updateStage(id: string, stage: LeadStage): Promise<Lead> {
    return this.patch<Lead>(`/${id}/stage`, { stage });
  }

  /**
   * Bulk update lead stages (for Kanban operations)
   */
  async bulkUpdateStages(updates: Array<{ id: string; stage: LeadStage }>): Promise<Lead[]> {
    return this.post<Lead[]>('/bulk-update-stages', { updates });
  }

  /**
   * Search leads by name, email, or mobile
   */
  async search(
    query: string,
    pagination?: Partial<PaginationState>
  ): Promise<PaginatedResponse<Lead>> {
    // Validate pagination
    if (pagination) {
      const { error } = paginationSchema.validate(pagination);
      if (error) {
        throw new Error(`Pagination validation error: ${error.details[0].message}`);
      }
    }

    const params = buildLeadQueryParams({ search: query }, pagination);
    return this.getPaginated<Lead>('/search', params);
  }

  /**
   * Get lead conversion statistics
   */
  async getConversionStats(): Promise<ConversionData[]> {
    return this.get<ConversionData[]>('/conversion-stats');
  }

  /**
   * Get leads count by stage
   */
  async getCountByStage(): Promise<Record<LeadStage, number>> {
    return this.get<Record<LeadStage, number>>('/count-by-stage');
  }

  /**
   * Get recent leads (last 30 days)
   */
  async getRecent(limit: number = 10): Promise<Lead[]> {
    return this.get<Lead[]>('/recent', { limit });
  }

  /**
   * Export leads to CSV with validation
   */
  async exportToCsv(filters?: LeadFilters): Promise<Blob> {
    // Validate filters
    if (filters) {
      const { error } = leadFiltersSchema.validate(filters);
      if (error) {
        throw new Error(`Filter validation error: ${error.details[0].message}`);
      }
    }

    const params = buildLeadQueryParams(filters);
    const response = await this.get<string>('/export', params);
    return new Blob([response], { type: 'text/csv' });
  }

  /**
   * Import leads from CSV
   */
  async importFromCsv(file: File): Promise<{ success: number; errors: string[] }> {
    const formData = new FormData();
    formData.append('file', file);
    
    return this.post<{ success: number; errors: string[] }>('/import', formData);
  }

  /**
   * Add note to lead
   */
  async addNote(id: string, note: string): Promise<Lead> {
    return this.patch<Lead>(`/${id}/note`, { note });
  }

  /**
   * Get lead activity timeline
   */
  async getActivityTimeline(id: string): Promise<any[]> {
    return this.get<any[]>(`/${id}/activities`);
  }

  /**
   * Get lead message history
   */
  async getMessageHistory(id: string): Promise<any[]> {
    return this.get<any[]>(`/${id}/messages`);
  }

  /**
   * Mark lead as contacted
   */
  async markAsContacted(id: string): Promise<Lead> {
    return this.patch<Lead>(`/${id}/contacted`, {});
  }

  /**
   * Get leads requiring follow-up
   */
  async getRequiringFollowUp(): Promise<Lead[]> {
    return this.get<Lead[]>('/follow-up-required');
  }

  /**
   * Get leads by date range
   */
  async getByDateRange(from: Date, to: Date): Promise<Lead[]> {
    return this.get<Lead[]>('/by-date-range', {
      from: this.formatDate(from),
      to: this.formatDate(to),
    });
  }

  /**
   * Duplicate lead check by mobile number
   */
  async checkDuplicate(mobile: string): Promise<Lead[]> {
    const formattedMobile = formatMobileNumber(mobile);
    return this.get<Lead[]>('/check-duplicate', { mobile: formattedMobile });
  }

  /**
   * Get lead statistics for dashboard
   */
  async getStatistics(): Promise<{
    total: number;
    byStage: Record<LeadStage, number>;
    bySource: Record<string, number>;
    byCourse: Record<string, number>;
    conversionRate: number;
  }> {
    return this.get('/statistics');
  }
}

// Create and export singleton instance
export const leadService = new LeadService();