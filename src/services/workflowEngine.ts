import { Lead, LeadStage, MessageTemplate, TemplateType } from '@/types';
import { supabase } from '@/lib/supabase';
import { whatsappService } from './whatsappService';
import { processTemplate } from '@/utils/templateUtils';

/**
 * Automation Workflow Engine
 * Handles automated message scheduling and workflow execution
 */

export interface ScheduledMessage {
  id: string;
  leadId: string;
  templateId?: string;
  content: string;
  scheduledAt: Date;
  status: 'pending' | 'sent' | 'failed' | 'cancelled';
  workflowType: 'welcome' | 'follow_up' | 'nurturing' | 'conversion' | 'custom';
  sequenceNumber?: number;
  totalInSequence?: number;
  metadata?: Record<string, any>;
}

export interface WorkflowConfig {
  enabled: boolean;
  welcomeMessageDelay: number; // minutes
  followUpInterval: number; // days
  followUpCount: number; // number of follow-ups
  nurtureInterval: number; // days
  nurtureCount: number; // number of nurture messages
}

export class AutomationWorkflowEngine {
  private config: WorkflowConfig;

  constructor(config?: Partial<WorkflowConfig>) {
    this.config = {
      enabled: true,
      welcomeMessageDelay: 5, // 5 minutes after lead creation
      followUpInterval: 1, // 1 day between follow-ups
      followUpCount: 7, // 7 follow-up messages
      nurtureInterval: 2, // 2 days between nurture messages
      nurtureCount: 5, // 5 nurture messages
      ...config,
    };
  }

  /**
   * Schedule welcome message for a new lead
   */
  async scheduleWelcomeMessage(
    lead: Lead,
    templateId?: string,
    customContent?: string
  ): Promise<{ success: boolean; scheduledMessageId?: string; error?: string }> {
    try {
      if (!this.config.enabled) {
        return { success: false, error: 'Workflow engine is disabled' };
      }

      // Calculate scheduled time (5 minutes from now by default)
      const scheduledAt = new Date();
      scheduledAt.setMinutes(scheduledAt.getMinutes() + this.config.welcomeMessageDelay);

      let content = customContent;
      let finalTemplateId = templateId;

      // If no content provided, get welcome template for the course
      if (!content) {
        const { data: templates, error: templateError } = await supabase
          .from('message_templates')
          .select('*')
          .eq('course_id', lead.courseInterest)
          .eq('type', TemplateType.WELCOME)
          .eq('is_active', true)
          .limit(1);

        if (templateError || !templates || templates.length === 0) {
          return { success: false, error: 'No welcome template found for this course' };
        }

        const template: MessageTemplate = {
          id: templates[0].id,
          courseId: templates[0].course_id,
          type: templates[0].type,
          name: templates[0].name,
          content: templates[0].content,
          variables: templates[0].variables || [],
          variableDefaults: templates[0].variable_defaults || {},
          isActive: templates[0].is_active,
          createdAt: new Date(templates[0].created_at),
          updatedAt: new Date(templates[0].updated_at),
        };

        finalTemplateId = template.id;

        // Get course data
        const { data: courseData } = await supabase
          .from('courses')
          .select('*')
          .eq('id', lead.courseInterest)
          .single();

        const course = courseData ? {
          id: courseData.id,
          name: courseData.name,
          description: courseData.description,
          duration: courseData.duration,
          price: courseData.price ?? undefined,
          courseType: courseData.course_type,
          isActive: courseData.is_active,
          createdAt: new Date(courseData.created_at),
          updatedAt: new Date(courseData.updated_at),
        } : undefined;

        // Process template
        const processResult = processTemplate(template, lead, course);
        content = processResult.content;
      }

      // Store scheduled message
      const { data: scheduledMessage, error: insertError } = await supabase
        .from('whatsapp_messages')
        .insert({
          lead_id: lead.id,
          template_id: finalTemplateId,
          content,
          recipient_phone: lead.mobile,
          status: 'pending',
          retry_count: 0,
          created_at: new Date().toISOString(),
          metadata: {
            scheduledAt: scheduledAt.toISOString(),
            workflowType: 'welcome',
            sequenceNumber: 1,
            totalInSequence: 1,
          },
        })
        .select('id')
        .single();

      if (insertError) {
        return { success: false, error: 'Failed to schedule welcome message' };
      }

      return {
        success: true,
        scheduledMessageId: scheduledMessage.id,
      };

    } catch (error: any) {
      console.error('Failed to schedule welcome message:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Schedule follow-up message sequence
   */
  async scheduleFollowUpSequence(
    lead: Lead,
    startDate?: Date
  ): Promise<{ success: boolean; scheduledCount: number; error?: string }> {
    try {
      if (!this.config.enabled) {
        return { success: false, scheduledCount: 0, error: 'Workflow engine is disabled' };
      }

      const baseDate = startDate || new Date();
      let scheduledCount = 0;

      // Get follow-up templates for the course
      const { data: templates, error: templateError } = await supabase
        .from('message_templates')
        .select('*')
        .eq('course_id', lead.courseInterest)
        .in('type', [
          TemplateType.FOLLOW_UP_DAY_1,
          TemplateType.FOLLOW_UP_DAY_2,
          TemplateType.FOLLOW_UP_DAY_3,
        ])
        .eq('is_active', true)
        .order('type', { ascending: true });

      if (templateError) {
        return { success: false, scheduledCount: 0, error: 'Failed to fetch follow-up templates' };
      }

      // Get course data
      const { data: courseData } = await supabase
        .from('courses')
        .select('*')
        .eq('id', lead.courseInterest)
        .single();

      const course = courseData ? {
        id: courseData.id,
        name: courseData.name,
        description: courseData.description,
        duration: courseData.duration,
        price: courseData.price,
        category: courseData.category,
        courseType: courseData.course_type,
        isActive: courseData.is_active,
        createdAt: new Date(courseData.created_at),
        updatedAt: new Date(courseData.updated_at),
      } : undefined;

      // Schedule messages for each day
      const messagesToInsert = [];
      const totalMessages = Math.min(this.config.followUpCount, templates?.length || 0);

      for (let i = 0; i < totalMessages; i++) {
        const scheduledAt = new Date(baseDate);
        scheduledAt.setDate(scheduledAt.getDate() + (i + 1) * this.config.followUpInterval);

        let content = '';
        let templateId = undefined;

        if (templates && templates[i]) {
          const template: MessageTemplate = {
            id: templates[i].id,
            courseId: templates[i].course_id,
            type: templates[i].type,
            name: templates[i].name,
            content: templates[i].content,
            variables: templates[i].variables || [],
            variableDefaults: templates[i].variable_defaults || {},
            isActive: templates[i].is_active,
            createdAt: new Date(templates[i].created_at),
            updatedAt: new Date(templates[i].updated_at),
          };

          templateId = template.id;
          const processResult = processTemplate(template, lead, course, { follow_up_number: (i + 1).toString() });
          content = processResult.content;
        } else {
          // Generic follow-up message if no template
          content = `Hi ${lead.name}! This is a follow-up message (Day ${i + 1}) regarding your interest in ${course?.name || 'our course'}. Please let us know if you have any questions!`;
        }

        messagesToInsert.push({
          lead_id: lead.id,
          template_id: templateId,
          content,
          recipient_phone: lead.mobile,
          status: 'pending',
          retry_count: 0,
          created_at: new Date().toISOString(),
          metadata: {
            scheduledAt: scheduledAt.toISOString(),
            workflowType: 'follow_up',
            sequenceNumber: i + 1,
            totalInSequence: totalMessages,
            followUpDay: i + 1,
          },
        });
      }

      // Bulk insert scheduled messages
      if (messagesToInsert.length > 0) {
        const { error: insertError } = await supabase
          .from('whatsapp_messages')
          .insert(messagesToInsert);

        if (insertError) {
          return { success: false, scheduledCount: 0, error: 'Failed to schedule follow-up messages' };
        }

        scheduledCount = messagesToInsert.length;
      }

      return {
        success: true,
        scheduledCount,
      };

    } catch (error: any) {
      console.error('Failed to schedule follow-up sequence:', error);
      return { success: false, scheduledCount: 0, error: error.message };
    }
  }

  /**
   * Schedule nurturing message sequence for interested leads
   */
  async scheduleNurturingSequence(
    lead: Lead,
    startDate?: Date
  ): Promise<{ success: boolean; scheduledCount: number; error?: string }> {
    try {
      if (!this.config.enabled) {
        return { success: false, scheduledCount: 0, error: 'Workflow engine is disabled' };
      }

      const baseDate = startDate || new Date();
      let scheduledCount = 0;

      // Get course data
      const { data: courseData } = await supabase
        .from('courses')
        .select('*')
        .eq('id', lead.courseInterest)
        .single();

      const course = courseData ? {
        id: courseData.id,
        name: courseData.name,
        description: courseData.description,
        duration: courseData.duration,
        price: courseData.price,
        category: courseData.category,
        courseType: courseData.course_type,
        isActive: courseData.is_active,
        createdAt: new Date(courseData.created_at),
        updatedAt: new Date(courseData.updated_at),
      } : undefined;

      // Schedule nurturing messages
      const messagesToInsert = [];

      for (let i = 0; i < this.config.nurtureCount; i++) {
        const scheduledAt = new Date(baseDate);
        scheduledAt.setDate(scheduledAt.getDate() + (i + 1) * this.config.nurtureInterval);

        const content = `Hi ${lead.name}! We noticed you're interested in ${course?.name || 'our course'}. Here's some valuable information that might help you make a decision... (Nurture message ${i + 1})`;

        messagesToInsert.push({
          lead_id: lead.id,
          content,
          recipient_phone: lead.mobile,
          status: 'pending',
          retry_count: 0,
          created_at: new Date().toISOString(),
          metadata: {
            scheduledAt: scheduledAt.toISOString(),
            workflowType: 'nurturing',
            sequenceNumber: i + 1,
            totalInSequence: this.config.nurtureCount,
            nurtureDay: (i + 1) * this.config.nurtureInterval,
          },
        });
      }

      // Bulk insert scheduled messages
      if (messagesToInsert.length > 0) {
        const { error: insertError } = await supabase
          .from('whatsapp_messages')
          .insert(messagesToInsert);

        if (insertError) {
          return { success: false, scheduledCount: 0, error: 'Failed to schedule nurturing messages' };
        }

        scheduledCount = messagesToInsert.length;
      }

      return {
        success: true,
        scheduledCount,
      };

    } catch (error: any) {
      console.error('Failed to schedule nurturing sequence:', error);
      return { success: false, scheduledCount: 0, error: error.message };
    }
  }

  /**
   * Process due scheduled messages
   */
  async processDueMessages(): Promise<{
    success: boolean;
    processed: number;
    sent: number;
    failed: number;
    errors: string[];
  }> {
    try {
      const now = new Date();
      const errors: string[] = [];
      let processed = 0;
      let sent = 0;
      let failed = 0;

      // Get all pending messages that are due
      const { data: dueMessages, error: fetchError } = await supabase
        .from('whatsapp_messages')
        .select('*')
        .eq('status', 'pending')
        .not('metadata->scheduledAt', 'is', null)
        .order('created_at', { ascending: true })
        .limit(100); // Process in batches

      if (fetchError) {
        return {
          success: false,
          processed: 0,
          sent: 0,
          failed: 0,
          errors: ['Failed to fetch due messages'],
        };
      }

      if (!dueMessages || dueMessages.length === 0) {
        return {
          success: true,
          processed: 0,
          sent: 0,
          failed: 0,
          errors: [],
        };
      }

      // Filter messages that are actually due
      const messagesToProcess = dueMessages.filter(msg => {
        const scheduledAt = new Date(msg.metadata?.scheduledAt);
        return scheduledAt <= now;
      });

      // Process each message
      for (const message of messagesToProcess) {
        processed++;

        try {
          // Send the message
          const sendResult = await whatsappService.sendTextMessage(
            message.recipient_phone,
            message.content,
            {
              leadId: message.lead_id,
              templateId: message.template_id,
            }
          );

          if (sendResult.success) {
            sent++;
            
            // Update message status
            await supabase
              .from('whatsapp_messages')
              .update({
                status: 'sent',
                sent_at: new Date().toISOString(),
                whatsapp_message_id: sendResult.wapmonkeyMessageId,
                updated_at: new Date().toISOString(),
              })
              .eq('id', message.id);

          } else {
            failed++;
            errors.push(`Message ${message.id}: ${sendResult.error}`);
            
            // Update message status to failed
            await supabase
              .from('whatsapp_messages')
              .update({
                status: 'failed',
                error_message: sendResult.error,
                updated_at: new Date().toISOString(),
              })
              .eq('id', message.id);
          }

          // Add delay between messages to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 1000));

        } catch (error: any) {
          failed++;
          errors.push(`Message ${message.id}: ${error.message}`);
          console.error(`Failed to process message ${message.id}:`, error);
        }
      }

      return {
        success: true,
        processed,
        sent,
        failed,
        errors,
      };

    } catch (error: any) {
      console.error('Failed to process due messages:', error);
      return {
        success: false,
        processed: 0,
        sent: 0,
        failed: 0,
        errors: [error.message],
      };
    }
  }

  /**
   * Cancel scheduled messages for a lead
   */
  async cancelScheduledMessages(
    leadId: string,
    workflowType?: 'welcome' | 'follow_up' | 'nurturing' | 'conversion' | 'custom'
  ): Promise<{ success: boolean; cancelledCount: number; error?: string }> {
    try {
      let query = supabase
        .from('whatsapp_messages')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('lead_id', leadId)
        .eq('status', 'pending');

      if (workflowType) {
        query = query.eq('metadata->workflowType', workflowType);
      }

      const { data, error } = await query.select('id');

      if (error) {
        return { success: false, cancelledCount: 0, error: 'Failed to cancel scheduled messages' };
      }

      return {
        success: true,
        cancelledCount: data?.length || 0,
      };

    } catch (error: any) {
      console.error('Failed to cancel scheduled messages:', error);
      return { success: false, cancelledCount: 0, error: error.message };
    }
  }

  /**
   * Get scheduled messages for a lead
   */
  async getScheduledMessages(leadId: string): Promise<ScheduledMessage[]> {
    try {
      const { data, error } = await supabase
        .from('whatsapp_messages')
        .select('*')
        .eq('lead_id', leadId)
        .eq('status', 'pending')
        .not('metadata->scheduledAt', 'is', null)
        .order('metadata->scheduledAt', { ascending: true });

      if (error || !data) {
        return [];
      }

      return data.map(msg => ({
        id: msg.id,
        leadId: msg.lead_id,
        templateId: msg.template_id,
        content: msg.content,
        scheduledAt: new Date(msg.metadata?.scheduledAt),
        status: msg.status,
        workflowType: msg.metadata?.workflowType || 'custom',
        sequenceNumber: msg.metadata?.sequenceNumber,
        totalInSequence: msg.metadata?.totalInSequence,
        metadata: msg.metadata,
      }));

    } catch (error) {
      console.error('Failed to get scheduled messages:', error);
      return [];
    }
  }

  /**
   * Get workflow statistics
   */
  async getWorkflowStatistics(dateFrom?: Date, dateTo?: Date): Promise<{
    totalScheduled: number;
    totalSent: number;
    totalFailed: number;
    byWorkflowType: Record<string, { scheduled: number; sent: number; failed: number }>;
    averageDeliveryTime: number; // in minutes
  }> {
    try {
      let query = supabase
        .from('whatsapp_messages')
        .select('*')
        .not('metadata->workflowType', 'is', null);

      if (dateFrom) {
        query = query.gte('created_at', dateFrom.toISOString());
      }

      if (dateTo) {
        query = query.lte('created_at', dateTo.toISOString());
      }

      const { data, error } = await query;

      if (error || !data) {
        return {
          totalScheduled: 0,
          totalSent: 0,
          totalFailed: 0,
          byWorkflowType: {},
          averageDeliveryTime: 0,
        };
      }

      const stats = {
        totalScheduled: 0,
        totalSent: 0,
        totalFailed: 0,
        byWorkflowType: {} as Record<string, { scheduled: number; sent: number; failed: number }>,
        averageDeliveryTime: 0,
      };

      const deliveryTimes: number[] = [];

      data.forEach(msg => {
        const workflowType = msg.metadata?.workflowType || 'custom';
        
        if (!stats.byWorkflowType[workflowType]) {
          stats.byWorkflowType[workflowType] = { scheduled: 0, sent: 0, failed: 0 };
        }

        stats.totalScheduled++;
        stats.byWorkflowType[workflowType].scheduled++;

        if (msg.status === 'sent' || msg.status === 'delivered' || msg.status === 'read') {
          stats.totalSent++;
          stats.byWorkflowType[workflowType].sent++;

          // Calculate delivery time
          if (msg.metadata?.scheduledAt && msg.sent_at) {
            const scheduledAt = new Date(msg.metadata.scheduledAt).getTime();
            const sentAt = new Date(msg.sent_at).getTime();
            const deliveryTime = (sentAt - scheduledAt) / (1000 * 60); // minutes
            deliveryTimes.push(deliveryTime);
          }
        } else if (msg.status === 'failed') {
          stats.totalFailed++;
          stats.byWorkflowType[workflowType].failed++;
        }
      });

      // Calculate average delivery time
      if (deliveryTimes.length > 0) {
        stats.averageDeliveryTime = deliveryTimes.reduce((sum, time) => sum + time, 0) / deliveryTimes.length;
      }

      return stats;

    } catch (error) {
      console.error('Failed to get workflow statistics:', error);
      return {
        totalScheduled: 0,
        totalSent: 0,
        totalFailed: 0,
        byWorkflowType: {},
        averageDeliveryTime: 0,
      };
    }
  }
}

// Export singleton instance
export const workflowEngine = new AutomationWorkflowEngine();