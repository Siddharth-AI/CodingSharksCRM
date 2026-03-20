import { BaseService } from './baseService';
import {
  WhatsAppMessage,
  CreateMessageRequest,
  MessageStatus,
  PaginatedResponse,
  PaginationState,
} from '@/types';

/**
 * Message service for managing WhatsApp message operations
 */
export class MessageService extends BaseService {
  constructor() {
    super('/messages');
  }

  /**
   * Send a new message
   */
  async send(messageData: CreateMessageRequest): Promise<WhatsAppMessage> {
    return this.post<WhatsAppMessage>('/send', messageData);
  }

  /**
   * Send message using template
   */
  async sendTemplate(data: {
    leadId: string;
    templateId: string;
    variables?: Record<string, string>;
  }): Promise<WhatsAppMessage> {
    return this.post<WhatsAppMessage>('/send-template', data);
  }

  /**
   * Get message by ID
   */
  async getById(id: string): Promise<WhatsAppMessage> {
    return this.get<WhatsAppMessage>(`/${id}`);
  }

  /**
   * Get all messages with optional filtering and pagination
   */
  async getAll(
    filters?: {
      leadId?: string;
      status?: MessageStatus;
      dateFrom?: Date;
      dateTo?: Date;
    },
    pagination?: Partial<PaginationState>
  ): Promise<PaginatedResponse<WhatsAppMessage>> {
    const params = this.buildQueryParams(filters, pagination);
    return this.getPaginated<WhatsAppMessage>('', params);
  }

  /**
   * Get messages by lead ID
   */
  async getByLead(leadId: string): Promise<WhatsAppMessage[]> {
    return this.get<WhatsAppMessage[]>('/by-lead', { leadId });
  }

  /**
   * Get messages by status
   */
  async getByStatus(status: MessageStatus): Promise<WhatsAppMessage[]> {
    return this.get<WhatsAppMessage[]>('/by-status', { status });
  }

  /**
   * Update message status
   */
  async updateStatus(id: string, status: MessageStatus): Promise<WhatsAppMessage> {
    return this.patch<WhatsAppMessage>(`/${id}/status`, { status });
  }

  /**
   * Retry failed message
   */
  async retry(id: string): Promise<WhatsAppMessage> {
    return this.post<WhatsAppMessage>(`/${id}/retry`, {});
  }

  /**
   * Bulk retry failed messages
   */
  async bulkRetry(messageIds: string[]): Promise<WhatsAppMessage[]> {
    return this.post<WhatsAppMessage[]>('/bulk-retry', { messageIds });
  }

  /**
   * Get pending messages (for cron processing)
   */
  async getPending(): Promise<WhatsAppMessage[]> {
    return this.get<WhatsAppMessage[]>('/pending');
  }

  /**
   * Get failed messages
   */
  async getFailed(): Promise<WhatsAppMessage[]> {
    return this.get<WhatsAppMessage[]>('/failed');
  }

  /**
   * Get message delivery statistics
   */
  async getDeliveryStats(): Promise<{
    total: number;
    sent: number;
    delivered: number;
    read: number;
    failed: number;
    deliveryRate: number;
    readRate: number;
  }> {
    return this.get('/delivery-stats');
  }

  /**
   * Get message statistics by date range
   */
  async getStatsByDateRange(from: Date, to: Date): Promise<{
    daily: Array<{
      date: string;
      sent: number;
      delivered: number;
      failed: number;
    }>;
    summary: {
      totalSent: number;
      totalDelivered: number;
      totalFailed: number;
      deliveryRate: number;
    };
  }> {
    return this.get('/stats-by-date-range', {
      from: this.formatDate(from),
      to: this.formatDate(to),
    });
  }

  /**
   * Schedule message for later delivery
   */
  async schedule(data: {
    leadId: string;
    templateId?: string;
    content: string;
    scheduledFor: Date;
  }): Promise<WhatsAppMessage> {
    return this.post<WhatsAppMessage>('/schedule', {
      ...data,
      scheduledFor: this.formatDate(data.scheduledFor),
    });
  }

  /**
   * Cancel scheduled message
   */
  async cancelScheduled(id: string): Promise<void> {
    return this.delete<void>(`/${id}/cancel`);
  }

  /**
   * Get scheduled messages
   */
  async getScheduled(): Promise<WhatsAppMessage[]> {
    return this.get<WhatsAppMessage[]>('/scheduled');
  }

  /**
   * Process scheduled messages (for cron job)
   */
  async processScheduled(): Promise<{
    processed: number;
    failed: number;
    errors: string[];
  }> {
    return this.post('/process-scheduled', {});
  }

  /**
   * Get message templates usage statistics
   */
  async getTemplateUsageStats(): Promise<Array<{
    templateId: string;
    templateName: string;
    usageCount: number;
    deliveryRate: number;
    readRate: number;
  }>> {
    return this.get('/template-usage-stats');
  }

  /**
   * Resend message
   */
  async resend(id: string): Promise<WhatsAppMessage> {
    return this.post<WhatsAppMessage>(`/${id}/resend`, {});
  }

  /**
   * Get message conversation thread for a lead
   */
  async getConversationThread(leadId: string): Promise<WhatsAppMessage[]> {
    return this.get<WhatsAppMessage[]>('/conversation', { leadId });
  }

  /**
   * Mark message as read (webhook callback)
   */
  async markAsRead(id: string): Promise<WhatsAppMessage> {
    return this.patch<WhatsAppMessage>(`/${id}/read`, {});
  }

  /**
   * Mark message as delivered (webhook callback)
   */
  async markAsDelivered(id: string): Promise<WhatsAppMessage> {
    return this.patch<WhatsAppMessage>(`/${id}/delivered`, {});
  }

  /**
   * Get message error details
   */
  async getErrorDetails(id: string): Promise<{
    errorMessage: string;
    retryCount: number;
    lastRetryAt: Date;
    nextRetryAt?: Date;
  }> {
    return this.get(`/${id}/error-details`);
  }

  /**
   * Export message history to CSV
   */
  async exportToCsv(filters?: {
    leadId?: string;
    dateFrom?: Date;
    dateTo?: Date;
  }): Promise<Blob> {
    const params = this.buildQueryParams(filters);
    const response = await this.get<string>('/export', params);
    return new Blob([response], { type: 'text/csv' });
  }

  /**
   * Get message performance metrics
   */
  async getPerformanceMetrics(): Promise<{
    averageDeliveryTime: number;
    averageReadTime: number;
    peakSendingHours: Array<{ hour: number; count: number }>;
    failureReasons: Array<{ reason: string; count: number }>;
  }> {
    return this.get('/performance-metrics');
  }

  /**
   * Validate phone number for WhatsApp
   */
  async validatePhoneNumber(phoneNumber: string): Promise<{
    isValid: boolean;
    formatted: string;
    country: string;
    carrier?: string;
  }> {
    return this.post('/validate-phone', { phoneNumber });
  }

  /**
   * Get message quota and limits
   */
  async getQuotaInfo(): Promise<{
    dailyLimit: number;
    dailyUsed: number;
    monthlyLimit: number;
    monthlyUsed: number;
    remainingToday: number;
    remainingThisMonth: number;
  }> {
    return this.get('/quota-info');
  }

  /**
   * Test WhatsApp API connection
   */
  async testConnection(): Promise<{
    connected: boolean;
    responseTime: number;
    error?: string;
  }> {
    return this.get('/test-connection');
  }
}

// Create and export singleton instance
export const messageService = new MessageService();