import Joi from 'joi';
import { LeadSource, TemplateType } from '@/types';

// Lead validation schemas
export const createLeadSchema = Joi.object({
  name: Joi.string()
    .min(2)
    .max(100)
    .required()
    .messages({
      'string.empty': 'Name is required',
      'string.min': 'Name must be at least 2 characters',
      'string.max': 'Name cannot exceed 100 characters',
    }),
  
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.empty': 'Email is required',
      'string.email': 'Please enter a valid email address',
    }),
  
  mobile: Joi.string()
    .pattern(/^(\+91)?[6-9]\d{9}$/)
    .required()
    .messages({
      'string.empty': 'Mobile number is required',
      'string.pattern.base': 'Please enter a valid Indian mobile number',
    }),
  
  courseInterest: Joi.string()
    .required()
    .messages({
      'string.empty': 'Course interest is required',
    }),
  
  source: Joi.string()
    .valid(...Object.values(LeadSource))
    .required()
    .messages({
      'string.empty': 'Lead source is required',
      'any.only': 'Please select a valid lead source',
    }),
  
  notes: Joi.string()
    .max(1000)
    .optional()
    .allow('')
    .messages({
      'string.max': 'Notes cannot exceed 1000 characters',
    }),
});

export const updateLeadSchema = Joi.object({
  name: Joi.string()
    .min(2)
    .max(100)
    .optional()
    .messages({
      'string.min': 'Name must be at least 2 characters',
      'string.max': 'Name cannot exceed 100 characters',
    }),
  
  email: Joi.string()
    .email()
    .optional()
    .messages({
      'string.email': 'Please enter a valid email address',
    }),
  
  mobile: Joi.string()
    .pattern(/^(\+91)?[6-9]\d{9}$/)
    .optional()
    .messages({
      'string.pattern.base': 'Please enter a valid Indian mobile number',
    }),
  
  courseInterest: Joi.string().optional(),
  
  stage: Joi.string()
    .valid('new', 'contacted', 'interested', 'converted')
    .optional(),
  
  notes: Joi.string()
    .max(1000)
    .optional()
    .allow('')
    .messages({
      'string.max': 'Notes cannot exceed 1000 characters',
    }),
  
});

// Course validation schemas
export const createCourseSchema = Joi.object({
  name: Joi.string()
    .min(3)
    .max(100)
    .required()
    .messages({
      'string.empty': 'Course name is required',
      'string.min': 'Course name must be at least 3 characters',
      'string.max': 'Course name cannot exceed 100 characters',
    }),
  
  description: Joi.string()
    .max(500)
    .required()
    .messages({
      'string.empty': 'Course description is required',
      'string.max': 'Description cannot exceed 500 characters',
    }),
  
  duration: Joi.string()
    .min(1)
    .max(50)
    .required()
    .messages({
      'string.empty': 'Course duration is required',
      'string.max': 'Duration cannot exceed 50 characters',
    }),
  
  price: Joi.number()
    .min(0)
    .max(1000000)
    .required()
    .messages({
      'number.base': 'Price must be a valid number',
      'number.min': 'Price cannot be negative',
      'number.max': 'Price cannot exceed 10,00,000',
      'any.required': 'Course price is required',
    }),
  
});

export const updateCourseSchema = Joi.object({
  name: Joi.string()
    .min(3)
    .max(100)
    .optional()
    .messages({
      'string.min': 'Course name must be at least 3 characters',
      'string.max': 'Course name cannot exceed 100 characters',
    }),
  
  description: Joi.string()
    .max(500)
    .optional()
    .messages({
      'string.max': 'Description cannot exceed 500 characters',
    }),
  
  duration: Joi.string()
    .min(1)
    .max(50)
    .optional()
    .messages({
      'string.max': 'Duration cannot exceed 50 characters',
    }),
  
  price: Joi.number()
    .min(0)
    .max(1000000)
    .optional()
    .messages({
      'number.base': 'Price must be a valid number',
      'number.min': 'Price cannot be negative',
      'number.max': 'Price cannot exceed 10,00,000',
    }),
  
  isActive: Joi.boolean().optional(),
});

// Message template validation schemas
export const createMessageTemplateSchema = Joi.object({
  courseId: Joi.string()
    .required()
    .messages({
      'string.empty': 'Course ID is required',
    }),
  
  type: Joi.string()
    .valid(...Object.values(TemplateType))
    .required()
    .messages({
      'string.empty': 'Template type is required',
      'any.only': 'Please select a valid template type',
    }),
  
  name: Joi.string()
    .min(3)
    .max(100)
    .required()
    .messages({
      'string.empty': 'Template name is required',
      'string.min': 'Template name must be at least 3 characters',
      'string.max': 'Template name cannot exceed 100 characters',
    }),
  
  content: Joi.string()
    .min(10)
    .max(1000)
    .required()
    .messages({
      'string.empty': 'Template content is required',
      'string.min': 'Template content must be at least 10 characters',
      'string.max': 'Template content cannot exceed 1000 characters',
    }),
  
  variables: Joi.array()
    .items(Joi.string().min(2).max(20))
    .optional()
    .default([])
    .messages({
      'array.base': 'Variables must be an array',
    }),
});

export const updateMessageTemplateSchema = Joi.object({
  name: Joi.string()
    .min(3)
    .max(100)
    .optional()
    .messages({
      'string.min': 'Template name must be at least 3 characters',
      'string.max': 'Template name cannot exceed 100 characters',
    }),
  
  content: Joi.string()
    .min(10)
    .max(1000)
    .optional()
    .messages({
      'string.min': 'Template content must be at least 10 characters',
      'string.max': 'Template content cannot exceed 1000 characters',
    }),
  
  variables: Joi.array()
    .items(Joi.string().min(2).max(20))
    .optional()
    .messages({
      'array.base': 'Variables must be an array',
    }),
  
  isActive: Joi.boolean().optional(),
});

// Authentication validation schemas
export const loginSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.empty': 'Email is required',
      'string.email': 'Please enter a valid email address',
    }),
  
  password: Joi.string()
    .min(6)
    .required()
    .messages({
      'string.empty': 'Password is required',
      'string.min': 'Password must be at least 6 characters',
    }),
});

export const createAdminUserSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.empty': 'Email is required',
      'string.email': 'Please enter a valid email address',
    }),
  
  name: Joi.string()
    .min(2)
    .max(100)
    .required()
    .messages({
      'string.empty': 'Name is required',
      'string.min': 'Name must be at least 2 characters',
      'string.max': 'Name cannot exceed 100 characters',
    }),
  
  password: Joi.string()
    .min(8)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>])/)
    .required()
    .messages({
      'string.empty': 'Password is required',
      'string.min': 'Password must be at least 8 characters',
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
    }),
});

export const updateAdminUserSchema = Joi.object({
  name: Joi.string()
    .min(2)
    .max(100)
    .optional()
    .messages({
      'string.min': 'Name must be at least 2 characters',
      'string.max': 'Name cannot exceed 100 characters',
    }),
  
  email: Joi.string()
    .email()
    .optional()
    .messages({
      'string.email': 'Please enter a valid email address',
    }),
  
  password: Joi.string()
    .min(8)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>])/)
    .optional()
    .messages({
      'string.min': 'Password must be at least 8 characters',
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
    }),
  
  isActive: Joi.boolean().optional(),
});

// Message validation schema
export const createMessageSchema = Joi.object({
  leadId: Joi.string()
    .required()
    .messages({
      'string.empty': 'Lead ID is required',
    }),
  
  templateId: Joi.string().optional().allow(null),
  
  content: Joi.string()
    .min(1)
    .max(1000)
    .required()
    .messages({
      'string.empty': 'Message content is required',
      'string.max': 'Message content cannot exceed 1000 characters',
    }),
});

// Utility function to format validation errors
export const formatValidationError = (error: Joi.ValidationError): string => {
  return error.details.map(detail => detail.message).join(', ');
};

// Utility function to validate data
export const validateData = <T>(schema: Joi.ObjectSchema, data: any): { isValid: boolean; error?: string; value?: T } => {
  const { error, value } = schema.validate(data, { abortEarly: false });
  
  if (error) {
    return {
      isValid: false,
      error: formatValidationError(error),
    };
  }
  
  return {
    isValid: true,
    value: value as T,
  };
};