import { supabase } from '@/lib/supabase';
import { ActivityType } from '@/types';

/**
 * Activity Logger Utility
 * Provides convenient methods for logging activities
 */

export interface LogActivityParams {
  leadId: string;
  type: ActivityType;
  description: string;
  metadata?: Record<string, any>;
  performedBy?: string;
}

/**
 * Log an activity to the database
 */
export async function logActivity(params: LogActivityParams): Promise<{
  success: boolean;
  activityId?: string;
  error?: string;
}> {
  try {
    const { leadId, type, description, metadata, performedBy } = params;

    const { data, error } = await supabase
      .from('activities')
      .insert({
        lead_id: leadId,
        type,
        description,
        metadata: metadata || {},
        performed_by: performedBy,
        created_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (error) {
      console.error('Failed to log activity:', error);
      return { success: false, error: error.message };
    }

    return { success: true, activityId: data.id };
  } catch (error: any) {
    console.error('Failed to log activity:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Log lead creation activity
 */
export async function logLeadCreated(
  leadId: string,
  leadName: string,
  performedBy?: string
): Promise<void> {
  await logActivity({
    leadId,
    type: ActivityType.LEAD_CREATED,
    description: `Lead "${leadName}" was created`,
    performedBy,
  });
}

/**
 * Log lead update activity
 */
export async function logLeadUpdated(
  leadId: string,
  leadName: string,
  changes: string[],
  performedBy?: string
): Promise<void> {
  await logActivity({
    leadId,
    type: ActivityType.LEAD_UPDATED,
    description: `Lead "${leadName}" was updated: ${changes.join(', ')}`,
    metadata: { changes },
    performedBy,
  });
}

/**
 * Log stage change activity
 */
export async function logStageChanged(
  leadId: string,
  leadName: string,
  fromStage: string,
  toStage: string,
  performedBy?: string
): Promise<void> {
  await logActivity({
    leadId,
    type: ActivityType.STAGE_CHANGED,
    description: `Lead "${leadName}" moved from "${fromStage}" to "${toStage}"`,
    metadata: { fromStage, toStage },
    performedBy,
  });
}

/**
 * Log message sent activity
 */
export async function logMessageSent(
  leadId: string,
  leadName: string,
  messageId: string,
  templateName?: string,
  performedBy?: string
): Promise<void> {
  const description = templateName
    ? `WhatsApp message sent to "${leadName}" using template "${templateName}"`
    : `WhatsApp message sent to "${leadName}"`;

  await logActivity({
    leadId,
    type: ActivityType.MESSAGE_SENT,
    description,
    metadata: { messageId, templateName },
    performedBy,
  });
}

/**
 * Log message delivered activity
 */
export async function logMessageDelivered(
  leadId: string,
  leadName: string,
  messageId: string
): Promise<void> {
  await logActivity({
    leadId,
    type: ActivityType.MESSAGE_DELIVERED,
    description: `Message to "${leadName}" was delivered`,
    metadata: { messageId },
  });
}

/**
 * Log message read activity
 */
export async function logMessageRead(
  leadId: string,
  leadName: string,
  messageId: string
): Promise<void> {
  await logActivity({
    leadId,
    type: ActivityType.MESSAGE_READ,
    description: `Message to "${leadName}" was read`,
    metadata: { messageId },
  });
}

/**
 * Log message failed activity
 */
export async function logMessageFailed(
  leadId: string,
  leadName: string,
  messageId: string,
  errorMessage: string
): Promise<void> {
  await logActivity({
    leadId,
    type: ActivityType.MESSAGE_FAILED,
    description: `Message to "${leadName}" failed: ${errorMessage}`,
    metadata: { messageId, errorMessage },
  });
}

/**
 * Log note added activity
 */
export async function logNoteAdded(
  leadId: string,
  leadName: string,
  notePreview: string,
  performedBy?: string
): Promise<void> {
  await logActivity({
    leadId,
    type: ActivityType.NOTE_ADDED,
    description: `Note added to "${leadName}": ${notePreview}`,
    metadata: { notePreview },
    performedBy,
  });
}

/**
 * Log call made activity
 */
export async function logCallMade(
  leadId: string,
  leadName: string,
  duration?: number,
  outcome?: string,
  performedBy?: string
): Promise<void> {
  const durationText = duration ? ` (${Math.floor(duration / 60)} minutes)` : '';
  const outcomeText = outcome ? ` - ${outcome}` : '';

  await logActivity({
    leadId,
    type: ActivityType.CALL_MADE,
    description: `Call made to "${leadName}"${durationText}${outcomeText}`,
    metadata: { duration, outcome },
    performedBy,
  });
}

/**
 * Log email sent activity
 */
export async function logEmailSent(
  leadId: string,
  leadName: string,
  subject: string,
  performedBy?: string
): Promise<void> {
  await logActivity({
    leadId,
    type: ActivityType.EMAIL_SENT,
    description: `Email sent to "${leadName}": ${subject}`,
    metadata: { subject },
    performedBy,
  });
}

/**
 * Log meeting scheduled activity
 */
export async function logMeetingScheduled(
  leadId: string,
  leadName: string,
  meetingDate: Date,
  meetingType?: string,
  performedBy?: string
): Promise<void> {
  const typeText = meetingType ? ` (${meetingType})` : '';

  await logActivity({
    leadId,
    type: ActivityType.MEETING_SCHEDULED,
    description: `Meeting scheduled with "${leadName}" on ${meetingDate.toLocaleDateString()}${typeText}`,
    metadata: { meetingDate: meetingDate.toISOString(), meetingType },
    performedBy,
  });
}

/**
 * Log follow-up scheduled activity
 */
export async function logFollowUpScheduled(
  leadId: string,
  leadName: string,
  followUpDate: Date,
  performedBy?: string
): Promise<void> {
  await logActivity({
    leadId,
    type: ActivityType.FOLLOW_UP_SCHEDULED,
    description: `Follow-up scheduled for "${leadName}" on ${followUpDate.toLocaleDateString()}`,
    metadata: { followUpDate: followUpDate.toISOString() },
    performedBy,
  });
}

/**
 * Log workflow triggered activity
 */
export async function logWorkflowTriggered(
  leadId: string,
  leadName: string,
  workflowType: string,
  messageCount?: number
): Promise<void> {
  const countText = messageCount ? ` (${messageCount} messages scheduled)` : '';

  await logActivity({
    leadId,
    type: ActivityType.WORKFLOW_TRIGGERED,
    description: `${workflowType} workflow triggered for "${leadName}"${countText}`,
    metadata: { workflowType, messageCount },
  });
}

/**
 * Get activity filters for pagination
 */
export interface ActivityFilters {
  leadId?: string;
  type?: ActivityType;
  performedBy?: string;
  dateFrom?: Date;
  dateTo?: Date;
  page?: number;
  limit?: number;
  sortBy?: 'created_at' | 'type';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Build Supabase query from filters
 */
export function buildActivityQuery(filters: ActivityFilters) {
  let query = supabase.from('activities').select('*', { count: 'exact' });

  if (filters.leadId) {
    query = query.eq('lead_id', filters.leadId);
  }

  if (filters.type) {
    query = query.eq('type', filters.type);
  }

  if (filters.performedBy) {
    query = query.eq('performed_by', filters.performedBy);
  }

  if (filters.dateFrom) {
    query = query.gte('created_at', filters.dateFrom.toISOString());
  }

  if (filters.dateTo) {
    query = query.lte('created_at', filters.dateTo.toISOString());
  }

  // Sorting
  const sortBy = filters.sortBy || 'created_at';
  const sortOrder = filters.sortOrder || 'desc';
  query = query.order(sortBy, { ascending: sortOrder === 'asc' });

  // Pagination
  const page = filters.page || 1;
  const limit = filters.limit || 20;
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  query = query.range(from, to);

  return query;
}
