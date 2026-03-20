import { BaseService } from './baseService';
import {
  MessageTemplate,
  CreateMessageTemplateRequest,
  UpdateMessageTemplateRequest,
  TemplateType,
  PaginatedResponse,
  PaginationState,
} from '@/types';

/**
 * Template service for managing message template operations
 */
export class TemplateService extends BaseService {
  constructor() {
    super('/templates');
  }

  /**
   * Create a new message template
   */
  async create(templateData: CreateMessageTemplateRequest): Promise<MessageTemplate> {
    return this.post<MessageTemplate>('', templateData);
  }

  /**
   * Get template by ID
   */
  async getById(id: string): Promise<MessageTemplate> {
    return this.get<MessageTemplate>(`/${id}`);
  }

  /**
   * Get all templates with optional filtering and pagination
   */
  async getAll(
    filters?: {
      courseId?: string;
      type?: TemplateType;
      isActive?: boolean;
    },
    pagination?: Partial<PaginationState>
  ): Promise<PaginatedResponse<MessageTemplate>> {
    const params = this.buildQueryParams(filters, pagination);
    return this.getPaginated<MessageTemplate>('', params);
  }

  /**
   * Update template by ID
   */
  async update(id: string, updates: UpdateMessageTemplateRequest): Promise<MessageTemplate> {
    return this.put<MessageTemplate>(`/${id}`, updates);
  }

  /**
   * Delete template by ID
   */
  async deleteById(id: string): Promise<void> {
    return this.delete<void>(`/${id}`);
  }

  /**
   * Get templates by course ID
   */
  async getByCourse(courseId: string): Promise<MessageTemplate[]> {
    return this.get<MessageTemplate[]>('/by-course', { courseId });
  }

  /**
   * Get templates by type
   */
  async getByType(type: TemplateType): Promise<MessageTemplate[]> {
    return this.get<MessageTemplate[]>('/by-type', { type });
  }

  /**
   * Get template by course and type
   */
  async getByCourseAndType(courseId: string, type: TemplateType): Promise<MessageTemplate | null> {
    try {
      return await this.get<MessageTemplate>('/by-course-and-type', { courseId, type });
    } catch (error: any) {
      if (error.statusCode === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Get only active templates
   */
  async getActive(): Promise<MessageTemplate[]> {
    return this.get<MessageTemplate[]>('/active');
  }

  /**
   * Activate template
   */
  async activate(id: string): Promise<MessageTemplate> {
    return this.patch<MessageTemplate>(`/${id}/activate`, {});
  }

  /**
   * Deactivate template
   */
  async deactivate(id: string): Promise<MessageTemplate> {
    return this.patch<MessageTemplate>(`/${id}/deactivate`, {});
  }

  /**
   * Preview template with variables substituted
   */
  async preview(id: string, variables: Record<string, string>): Promise<{
    content: string;
    variables: string[];
    missingVariables: string[];
  }> {
    return this.post(`/${id}/preview`, { variables });
  }

  /**
   * Validate template content and variables
   */
  async validate(content: string): Promise<{
    isValid: boolean;
    variables: string[];
    errors: string[];
  }> {
    return this.post('/validate', { content });
  }

  /**
   * Search templates by name or content
   */
  async search(
    query: string,
    pagination?: Partial<PaginationState>
  ): Promise<PaginatedResponse<MessageTemplate>> {
    const params = this.buildQueryParams({ search: query }, pagination);
    return this.getPaginated<MessageTemplate>('/search', params);
  }

  /**
   * Duplicate template
   */
  async duplicate(id: string, newName: string): Promise<MessageTemplate> {
    return this.post<MessageTemplate>(`/${id}/duplicate`, { name: newName });
  }

  /**
   * Get template usage statistics
   */
  async getUsageStats(id: string): Promise<{
    totalUsage: number;
    successfulDeliveries: number;
    failedDeliveries: number;
    deliveryRate: number;
    lastUsed: Date | null;
    usageByMonth: Array<{ month: string; count: number }>;
  }> {
    return this.get(`/${id}/usage-stats`);
  }

  /**
   * Get all template usage statistics
   */
  async getAllUsageStats(): Promise<Array<{
    templateId: string;
    templateName: string;
    totalUsage: number;
    deliveryRate: number;
    lastUsed: Date | null;
  }>> {
    return this.get('/all-usage-stats');
  }

  /**
   * Create default templates for a course
   */
  async createDefaultTemplates(courseId: string): Promise<MessageTemplate[]> {
    return this.post<MessageTemplate[]>('/create-defaults', { courseId });
  }

  /**
   * Get template variables from content
   */
  async extractVariables(content: string): Promise<string[]> {
    return this.post<string[]>('/extract-variables', { content });
  }

  /**
   * Test template rendering with sample data
   */
  async testRender(id: string): Promise<{
    rendered: string;
    sampleData: Record<string, string>;
  }> {
    return this.post(`/${id}/test-render`, {});
  }

  /**
   * Export templates to JSON
   */
  async exportToJson(courseId?: string): Promise<Blob> {
    const params = courseId ? { courseId } : {};
    const response = await this.get<any>('/export', params);
    return new Blob([JSON.stringify(response, null, 2)], { type: 'application/json' });
  }

  /**
   * Import templates from JSON
   */
  async importFromJson(file: File): Promise<{
    success: number;
    errors: string[];
    imported: MessageTemplate[];
  }> {
    const formData = new FormData();
    formData.append('file', file);
    
    return this.post<{
      success: number;
      errors: string[];
      imported: MessageTemplate[];
    }>('/import', formData);
  }

  /**
   * Get template performance comparison
   */
  async getPerformanceComparison(templateIds: string[]): Promise<Array<{
    templateId: string;
    templateName: string;
    deliveryRate: number;
    readRate: number;
    averageResponseTime: number;
    totalUsage: number;
  }>> {
    return this.post('/performance-comparison', { templateIds });
  }

  /**
   * Get recommended templates for a course
   */
  async getRecommended(courseId: string): Promise<MessageTemplate[]> {
    return this.get<MessageTemplate[]>('/recommended', { courseId });
  }

  /**
   * Update template order/priority
   */
  async updateOrder(templateOrders: Array<{ id: string; order: number }>): Promise<MessageTemplate[]> {
    return this.post<MessageTemplate[]>('/update-order', { templateOrders });
  }

  /**
   * Get template by course and type with fallback
   */
  async getWithFallback(courseId: string, type: TemplateType): Promise<MessageTemplate> {
    return this.get<MessageTemplate>('/with-fallback', { courseId, type });
  }

  /**
   * Bulk update templates
   */
  async bulkUpdate(updates: Array<{
    id: string;
    updates: UpdateMessageTemplateRequest;
  }>): Promise<MessageTemplate[]> {
    return this.post<MessageTemplate[]>('/bulk-update', { updates });
  }

  /**
   * Get template categories with counts
   */
  async getCategoriesWithCounts(): Promise<Array<{
    type: TemplateType;
    count: number;
    activeCount: number;
  }>> {
    return this.get('/categories-with-counts');
  }

  /**
   * Archive template (soft delete)
   */
  async archive(id: string): Promise<MessageTemplate> {
    return this.patch<MessageTemplate>(`/${id}/archive`, {});
  }

  /**
   * Restore archived template
   */
  async restore(id: string): Promise<MessageTemplate> {
    return this.patch<MessageTemplate>(`/${id}/restore`, {});
  }

  /**
   * Get archived templates
   */
  async getArchived(): Promise<MessageTemplate[]> {
    return this.get<MessageTemplate[]>('/archived');
  }

  /**
   * Get template content with variables highlighted
   */
  async getWithHighlights(id: string): Promise<{
    content: string;
    variables: Array<{
      name: string;
      position: { start: number; end: number };
    }>;
  }> {
    return this.get(`/${id}/with-highlights`);
  }
}

// Create and export singleton instance
export const templateService = new TemplateService();