import Joi from 'joi';
import { LeadStage, LeadSource } from '@/types';

/**
 * Mobile number formatting utility for +91 format
 */
export const formatMobileNumber = (mobile: string): string => {
  // Remove all non-digit characters
  const digits = mobile.replace(/\D/g, '');
  
  // Handle different input formats
  if (digits.length === 10) {
    // Indian mobile number without country code
    return `+91${digits}`;
  } else if (digits.length === 12 && digits.startsWith('91')) {
    // Indian mobile number with country code but no +
    return `+${digits}`;
  } else if (digits.length === 13 && digits.startsWith('91')) {
    // Handle cases where + is missing but country code is present
    return `+${digits}`;
  }
  
  // If already in correct format or other country code, return as is
  if (mobile.startsWith('+')) {
    return mobile;
  }
  
  // Default: assume Indian number and add +91
  return `+91${digits}`;
};

/**
 * Validate mobile number format
 */
export const isValidMobileNumber = (mobile: string): boolean => {
  const formatted = formatMobileNumber(mobile);
  
  // Indian mobile number validation: +91 followed by 10 digits
  const indianMobileRegex = /^\+91[6-9]\d{9}$/;
  
  // International format validation (basic)
  const internationalMobileRegex = /^\+\d{10,15}$/;
  
  return indianMobileRegex.test(formatted) || internationalMobileRegex.test(formatted);
};

/**
 * Lead creation validation schema
 */
export const createLeadSchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(2)
    .max(100)
    .required()
    .messages({
      'string.empty': 'Name is required',
      'string.min': 'Name must be at least 2 characters long',
      'string.max': 'Name cannot exceed 100 characters',
    }),

  email: Joi.string()
    .email({ tlds: { allow: false } })
    .trim()
    .lowercase()
    .required()
    .messages({
      'string.empty': 'Email is required',
      'string.email': 'Please provide a valid email address',
    }),

  mobile: Joi.string()
    .trim()
    .custom((value, helpers) => {
      const formatted = formatMobileNumber(value);
      if (!isValidMobileNumber(formatted)) {
        return helpers.error('mobile.invalid');
      }
      return formatted;
    })
    .required()
    .messages({
      'string.empty': 'Mobile number is required',
      'mobile.invalid': 'Please provide a valid mobile number (Indian: 10 digits, International: +country code)',
    }),

  courseInterest: Joi.string()
    .trim()
    .min(1)
    .max(200)
    .required()
    .messages({
      'string.empty': 'Course interest is required',
      'string.max': 'Course interest cannot exceed 200 characters',
    }),

  source: Joi.string()
    .valid(...Object.values(LeadSource))
    .default(LeadSource.WEBSITE)
    .messages({
      'any.only': 'Source must be one of: website, referral, social_media, advertisement, walk_in',
    }),

  notes: Joi.string()
    .trim()
    .max(1000)
    .allow('')
    .optional()
    .messages({
      'string.max': 'Notes cannot exceed 1000 characters',
    }),
});

/**
 * Lead update validation schema
 */
export const updateLeadSchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(2)
    .max(100)
    .optional()
    .messages({
      'string.min': 'Name must be at least 2 characters long',
      'string.max': 'Name cannot exceed 100 characters',
    }),

  email: Joi.string()
    .email({ tlds: { allow: false } })
    .trim()
    .lowercase()
    .optional()
    .messages({
      'string.email': 'Please provide a valid email address',
    }),

  mobile: Joi.string()
    .trim()
    .custom((value, helpers) => {
      const formatted = formatMobileNumber(value);
      if (!isValidMobileNumber(formatted)) {
        return helpers.error('mobile.invalid');
      }
      return formatted;
    })
    .optional()
    .messages({
      'mobile.invalid': 'Please provide a valid mobile number (Indian: 10 digits, International: +country code)',
    }),

  courseInterest: Joi.string()
    .trim()
    .min(1)
    .max(200)
    .optional()
    .messages({
      'string.max': 'Course interest cannot exceed 200 characters',
    }),

  stage: Joi.string()
    .valid(...Object.values(LeadStage))
    .optional()
    .messages({
      'any.only': 'Stage must be one of: new, contacted, interested, converted',
    }),

  notes: Joi.string()
    .trim()
    .max(1000)
    .allow('')
    .optional()
    .messages({
      'string.max': 'Notes cannot exceed 1000 characters',
    }),

}).min(1).messages({
  'object.min': 'At least one field must be provided for update',
});

/**
 * Lead filtering validation schema
 */
export const leadFiltersSchema = Joi.object({
  stage: Joi.string()
    .valid(...Object.values(LeadStage))
    .optional(),

  courseInterest: Joi.string()
    .trim()
    .optional(),

  source: Joi.string()
    .valid(...Object.values(LeadSource))
    .optional(),

  dateFrom: Joi.date()
    .iso()
    .optional(),

  dateTo: Joi.date()
    .iso()
    .min(Joi.ref('dateFrom'))
    .optional()
    .messages({
      'date.min': 'End date must be after start date',
    }),

  search: Joi.string()
    .trim()
    .min(1)
    .max(100)
    .optional()
    .messages({
      'string.min': 'Search query must be at least 1 character',
      'string.max': 'Search query cannot exceed 100 characters',
    }),
});

/**
 * Pagination validation schema
 */
export const paginationSchema = Joi.object({
  page: Joi.number()
    .integer()
    .min(1)
    .default(1)
    .messages({
      'number.min': 'Page must be at least 1',
      'number.integer': 'Page must be an integer',
    }),

  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(10)
    .messages({
      'number.min': 'Limit must be at least 1',
      'number.max': 'Limit cannot exceed 100',
      'number.integer': 'Limit must be an integer',
    }),
});

/**
 * Lead stage update validation schema
 */
export const updateLeadStageSchema = Joi.object({
  stage: Joi.string()
    .valid(...Object.values(LeadStage))
    .required()
    .messages({
      'string.empty': 'Stage is required',
      'any.only': 'Stage must be one of: new, contacted, interested, converted',
    }),
});

/**
 * Bulk stage update validation schema
 */
export const bulkUpdateStagesSchema = Joi.object({
  updates: Joi.array()
    .items(
      Joi.object({
        id: Joi.string()
          .uuid()
          .required()
          .messages({
            'string.empty': 'Lead ID is required',
            'string.uuid': 'Lead ID must be a valid UUID',
          }),
        stage: Joi.string()
          .valid(...Object.values(LeadStage))
          .required()
          .messages({
            'string.empty': 'Stage is required',
            'any.only': 'Stage must be one of: new, contacted, interested, converted',
          }),
      })
    )
    .min(1)
    .max(50)
    .required()
    .messages({
      'array.min': 'At least one update is required',
      'array.max': 'Cannot update more than 50 leads at once',
    }),
});

/**
 * Add note validation schema
 */
export const addNoteSchema = Joi.object({
  note: Joi.string()
    .trim()
    .min(1)
    .max(1000)
    .required()
    .messages({
      'string.empty': 'Note is required',
      'string.min': 'Note must be at least 1 character',
      'string.max': 'Note cannot exceed 1000 characters',
    }),
});

/**
 * Date range validation schema
 */
export const dateRangeSchema = Joi.object({
  from: Joi.date()
    .iso()
    .required()
    .messages({
      'date.base': 'From date must be a valid date',
      'any.required': 'From date is required',
    }),

  to: Joi.date()
    .iso()
    .min(Joi.ref('from'))
    .required()
    .messages({
      'date.base': 'To date must be a valid date',
      'date.min': 'To date must be after from date',
      'any.required': 'To date is required',
    }),
});

/**
 * Export validation schema
 */
export const exportLeadsSchema = Joi.object({
  format: Joi.string()
    .valid('csv', 'xlsx')
    .default('csv')
    .messages({
      'any.only': 'Format must be either csv or xlsx',
    }),

  filters: leadFiltersSchema.optional(),
});