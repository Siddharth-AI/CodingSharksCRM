import { BaseService } from './baseService';
import {
  Course,
  CreateCourseRequest,
  UpdateCourseRequest,
  PaginatedResponse,
  PaginationState,
} from '@/types';
import {
  createCourseSchema,
  updateCourseSchema,
  courseFiltersSchema,
  courseActivationSchema,
  bulkCourseOperationSchema,
  courseExportSchema,
  coursePopularitySchema,
} from '@/models/course';
import { filterCourses, formatCoursesForExport } from '@/utils/courseUtils';

/**
 * Course service for managing course operations
 */
export class CourseService extends BaseService {
  constructor() {
    super('/courses');
  }

  /**
   * Create a new course with validation
   */
  async create(courseData: CreateCourseRequest): Promise<Course> {
    // Validate input data
    const { error, value } = createCourseSchema.validate(courseData);
    if (error) {
      throw new Error(`Validation error: ${error.details[0].message}`);
    }

    return this.post<Course>('', value);
  }

  /**
   * Get course by ID
   */
  async getById(id: string): Promise<Course> {
    return this.get<Course>(`/${id}`);
  }

  /**
   * Get all courses with optional pagination
   */
  async getAll(pagination?: Partial<PaginationState>): Promise<PaginatedResponse<Course>> {
    const params = this.buildQueryParams({}, pagination);
    return this.getPaginated<Course>('', params);
  }

  /**
   * Get only active courses
   */
  async getActive(): Promise<Course[]> {
    return this.get<Course[]>('/active');
  }

  /**
   * Update course by ID with validation
   */
  async update(id: string, updates: UpdateCourseRequest): Promise<Course> {
    // Validate input data
    const { error, value } = updateCourseSchema.validate(updates);
    if (error) {
      throw new Error(`Validation error: ${error.details[0].message}`);
    }

    return this.put<Course>(`/${id}`, value);
  }

  /**
   * Delete course by ID
   */
  async deleteById(id: string): Promise<void> {
    return this.delete<void>(`/${id}`);
  }

  /**
   * Get courses by category
   */
  async getByCategory(category: string): Promise<Course[]> {
    return this.get<Course[]>('/by-category', { category });
  }

  /**
   * Activate course
   */
  async activate(id: string): Promise<Course> {
    return this.patch<Course>(`/${id}/activate`, {});
  }

  /**
   * Deactivate course
   */
  async deactivate(id: string): Promise<Course> {
    return this.patch<Course>(`/${id}/deactivate`, {});
  }

  /**
   * Search courses by name or description
   */
  async search(
    query: string,
    pagination?: Partial<PaginationState>
  ): Promise<PaginatedResponse<Course>> {
    const params = this.buildQueryParams({ search: query }, pagination);
    return this.getPaginated<Course>('/search', params);
  }

  /**
   * Get course statistics
   */
  async getStatistics(id: string): Promise<{
    totalLeads: number;
    leadsByStage: Record<string, number>;
    conversionRate: number;
    averagePrice: number;
    messagesSent: number;
  }> {
    return this.get(`/${id}/statistics`);
  }

  /**
   * Get courses with lead counts
   */
  async getWithLeadCounts(): Promise<Array<Course & { leadCount: number }>> {
    return this.get<Array<Course & { leadCount: number }>>('/with-lead-counts');
  }

  /**
   * Get popular courses (by lead count)
   */
  async getPopular(limit: number = 5): Promise<Array<Course & { leadCount: number }>> {
    return this.get<Array<Course & { leadCount: number }>>('/popular', { limit });
  }

  /**
   * Bulk update course prices
   */
  async bulkUpdatePrices(updates: Array<{ id: string; price: number }>): Promise<Course[]> {
    return this.post<Course[]>('/bulk-update-prices', { updates });
  }

  /**
   * Get course revenue statistics
   */
  async getRevenueStats(): Promise<{
    totalRevenue: number;
    revenueByCategory: Record<string, number>;
    averagePrice: number;
    priceRange: { min: number; max: number };
  }> {
    return this.get('/revenue-stats');
  }

  /**
   * Duplicate course
   */
  async duplicate(id: string, newName: string): Promise<Course> {
    return this.post<Course>(`/${id}/duplicate`, { name: newName });
  }

  /**
   * Get course templates (message templates associated with course)
   */
  async getTemplates(id: string): Promise<any[]> {
    return this.get<any[]>(`/${id}/templates`);
  }

  /**
   * Get course leads
   */
  async getLeads(
    id: string,
    pagination?: Partial<PaginationState>
  ): Promise<PaginatedResponse<any>> {
    const params = this.buildQueryParams({}, pagination);
    return this.getPaginated(`/${id}/leads`, params);
  }

  /**
   * Export course data to CSV
   */
  async exportToCsv(): Promise<Blob> {
    const response = await this.get<string>('/export');
    return new Blob([response], { type: 'text/csv' });
  }

  /**
   * Import courses from CSV
   */
  async importFromCsv(file: File): Promise<{ success: number; errors: string[] }> {
    const formData = new FormData();
    formData.append('file', file);
    
    return this.post<{ success: number; errors: string[] }>('/import', formData);
  }

  /**
   * Get course performance metrics
   */
  async getPerformanceMetrics(id: string): Promise<{
    enrollmentTrend: Array<{ date: string; count: number }>;
    conversionFunnel: Array<{ stage: string; count: number; percentage: number }>;
    messageEngagement: {
      sent: number;
      delivered: number;
      read: number;
      deliveryRate: number;
      readRate: number;
    };
  }> {
    return this.get(`/${id}/performance`);
  }

  /**
   * Update course order/priority
   */
  async updateOrder(courseOrders: Array<{ id: string; order: number }>): Promise<Course[]> {
    return this.post<Course[]>('/update-order', { courseOrders });
  }

  /**
   * Get course categories with counts
   */
  async getCategoriesWithCounts(): Promise<Array<{
    category: string;
    count: number;
    totalLeads: number;
  }>> {
    return this.get('/categories-with-counts');
  }

  /**
   * Archive course (soft delete)
   */
  async archive(id: string): Promise<Course> {
    return this.patch<Course>(`/${id}/archive`, {});
  }

  /**
   * Restore archived course
   */
  async restore(id: string): Promise<Course> {
    return this.patch<Course>(`/${id}/restore`, {});
  }

  /**
   * Get archived courses
   */
  async getArchived(): Promise<Course[]> {
    return this.get<Course[]>('/archived');
  }
}

// Create and export singleton instance
export const courseService = new CourseService();