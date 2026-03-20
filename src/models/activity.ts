import Joi from 'joi';
import { Activity, ActivityType } from '@/types';

/**
 * Activity Model
 * Handles activity logging and validation
 */

// Joi validation schemas
export const createActivitySchema = Joi.object({
  leadId: Joi.string().uuid().required(),
  type: Joi.string()
    .valid(...Object.values(ActivityType))
    .required(),
  description: Joi.string().min(1).max(1000).required(),
  metadata: Joi.object().optional(),
  performedBy: Joi.string().uuid().optional(),
});

export const updateActivitySchema = Joi.object({
  description: Joi.string().min(1).max(1000).optional(),
  metadata: Joi.object().optional(),
});

export const activityFilterSchema = Joi.object({
  leadId: Joi.string().uuid().optional(),
  type: Joi.string()
    .valid(...Object.values(ActivityType))
    .optional(),
  performedBy: Joi.string().uuid().optional(),
  dateFrom: Joi.date().optional(),
  dateTo: Joi.date().optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  sortBy: Joi.string().valid('created_at', 'type').default('created_at'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
});

/**
 * Validate activity creation data
 */
export function validateCreateActivity(data: any): {
  error?: Joi.ValidationError;
  value?: any;
} {
  return createActivitySchema.validate(data, { abortEarly: false });
}

/**
 * Validate activity update data
 */
export function validateUpdateActivity(data: any): {
  error?: Joi.ValidationError;
  value?: any;
} {
  return updateActivitySchema.validate(data, { abortEarly: false });
}

/**
 * Validate activity filter parameters
 */
export function validateActivityFilters(data: any): {
  error?: Joi.ValidationError;
  value?: any;
} {
  return activityFilterSchema.validate(data, { abortEarly: false });
}

/**
 * Activity type descriptions for display
 */
export const activityTypeDescriptions: Record<ActivityType, string> = {
  [ActivityType.LEAD_CREATED]: 'Lead created',
  [ActivityType.LEAD_UPDATED]: 'Lead information updated',
  [ActivityType.STAGE_CHANGED]: 'Lead stage changed',
  [ActivityType.MESSAGE_SENT]: 'WhatsApp message sent',
  [ActivityType.MESSAGE_DELIVERED]: 'Message delivered',
  [ActivityType.MESSAGE_READ]: 'Message read by lead',
  [ActivityType.MESSAGE_FAILED]: 'Message delivery failed',
  [ActivityType.NOTE_ADDED]: 'Note added to lead',
  [ActivityType.CALL_MADE]: 'Phone call made',
  [ActivityType.EMAIL_SENT]: 'Email sent',
  [ActivityType.MEETING_SCHEDULED]: 'Meeting scheduled',
  [ActivityType.FOLLOW_UP_SCHEDULED]: 'Follow-up scheduled',
  [ActivityType.WORKFLOW_TRIGGERED]: 'Automation workflow triggered',
};

/**
 * Get activity icon for display
 */
export function getActivityIcon(type: ActivityType): string {
  const iconMap: Record<ActivityType, string> = {
    [ActivityType.LEAD_CREATED]: '👤',
    [ActivityType.LEAD_UPDATED]: '✏️',
    [ActivityType.STAGE_CHANGED]: '🔄',
    [ActivityType.MESSAGE_SENT]: '📤',
    [ActivityType.MESSAGE_DELIVERED]: '✅',
    [ActivityType.MESSAGE_READ]: '👁️',
    [ActivityType.MESSAGE_FAILED]: '❌',
    [ActivityType.NOTE_ADDED]: '📝',
    [ActivityType.CALL_MADE]: '📞',
    [ActivityType.EMAIL_SENT]: '📧',
    [ActivityType.MEETING_SCHEDULED]: '📅',
    [ActivityType.FOLLOW_UP_SCHEDULED]: '⏰',
    [ActivityType.WORKFLOW_TRIGGERED]: '⚙️',
  };
  return iconMap[type] || '📋';
}

/**
 * Get activity color for display
 */
export function getActivityColor(type: ActivityType): string {
  const colorMap: Record<ActivityType, string> = {
    [ActivityType.LEAD_CREATED]: 'blue',
    [ActivityType.LEAD_UPDATED]: 'gray',
    [ActivityType.STAGE_CHANGED]: 'purple',
    [ActivityType.MESSAGE_SENT]: 'green',
    [ActivityType.MESSAGE_DELIVERED]: 'green',
    [ActivityType.MESSAGE_READ]: 'green',
    [ActivityType.MESSAGE_FAILED]: 'red',
    [ActivityType.NOTE_ADDED]: 'yellow',
    [ActivityType.CALL_MADE]: 'blue',
    [ActivityType.EMAIL_SENT]: 'blue',
    [ActivityType.MEETING_SCHEDULED]: 'purple',
    [ActivityType.FOLLOW_UP_SCHEDULED]: 'orange',
    [ActivityType.WORKFLOW_TRIGGERED]: 'indigo',
  };
  return colorMap[type] || 'gray';
}

/**
 * Format activity for display
 */
export function formatActivityForDisplay(activity: Activity): {
  icon: string;
  color: string;
  title: string;
  description: string;
  timestamp: string;
} {
  return {
    icon: getActivityIcon(activity.type),
    color: getActivityColor(activity.type),
    title: activityTypeDescriptions[activity.type],
    description: activity.description,
    timestamp: new Date(activity.createdAt).toISOString(),
  };
}
