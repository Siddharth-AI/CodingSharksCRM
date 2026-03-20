import Joi from 'joi';
import { WhatsAppMessage, MessageStatus, CreateMessageRequest } from '@/types';

/**
 * WhatsApp Message Model with validation and utilities
 */

// Validation Schemas
export const createMessageSchema = Joi.object({
  leadId: Joi.string().uuid().required().messages({
    'string.uuid': 'Lead ID must be a valid UUID',
    'any.required': 'Lead ID is required',
  }),
  templateId: Joi.string().uuid().optional().messages({
    'string.uuid': 'Template ID must be a valid UUID',
  }),
  content: Joi.string().min(1).max(4096).required().messages({
    'string.min': 'Message content cannot be empty',
    'string.max': 'Message content cannot exceed 4096 characters',
    'any.required': 'Message content is required',
  }),
  recipientPhone: Joi.string().pattern(/^\+91\d{10}$/).optional().messages({
    'string.pattern.base': 'Phone number must be in format +91XXXXXXXXXX',
  }),
  scheduledAt: Joi.date().greater('now').optional().messages({
    'date.greater': 'Scheduled time must be in the future',
  }),
  metadata: Joi.object().optional(),
});

export const updateMessageSchema = Joi.object({
  status: Joi.string().valid(...Object.values(MessageStatus)).optional(),
  deliveredAt: Joi.date().optional(),
  readAt: Joi.date().optional(),
  errorMessage: Joi.string().max(500).optional(),
  retryCount: Joi.number().integer().min(0).max(10).optional(),
  metadata: Joi.object().optional(),
}).min(1).messages({
  'object.min': 'At least one field must be provided for update',
});

export const sendMessageSchema = Joi.object({
  leadId: Joi.string().uuid().required(),
  templateId: Joi.string().uuid().when('useTemplate', {
    is: true,
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  content: Joi.string().min(1).max(4096).when('useTemplate', {
    is: true,
    then: Joi.optional().allow(''),
    otherwise: Joi.required(),
  }),
  useTemplate: Joi.boolean().default(false),
  templateVariables: Joi.object().optional(),
  scheduledAt: Joi.date().greater('now').optional(),
});

export const bulkSendSchema = Joi.object({
  leadIds: Joi.array().items(Joi.string().uuid()).min(1).max(100).required(),
  templateId: Joi.string().uuid().optional(),
  content: Joi.string().min(1).max(4096).when('templateId', {
    is: Joi.exist(),
    then: Joi.optional(),
    otherwise: Joi.required(),
  }),
  useTemplate: Joi.boolean().default(false),
  templateVariables: Joi.object().when('useTemplate', {
    is: true,
    then: Joi.optional(),
    otherwise: Joi.optional(),
  }),
  scheduledAt: Joi.date().greater('now').optional(),
  batchSize: Joi.number().integer().min(1).max(50).default(10),
  delayBetweenMessages: Joi.number().integer().min(0).max(60000).default(1000), // milliseconds
});

/**
 * Message status validation and transitions
 */
export const isValidStatusTransition = (currentStatus: MessageStatus, newStatus: MessageStatus): boolean => {
  const validTransitions: Record<MessageStatus, MessageStatus[]> = {
    [MessageStatus.PENDING]: [MessageStatus.SENT, MessageStatus.FAILED],
    [MessageStatus.SENT]: [MessageStatus.DELIVERED, MessageStatus.FAILED],
    [MessageStatus.DELIVERED]: [MessageStatus.READ, MessageStatus.FAILED],
    [MessageStatus.READ]: [], // Terminal state
    [MessageStatus.FAILED]: [MessageStatus.PENDING], // Can retry
  };

  return validTransitions[currentStatus]?.includes(newStatus) || false;
};

/**
 * Get next possible statuses for a message
 */
export const getNextPossibleStatuses = (currentStatus: MessageStatus): MessageStatus[] => {
  const transitions: Record<MessageStatus, MessageStatus[]> = {
    [MessageStatus.PENDING]: [MessageStatus.SENT, MessageStatus.FAILED],
    [MessageStatus.SENT]: [MessageStatus.DELIVERED, MessageStatus.FAILED],
    [MessageStatus.DELIVERED]: [MessageStatus.READ],
    [MessageStatus.READ]: [],
    [MessageStatus.FAILED]: [MessageStatus.PENDING],
  };

  return transitions[currentStatus] || [];
};

/**
 * Check if message can be retried
 */
export const canRetryMessage = (message: WhatsAppMessage, maxRetries: number = 3): boolean => {
  return message.status === MessageStatus.FAILED && message.retryCount < maxRetries;
};

/**
 * Calculate message delivery time
 */
export const calculateDeliveryTime = (message: WhatsAppMessage): number | null => {
  if (!message.sentAt || !message.deliveredAt) {
    return null;
  }
  
  return new Date(message.deliveredAt).getTime() - new Date(message.sentAt).getTime();
};

/**
 * Calculate message read time
 */
export const calculateReadTime = (message: WhatsAppMessage): number | null => {
  if (!message.deliveredAt || !message.readAt) {
    return null;
  }
  
  return new Date(message.readAt).getTime() - new Date(message.deliveredAt).getTime();
};

/**
 * Get message age in hours
 */
export const getMessageAge = (message: WhatsAppMessage): number => {
  const now = new Date().getTime();
  const createdAt = new Date(message.createdAt).getTime();
  return (now - createdAt) / (1000 * 60 * 60); // Convert to hours
};

/**
 * Check if message is stale (sent but no delivery confirmation)
 */
export const isMessageStale = (message: WhatsAppMessage, staleHours: number = 24): boolean => {
  if (message.status !== MessageStatus.SENT) {
    return false;
  }
  
  return getMessageAge(message) > staleHours;
};

/**
 * Format message content for display
 */
export const formatMessageContent = (content: string, maxLength: number = 100): string => {
  if (content.length <= maxLength) {
    return content;
  }
  
  return content.substring(0, maxLength - 3) + '...';
};

/**
 * Extract phone number from various formats
 */
export const extractPhoneNumber = (input: string): string | null => {
  // Remove all non-digit characters except +
  const cleaned = input.replace(/[^\d+]/g, '');
  
  // Match Indian mobile number patterns
  const patterns = [
    /^\+91(\d{10})$/, // +91XXXXXXXXXX
    /^91(\d{10})$/,   // 91XXXXXXXXXX
    /^(\d{10})$/,     // XXXXXXXXXX
  ];
  
  for (const pattern of patterns) {
    const match = cleaned.match(pattern);
    if (match) {
      const digits = match[1] || match[0];
      return `+91${digits.slice(-10)}`; // Always return +91 format
    }
  }
  
  return null;
};

/**
 * Validate message content for WhatsApp compliance
 */
export const validateMessageContent = (content: string): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} => {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Check length
  if (content.length === 0) {
    errors.push('Message content cannot be empty');
  }
  
  if (content.length > 4096) {
    errors.push('Message content exceeds WhatsApp limit of 4096 characters');
  }
  
  // Check for spam indicators
  const spamWords = ['guaranteed', 'free money', 'click here now', 'limited time only'];
  const foundSpamWords = spamWords.filter(word => 
    content.toLowerCase().includes(word.toLowerCase())
  );
  
  if (foundSpamWords.length > 0) {
    warnings.push(`Potential spam words detected: ${foundSpamWords.join(', ')}`);
  }
  
  // Check for excessive capitalization
  const capsRatio = (content.match(/[A-Z]/g) || []).length / content.length;
  if (capsRatio > 0.3) {
    warnings.push('Excessive capitalization may appear as spam');
  }
  
  // Check for excessive emojis
  const emojiCount = (content.match(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu) || []).length;
  if (emojiCount > 10) {
    warnings.push('Excessive emoji usage may affect deliverability');
  }
  
  // Check for URLs
  const urlPattern = /(https?:\/\/[^\s]+)/g;
  const urls = content.match(urlPattern);
  if (urls && urls.length > 2) {
    warnings.push('Multiple URLs may trigger spam filters');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
};

/**
 * Generate message statistics
 */
export const calculateMessageStats = (messages: WhatsAppMessage[]): {
  total: number;
  byStatus: Record<MessageStatus, number>;
  deliveryRate: number;
  readRate: number;
  averageDeliveryTime: number | null;
  averageReadTime: number | null;
  failureRate: number;
  retryRate: number;
} => {
  const total = messages.length;
  
  if (total === 0) {
    return {
      total: 0,
      byStatus: {
        [MessageStatus.PENDING]: 0,
        [MessageStatus.SENT]: 0,
        [MessageStatus.DELIVERED]: 0,
        [MessageStatus.READ]: 0,
        [MessageStatus.FAILED]: 0,
      },
      deliveryRate: 0,
      readRate: 0,
      averageDeliveryTime: null,
      averageReadTime: null,
      failureRate: 0,
      retryRate: 0,
    };
  }
  
  const byStatus = messages.reduce((acc, message) => {
    acc[message.status] = (acc[message.status] || 0) + 1;
    return acc;
  }, {} as Record<MessageStatus, number>);
  
  // Fill missing statuses with 0
  Object.values(MessageStatus).forEach(status => {
    if (!byStatus[status]) {
      byStatus[status] = 0;
    }
  });
  
  const delivered = byStatus[MessageStatus.DELIVERED] + byStatus[MessageStatus.READ];
  const read = byStatus[MessageStatus.READ];
  const failed = byStatus[MessageStatus.FAILED];
  const retried = messages.filter(m => m.retryCount > 0).length;
  
  // Calculate delivery times
  const deliveryTimes = messages
    .map(calculateDeliveryTime)
    .filter(time => time !== null) as number[];
  
  const readTimes = messages
    .map(calculateReadTime)
    .filter(time => time !== null) as number[];
  
  const averageDeliveryTime = deliveryTimes.length > 0
    ? deliveryTimes.reduce((sum, time) => sum + time, 0) / deliveryTimes.length
    : null;
  
  const averageReadTime = readTimes.length > 0
    ? readTimes.reduce((sum, time) => sum + time, 0) / readTimes.length
    : null;
  
  return {
    total,
    byStatus,
    deliveryRate: Math.round((delivered / total) * 10000) / 100,
    readRate: Math.round((read / total) * 10000) / 100,
    averageDeliveryTime,
    averageReadTime,
    failureRate: Math.round((failed / total) * 10000) / 100,
    retryRate: Math.round((retried / total) * 10000) / 100,
  };
};

/**
 * Get messages requiring attention (failed, stale, etc.)
 */
export const getMessagesRequiringAttention = (messages: WhatsAppMessage[]): {
  failed: WhatsAppMessage[];
  stale: WhatsAppMessage[];
  retryable: WhatsAppMessage[];
  highPriority: WhatsAppMessage[];
} => {
  const failed = messages.filter(m => m.status === MessageStatus.FAILED);
  const stale = messages.filter(m => isMessageStale(m));
  const retryable = messages.filter(m => canRetryMessage(m));
  
  // High priority: failed messages to important leads or recent messages
  const highPriority = messages.filter(m => {
    if (m.status === MessageStatus.FAILED) {
      const age = getMessageAge(m);
      return age < 1; // Failed within last hour
    }
    return false;
  });
  
  return {
    failed,
    stale,
    retryable,
    highPriority,
  };
};

/**
 * Format message for export
 */
export const formatMessageForExport = (message: WhatsAppMessage): Record<string, any> => {
  return {
    id: message.id,
    leadId: message.leadId,
    templateId: message.templateId,
    content: message.content,
    status: message.status,
    sentAt: message.sentAt?.toISOString(),
    deliveredAt: message.deliveredAt?.toISOString(),
    readAt: message.readAt?.toISOString(),
    errorMessage: message.errorMessage,
    retryCount: message.retryCount,
    createdAt: message.createdAt.toISOString(),
    deliveryTime: calculateDeliveryTime(message),
    readTime: calculateReadTime(message),
    age: Math.round(getMessageAge(message) * 100) / 100, // Hours with 2 decimal places
  };
};

export default {
  createMessageSchema,
  updateMessageSchema,
  sendMessageSchema,
  bulkSendSchema,
  isValidStatusTransition,
  getNextPossibleStatuses,
  canRetryMessage,
  calculateDeliveryTime,
  calculateReadTime,
  getMessageAge,
  isMessageStale,
  formatMessageContent,
  extractPhoneNumber,
  validateMessageContent,
  calculateMessageStats,
  getMessagesRequiringAttention,
  formatMessageForExport,
};