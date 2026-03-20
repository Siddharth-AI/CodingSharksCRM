import Joi from 'joi';
import { MessageTemplate, TemplateType, CreateMessageTemplateRequest, UpdateMessageTemplateRequest } from '@/types';

/**
 * Message Template Model with validation and utilities
 */

// Validation Schemas
export const createMessageTemplateSchema = Joi.object({
  courseId: Joi.string().uuid().required().messages({
    'string.uuid': 'Course ID must be a valid UUID',
    'any.required': 'Course ID is required',
  }),
  type: Joi.string().valid(...Object.values(TemplateType)).required().messages({
    'any.only': 'Template type must be one of: welcome, follow_up_day_1, follow_up_day_2, follow_up_day_3, custom',
    'any.required': 'Template type is required',
  }),
  name: Joi.string().min(3).max(100).required().messages({
    'string.min': 'Template name must be at least 3 characters long',
    'string.max': 'Template name cannot exceed 100 characters',
    'any.required': 'Template name is required',
  }),
  content: Joi.string().min(10).max(4096).required().messages({
    'string.min': 'Template content must be at least 10 characters long',
    'string.max': 'Template content cannot exceed 4096 characters',
    'any.required': 'Template content is required',
  }),
  variables:        Joi.array().items(Joi.string().min(1).max(50)).max(50).default([]),
  variableDefaults: Joi.object().pattern(Joi.string(), Joi.string()).default({}),
  mediaImageUrl:    Joi.string().uri().allow(null, '').optional(),
  mediaVideoUrl:    Joi.string().uri().allow(null, '').optional(),
});

export const updateMessageTemplateSchema = Joi.object({
  name:             Joi.string().min(3).max(100),
  type:             Joi.string().valid(...Object.values(TemplateType)),
  content:          Joi.string().min(10).max(4096),
  variables:        Joi.array().items(Joi.string().min(1).max(50)).max(50),
  variableDefaults: Joi.object().pattern(Joi.string(), Joi.string()),
  isActive:         Joi.boolean(),
  mediaImageUrl:    Joi.string().uri().allow(null, '').optional(),
  mediaVideoUrl:    Joi.string().uri().allow(null, '').optional(),
}).min(1).messages({
  'object.min': 'At least one field must be provided for update',
});

// Template variable pattern: {{variable_name}}
const VARIABLE_PATTERN = /\{\{([a-zA-Z_][a-zA-Z0-9_]*)\}\}/g;

/**
 * Extract variables from template content
 */
export const extractVariablesFromContent = (content: string): string[] => {
  const variables: string[] = [];
  let match;
  
  while ((match = VARIABLE_PATTERN.exec(content)) !== null) {
    const variableName = match[1];
    if (!variables.includes(variableName)) {
      variables.push(variableName);
    }
  }
  
  return variables.sort();
};

/**
 * Validate template content and variables consistency
 */
export const validateTemplateVariables = (content: string, declaredVariables: string[]): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  extractedVariables: string[];
} => {
  const errors: string[] = [];
  const warnings: string[] = [];
  const extractedVariables = extractVariablesFromContent(content);
  
  // Check for undeclared variables in content
  const undeclaredVariables = extractedVariables.filter(
    variable => !declaredVariables.includes(variable)
  );
  
  if (undeclaredVariables.length > 0) {
    errors.push(`Undeclared variables found in content: ${undeclaredVariables.join(', ')}`);
  }
  
  // Check for unused declared variables
  const unusedVariables = declaredVariables.filter(
    variable => !extractedVariables.includes(variable)
  );
  
  if (unusedVariables.length > 0) {
    warnings.push(`Declared variables not used in content: ${unusedVariables.join(', ')}`);
  }
  
  // Check for invalid variable names
  const invalidVariables = extractedVariables.filter(
    variable => !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(variable)
  );
  
  if (invalidVariables.length > 0) {
    errors.push(`Invalid variable names (must start with letter/underscore, contain only letters/numbers/underscores): ${invalidVariables.join(', ')}`);
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    extractedVariables,
  };
};

/**
 * Substitute variables in template content
 */
export const substituteTemplateVariables = (
  content: string, 
  variables: Record<string, string | number | boolean>
): {
  result: string;
  missingVariables: string[];
  substitutionCount: number;
} => {
  const missingVariables: string[] = [];
  let substitutionCount = 0;
  
  const result = content.replace(VARIABLE_PATTERN, (match, variableName) => {
    if (variables.hasOwnProperty(variableName)) {
      substitutionCount++;
      return String(variables[variableName]);
    } else {
      missingVariables.push(variableName);
      return match; // Keep original placeholder if variable not provided
    }
  });
  
  return {
    result,
    missingVariables: [...new Set(missingVariables)], // Remove duplicates
    substitutionCount,
  };
};

/**
 * Generate preview of template with sample data
 */
export const generateTemplatePreview = (template: MessageTemplate): string => {
  const sampleVariables: Record<string, string> = {
    // Lead variables
    name: 'John Doe',
    first_name: 'John',
    last_name: 'Doe',
    email: 'john.doe@example.com',
    mobile: '+91 9876543210',
    
    // Course variables
    course_name: 'Python Programming',
    course_duration: '3 months',
    course_price: '₹15,000',
    
    // Date/time variables
    current_date: new Date().toLocaleDateString('en-IN'),
    current_time: new Date().toLocaleTimeString('en-IN'),
    
    // Company variables
    company_name: 'TechEd Institute',
    support_phone: '+91 9876543210',
    website: 'www.teched.com',
    
    // Follow-up variables
    days_since_inquiry: '3',
    follow_up_number: '2',
    next_batch_date: '15th March 2024',
  };
  
  const { result } = substituteTemplateVariables(template.content, sampleVariables);
  return result;
};

/**
 * Validate template type against course category
 */
export const validateTemplateTypeForCourse = (
  templateType: TemplateType,
  courseCategory: string
): {
  isValid: boolean;
  suggestions: string[];
} => {
  // All template types are valid for all courses
  // But we can provide suggestions based on course category
  const suggestions: string[] = [];
  
  if (templateType === TemplateType.WELCOME) {
    suggestions.push('Consider mentioning course-specific benefits');
    suggestions.push('Include course duration and start date');
  }
  
  if (templateType.startsWith('follow_up')) {
    suggestions.push('Add urgency for course enrollment');
    suggestions.push('Mention limited seats or early bird discounts');
  }
  
  return {
    isValid: true,
    suggestions,
  };
};

/**
 * Get default template content based on type
 */
export const getDefaultTemplateContent = (type: TemplateType, courseName?: string): string => {
  const templates: Record<TemplateType, string> = {
    [TemplateType.WELCOME]: `Hi {{name}}! 👋

Thank you for your interest in ${courseName || '{{course_name}}'} at {{company_name}}!

We're excited to help you start your learning journey. Our course includes:
✅ {{course_duration}} of comprehensive training
✅ Hands-on projects and assignments
✅ Industry expert instructors
✅ Job placement assistance

Course Fee: {{course_price}}
Next Batch: {{next_batch_date}}

Would you like to know more about the curriculum or have any questions?

Best regards,
{{company_name}} Team
📞 {{support_phone}}`,

    [TemplateType.FOLLOW_UP_DAY_1]: `Hi {{name}}! 

Hope you're doing well! Yesterday you showed interest in our ${courseName || '{{course_name}}'} course.

I wanted to follow up and see if you have any questions about:
• Course curriculum and projects
• Batch timings and schedule
• Fee structure and payment options
• Job placement assistance

Our next batch starts on {{next_batch_date}} and we have limited seats available.

Would you like to schedule a quick call to discuss your learning goals?

Best regards,
{{company_name}} Team`,

    [TemplateType.FOLLOW_UP_DAY_2]: `Hi {{name}}! 

It's been {{days_since_inquiry}} days since you inquired about our ${courseName || '{{course_name}}'} course.

🎯 Don't miss out on this opportunity to advance your career!

Special offer for you:
💰 Early bird discount of 15% (valid till this weekend)
📚 Free course materials worth ₹2,000
🎓 Lifetime access to course recordings

Only {{seats_remaining}} seats left in the upcoming batch!

Ready to take the next step? Reply with "YES" to secure your spot.

{{company_name}} Team`,

    [TemplateType.FOLLOW_UP_DAY_3]: `Hi {{name}}! 

Last chance reminder! ⏰

Our ${courseName || '{{course_name}}'} batch is filling up fast and we don't want you to miss out.

What our students say:
⭐ "Best investment in my career" - Priya S.
⭐ "Got placed within 2 months" - Rahul K.
⭐ "Excellent practical training" - Anjali M.

This is your final reminder for:
🎯 15% early bird discount
📅 Batch starting {{next_batch_date}}
💼 100% job placement assistance

Reply "ENROLL" to secure your future today!

{{company_name}} Team
{{support_phone}}`,

    [TemplateType.CUSTOM]: `Hi {{name}}!

[Your custom message content here]

Use variables like {{course_name}}, {{course_price}}, {{next_batch_date}} to personalize your message.

Best regards,
{{company_name}} Team`,
  };
  
  return templates[type];
};

/**
 * Calculate template engagement metrics
 */
export const calculateTemplateMetrics = (
  template: MessageTemplate,
  messages: any[] // WhatsAppMessage array
): {
  totalSent: number;
  deliveryRate: number;
  readRate: number;
  responseRate: number;
  avgResponseTime: number; // in hours
} => {
  const templateMessages = messages.filter(msg => msg.templateId === template.id);
  const totalSent = templateMessages.length;
  
  if (totalSent === 0) {
    return {
      totalSent: 0,
      deliveryRate: 0,
      readRate: 0,
      responseRate: 0,
      avgResponseTime: 0,
    };
  }
  
  const delivered = templateMessages.filter(msg => msg.deliveredAt).length;
  const read = templateMessages.filter(msg => msg.readAt).length;
  
  // Response rate would need to be calculated based on incoming messages
  // For now, we'll use a placeholder calculation
  const responseRate = 0; // TODO: Implement based on incoming message tracking
  
  // Average response time calculation would need incoming message timestamps
  const avgResponseTime = 0; // TODO: Implement based on response tracking
  
  return {
    totalSent,
    deliveryRate: Math.round((delivered / totalSent) * 10000) / 100,
    readRate: Math.round((read / totalSent) * 10000) / 100,
    responseRate,
    avgResponseTime,
  };
};

/**
 * Get template usage statistics
 */
export const getTemplateUsageStats = (templates: MessageTemplate[], messages: any[]) => {
  return templates.map(template => {
    const metrics = calculateTemplateMetrics(template, messages);
    return {
      template,
      metrics,
      lastUsed: messages
        .filter(msg => msg.templateId === template.id)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]?.createdAt || null,
    };
  }).sort((a, b) => b.metrics.totalSent - a.metrics.totalSent);
};

/**
 * Validate template content for WhatsApp compliance
 */
export const validateWhatsAppCompliance = (content: string): {
  isCompliant: boolean;
  violations: string[];
  warnings: string[];
} => {
  const violations: string[] = [];
  const warnings: string[] = [];
  
  // Check message length (WhatsApp has limits)
  if (content.length > 4096) {
    violations.push('Message exceeds WhatsApp character limit of 4096');
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
  
  // Check for required opt-out information for marketing messages
  if (!content.toLowerCase().includes('stop') && !content.toLowerCase().includes('unsubscribe')) {
    warnings.push('Consider adding opt-out instructions for marketing messages');
  }
  
  return {
    isCompliant: violations.length === 0,
    violations,
    warnings,
  };
};

/**
 * Generate template variations for A/B testing
 */
export const generateTemplateVariations = (baseTemplate: MessageTemplate): Array<{
  name: string;
  content: string;
  changes: string[];
}> => {
  const variations = [];
  
  // Variation 1: More formal tone
  variations.push({
    name: `${baseTemplate.name} - Formal`,
    content: baseTemplate.content
      .replace(/Hi /g, 'Dear ')
      .replace(/!/g, '.')
      .replace(/👋|🎯|💰|📚|🎓|⭐|💼|⏰/g, ''),
    changes: ['More formal tone', 'Removed emojis', 'Professional language'],
  });
  
  // Variation 2: More urgent tone
  variations.push({
    name: `${baseTemplate.name} - Urgent`,
    content: baseTemplate.content
      .replace(/Would you like/g, 'Don\'t miss out! Would you like')
      .replace(/Best regards/g, 'Act now!\n\nBest regards')
      + '\n\n⚡ Limited time offer - Reply within 24 hours!',
    changes: ['Added urgency', 'Time-sensitive language', 'Call-to-action emphasis'],
  });
  
  // Variation 3: Shorter version
  const sentences = baseTemplate.content.split(/[.!?]+/).filter(s => s.trim());
  const shortContent = sentences.slice(0, Math.ceil(sentences.length / 2)).join('. ') + '.';
  
  variations.push({
    name: `${baseTemplate.name} - Short`,
    content: shortContent,
    changes: ['Reduced length', 'Concise messaging', 'Key points only'],
  });
  
  return variations;
};

export default {
  createMessageTemplateSchema,
  updateMessageTemplateSchema,
  extractVariablesFromContent,
  validateTemplateVariables,
  substituteTemplateVariables,
  generateTemplatePreview,
  validateTemplateTypeForCourse,
  getDefaultTemplateContent,
  calculateTemplateMetrics,
  getTemplateUsageStats,
  validateWhatsAppCompliance,
  generateTemplateVariations,
};