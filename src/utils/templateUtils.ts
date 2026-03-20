import { MessageTemplate, TemplateType, Lead, Course } from '@/types';
import { substituteTemplateVariables } from '@/models/messageTemplate';

/**
 * Template utility functions for variable substitution and content generation
 */

/**
 * Get lead-specific variables for template substitution
 */
export const getLeadVariables = (lead: Lead): Record<string, string> => {
  const nameParts = lead.name.split(' ');
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || '';
  
  return {
    // Lead basic info
    name: lead.name,
    first_name: firstName,
    last_name: lastName,
    email: lead.email,
    mobile: lead.mobile,
    inquiry_date: lead.createdAt.toLocaleDateString('en-IN'),
  };
};

/**
 * Get course-specific variables for template substitution
 */
export const getCourseVariables = (course: Course): Record<string, string> => {
  return {
    course_name: course.name,
    course_description: course.description,
    course_duration: course.duration,
    course_price: course.price != null ? `₹${course.price.toLocaleString('en-IN')}` : 'Free',
    course_status: course.isActive ? 'Active' : 'Inactive',
  };
};

/**
 * Get system/company variables for template substitution
 */
export const getSystemVariables = (): Record<string, string> => {
  const now = new Date();

  return {
    // Company info
    company_name: process.env.COMPANY_NAME || 'TechEd Institute',
    support_phone: process.env.SUPPORT_PHONE || '+91 9876543210',
    support_email: process.env.SUPPORT_EMAIL || 'support@teched.com',
    website: process.env.COMPANY_WEBSITE || 'www.teched.com',

    // Date/time
    current_date: now.toLocaleDateString('en-IN'),
    current_time: now.toLocaleTimeString('en-IN'),
    current_day: now.toLocaleDateString('en-IN', { weekday: 'long' }),
    current_month: now.toLocaleDateString('en-IN', { month: 'long' }),
    current_year: now.getFullYear().toString(),

    // Business hours
    business_hours: process.env.BUSINESS_HOURS || '11:00 AM - 8:00 PM',
    business_days: 'Monday to Friday',

    // Social media (if applicable)
    facebook_page: process.env.FACEBOOK_PAGE || '',
    instagram_handle: process.env.INSTAGRAM_HANDLE || '',
    linkedin_page: process.env.LINKEDIN_PAGE || '',
  };
};

/**
 * Get follow-up specific variables
 */
export const getFollowUpVariables = (
  lead: Lead,
  followUpNumber: number,
  totalFollowUps: number = 7
): Record<string, string> => {
  const daysSinceInquiry = Math.floor(
    (new Date().getTime() - lead.createdAt.getTime()) / (1000 * 60 * 60 * 24)
  );
  
  const remainingFollowUps = Math.max(0, totalFollowUps - followUpNumber);
  
  // Calculate next batch date (example: next Monday)
  const nextBatchDate = new Date();
  const daysUntilMonday = (8 - nextBatchDate.getDay()) % 7 || 7;
  nextBatchDate.setDate(nextBatchDate.getDate() + daysUntilMonday);
  
  return {
    follow_up_number: followUpNumber.toString(),
    total_follow_ups: totalFollowUps.toString(),
    remaining_follow_ups: remainingFollowUps.toString(),
    days_since_inquiry: daysSinceInquiry.toString(),
    
    // Batch info (example data)
    next_batch_date: nextBatchDate.toLocaleDateString('en-IN', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    }),
    seats_remaining: Math.floor(Math.random() * 10 + 5).toString(), // Random for demo
    
    // Urgency indicators
    urgency_level: followUpNumber > 3 ? 'High' : followUpNumber > 1 ? 'Medium' : 'Low',
    is_final_reminder: followUpNumber >= totalFollowUps ? 'true' : 'false',
  };
};

/**
 * Get promotional variables for marketing templates
 */
export const getPromotionalVariables = (): Record<string, string> => {
  const discountPercentage = 15; // Example discount
  const validUntil = new Date();
  validUntil.setDate(validUntil.getDate() + 7); // Valid for 7 days
  
  return {
    discount_percentage: discountPercentage.toString(),
    discount_amount: '₹2,000', // Example amount
    offer_valid_until: validUntil.toLocaleDateString('en-IN'),
    promo_code: 'EARLY2024',
    
    // Benefits
    free_materials_worth: '₹2,000',
    job_placement_rate: '95%',
    student_satisfaction: '4.8/5',
    
    // Social proof
    total_students_trained: '5000+',
    companies_hiring: '200+',
    average_salary_increase: '40%',
  };
};

/**
 * Combine all variable sources for comprehensive substitution
 */
export const getAllTemplateVariables = (
  lead: Lead,
  course?: Course,
  followUpNumber?: number,
  includePromotional: boolean = false
): Record<string, string> => {
  let variables: Record<string, string> = {
    ...getLeadVariables(lead),
    ...getSystemVariables(),
  };

  if (course) {
    variables = {
      ...variables,
      ...getCourseVariables(course),
      course_interest: course.name, // show course name instead of ID
    };
  }
  
  if (followUpNumber) {
    variables = { ...variables, ...getFollowUpVariables(lead, followUpNumber) };
  }
  
  if (includePromotional) {
    variables = { ...variables, ...getPromotionalVariables() };
  }
  
  return variables;
};

/**
 * Process template with lead and course data
 */
export const processTemplate = (
  template: MessageTemplate,
  lead: Lead,
  course?: Course,
  additionalVariables?: Record<string, string>
): {
  content: string;
  missingVariables: string[];
  substitutionCount: number;
} => {
  // Determine follow-up number based on template type
  let followUpNumber: number | undefined;
  if (template.type === TemplateType.FOLLOW_UP_DAY_1) followUpNumber = 1;
  else if (template.type === TemplateType.FOLLOW_UP_DAY_2) followUpNumber = 2;
  else if (template.type === TemplateType.FOLLOW_UP_DAY_3) followUpNumber = 3;
  
  // Include promotional variables for follow-up templates
  const includePromotional = template.type.startsWith('follow_up');
  
  const variables = {
    ...getAllTemplateVariables(lead, course, followUpNumber, includePromotional),
    // template-stored defaults for custom variables (lowest priority)
    ...(template.variableDefaults || {}),
    // caller-supplied overrides (highest priority)
    ...additionalVariables,
  };
  
  const { result, missingVariables, substitutionCount } = substituteTemplateVariables(template.content, variables);
  return { content: result, missingVariables, substitutionCount };
};

/**
 * Generate personalized message content
 */
export const generatePersonalizedMessage = (
  templateContent: string,
  lead: Lead,
  course?: Course,
  customVariables?: Record<string, string>
): string => {
  const variables = {
    ...getAllTemplateVariables(lead, course),
    ...customVariables,
  };
  
  const { result } = substituteTemplateVariables(templateContent, variables);
  return result;
};

/**
 * Validate template against lead data
 */
export const validateTemplateForLead = (
  template: MessageTemplate,
  lead: Lead,
  course?: Course
): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} => {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Check if course is required but not provided
  if (template.variables.some(v => v.startsWith('course_')) && !course) {
    errors.push('Course data is required for this template');
  }
  
  // Check if template type matches lead stage
  if (template.type === TemplateType.WELCOME && lead.stage !== 'new') {
    warnings.push('Welcome template is typically used for new leads');
  }
  
  if (template.type.startsWith('follow_up') && lead.stage === 'converted') {
    warnings.push('Follow-up template may not be appropriate for converted leads');
  }
  
  // Check if lead has required data
  if (!lead.name || lead.name.trim() === '') {
    errors.push('Lead name is required for personalization');
  }
  
  if (!lead.email || !lead.email.includes('@')) {
    warnings.push('Lead email appears to be invalid');
  }
  
  if (!lead.mobile || lead.mobile.length < 10) {
    warnings.push('Lead mobile number appears to be invalid');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
};

/**
 * Get template suggestions based on lead data
 */
export const getTemplateSuggestions = (
  lead: Lead,
  availableTemplates: MessageTemplate[]
): Array<{
  template: MessageTemplate;
  score: number;
  reasons: string[];
}> => {
  const suggestions = availableTemplates.map(template => {
    let score = 0;
    const reasons: string[] = [];
    
    // Score based on lead stage
    if (template.type === TemplateType.WELCOME && lead.stage === 'new') {
      score += 10;
      reasons.push('Perfect for new leads');
    }
    
    if (template.type === TemplateType.FOLLOW_UP_DAY_1 && lead.stage === 'contacted') {
      const daysSinceContact = lead.lastContactedAt 
        ? Math.floor((new Date().getTime() - lead.lastContactedAt.getTime()) / (1000 * 60 * 60 * 24))
        : 0;
      
      if (daysSinceContact >= 1) {
        score += 8;
        reasons.push('Appropriate timing for first follow-up');
      }
    }
    
    if (template.type.startsWith('follow_up') && lead.stage === 'interested') {
      score += 6;
      reasons.push('Good for nurturing interested leads');
    }
    
    // Score based on course match
    if (template.courseId && template.courseId === lead.courseInterest) {
      score += 5;
      reasons.push('Course-specific template');
    }
    
    // Score based on template activity
    if (template.isActive) {
      score += 2;
      reasons.push('Active template');
    }
    
    return {
      template,
      score,
      reasons,
    };
  });
  
  return suggestions
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5); // Top 5 suggestions
};

/**
 * Generate template performance report
 */
export const generateTemplateReport = (
  templates: MessageTemplate[],
  messages: any[], // WhatsAppMessage array
  dateRange?: { from: Date; to: Date }
): {
  summary: {
    totalTemplates: number;
    activeTemplates: number;
    totalMessagesSent: number;
    avgDeliveryRate: number;
    avgReadRate: number;
  };
  templateStats: Array<{
    template: MessageTemplate;
    messagesSent: number;
    deliveryRate: number;
    readRate: number;
    lastUsed: Date | null;
    performance: 'High' | 'Medium' | 'Low';
  }>;
} => {
  let filteredMessages = messages;
  
  if (dateRange) {
    filteredMessages = messages.filter(msg => {
      const msgDate = new Date(msg.createdAt);
      return msgDate >= dateRange.from && msgDate <= dateRange.to;
    });
  }
  
  const templateStats = templates.map(template => {
    const templateMessages = filteredMessages.filter(msg => msg.templateId === template.id);
    const messagesSent = templateMessages.length;
    const delivered = templateMessages.filter(msg => msg.deliveredAt).length;
    const read = templateMessages.filter(msg => msg.readAt).length;
    
    const deliveryRate = messagesSent > 0 ? (delivered / messagesSent) * 100 : 0;
    const readRate = messagesSent > 0 ? (read / messagesSent) * 100 : 0;
    
    const lastUsed = templateMessages.length > 0 
      ? new Date(Math.max(...templateMessages.map(msg => new Date(msg.createdAt).getTime())))
      : null;
    
    let performance: 'High' | 'Medium' | 'Low' = 'Low';
    if (deliveryRate >= 90 && readRate >= 70) performance = 'High';
    else if (deliveryRate >= 80 && readRate >= 50) performance = 'Medium';
    
    return {
      template,
      messagesSent,
      deliveryRate: Math.round(deliveryRate * 100) / 100,
      readRate: Math.round(readRate * 100) / 100,
      lastUsed,
      performance,
    };
  });
  
  const totalMessagesSent = templateStats.reduce((sum, stat) => sum + stat.messagesSent, 0);
  const avgDeliveryRate = templateStats.length > 0 
    ? templateStats.reduce((sum, stat) => sum + stat.deliveryRate, 0) / templateStats.length
    : 0;
  const avgReadRate = templateStats.length > 0
    ? templateStats.reduce((sum, stat) => sum + stat.readRate, 0) / templateStats.length
    : 0;
  
  return {
    summary: {
      totalTemplates: templates.length,
      activeTemplates: templates.filter(t => t.isActive).length,
      totalMessagesSent,
      avgDeliveryRate: Math.round(avgDeliveryRate * 100) / 100,
      avgReadRate: Math.round(avgReadRate * 100) / 100,
    },
    templateStats: templateStats.sort((a, b) => b.messagesSent - a.messagesSent),
  };
};

export default {
  getLeadVariables,
  getCourseVariables,
  getSystemVariables,
  getFollowUpVariables,
  getPromotionalVariables,
  getAllTemplateVariables,
  processTemplate,
  generatePersonalizedMessage,
  validateTemplateForLead,
  getTemplateSuggestions,
  generateTemplateReport,
};