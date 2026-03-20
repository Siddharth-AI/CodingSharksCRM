import Joi from 'joi';
import { CourseType } from '@/types';

/**
 * Course creation validation schema
 */
export const createCourseSchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(2)
    .max(100)
    .required()
    .messages({
      'string.empty': 'Course name is required',
      'string.min': 'Course name must be at least 2 characters long',
      'string.max': 'Course name cannot exceed 100 characters',
    }),

  description: Joi.string()
    .trim()
    .min(10)
    .max(1000)
    .required()
    .messages({
      'string.empty': 'Course description is required',
      'string.min': 'Course description must be at least 10 characters long',
      'string.max': 'Course description cannot exceed 1000 characters',
    }),

  duration: Joi.string()
    .trim()
    .min(1)
    .max(50)
    .required()
    .messages({
      'string.empty': 'Course duration is required',
      'string.max': 'Course duration cannot exceed 50 characters',
    }),

  price: Joi.number()
    .min(0)
    .max(1000000)
    .optional()
    .allow(null)
    .messages({
      'number.base': 'Price must be a number',
      'number.min': 'Price cannot be negative',
      'number.max': 'Price cannot exceed 1,000,000',
    }),

  courseType: Joi.string()
    .valid(...Object.values(CourseType))
    .optional()
    .default('regular')
    .messages({
      'any.only': 'Course type must be one of: regular, workshop',
    }),
});

/**
 * Course update validation schema
 */
export const updateCourseSchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(2)
    .max(100)
    .optional()
    .messages({
      'string.min': 'Course name must be at least 2 characters long',
      'string.max': 'Course name cannot exceed 100 characters',
    }),

  description: Joi.string()
    .trim()
    .min(10)
    .max(1000)
    .optional()
    .messages({
      'string.min': 'Course description must be at least 10 characters long',
      'string.max': 'Course description cannot exceed 1000 characters',
    }),

  duration: Joi.string()
    .trim()
    .min(1)
    .max(50)
    .optional()
    .messages({
      'string.max': 'Course duration cannot exceed 50 characters',
    }),

  price: Joi.number()
    .min(0)
    .max(1000000)
    .optional()
    .messages({
      'number.base': 'Price must be a number',
      'number.min': 'Price cannot be negative',
      'number.max': 'Price cannot exceed 1,000,000',
    }),

  courseType: Joi.string()
    .valid(...Object.values(CourseType))
    .optional()
    .messages({
      'any.only': 'Course type must be one of: regular, workshop',
    }),

  isActive: Joi.boolean()
    .optional()
    .messages({
      'boolean.base': 'isActive must be a boolean value',
    }),
}).min(1).messages({
  'object.min': 'At least one field must be provided for update',
});

/**
 * Course filtering validation schema
 */
export const courseFiltersSchema = Joi.object({
  isActive: Joi.boolean()
    .optional(),

  priceMin: Joi.number()
    .min(0)
    .optional()
    .messages({
      'number.min': 'Minimum price cannot be negative',
    }),

  priceMax: Joi.number()
    .min(0)
    .when('priceMin', {
      is: Joi.exist(),
      then: Joi.number().min(Joi.ref('priceMin')),
      otherwise: Joi.number(),
    })
    .optional()
    .messages({
      'number.min': 'Maximum price must be greater than or equal to minimum price',
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
 * Course activation/deactivation validation schema
 */
export const courseActivationSchema = Joi.object({
  isActive: Joi.boolean()
    .required()
    .messages({
      'boolean.base': 'isActive must be a boolean value',
      'any.required': 'isActive field is required',
    }),
});

/**
 * Course template association validation schema
 */
export const courseTemplateAssociationSchema = Joi.object({
  templateIds: Joi.array()
    .items(
      Joi.string()
        .uuid()
        .messages({
          'string.uuid': 'Each template ID must be a valid UUID',
        })
    )
    .min(0)
    .max(20)
    .required()
    .messages({
      'array.max': 'Cannot associate more than 20 templates with a course',
      'any.required': 'Template IDs array is required',
    }),
});

/**
 * Course statistics validation schema
 */
export const courseStatsFiltersSchema = Joi.object({
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
});

/**
 * Bulk course operations validation schema
 */
export const bulkCourseOperationSchema = Joi.object({
  courseIds: Joi.array()
    .items(
      Joi.string()
        .uuid()
        .messages({
          'string.uuid': 'Each course ID must be a valid UUID',
        })
    )
    .min(1)
    .max(50)
    .required()
    .messages({
      'array.min': 'At least one course ID is required',
      'array.max': 'Cannot operate on more than 50 courses at once',
      'any.required': 'Course IDs array is required',
    }),

  operation: Joi.string()
    .valid('activate', 'deactivate', 'delete')
    .required()
    .messages({
      'any.only': 'Operation must be one of: activate, deactivate, delete',
      'any.required': 'Operation is required',
    }),
});

/**
 * Course import validation schema
 */
export const courseImportSchema = Joi.object({
  courses: Joi.array()
    .items(createCourseSchema)
    .min(1)
    .max(100)
    .required()
    .messages({
      'array.min': 'At least one course is required for import',
      'array.max': 'Cannot import more than 100 courses at once',
      'any.required': 'Courses array is required',
    }),

  overwriteExisting: Joi.boolean()
    .default(false)
    .messages({
      'boolean.base': 'overwriteExisting must be a boolean value',
    }),
});

/**
 * Course export validation schema
 */
export const courseExportSchema = Joi.object({
  format: Joi.string()
    .valid('csv', 'json')
    .default('csv')
    .messages({
      'any.only': 'Format must be either csv or json',
    }),

  filters: courseFiltersSchema.optional(),

  includeInactive: Joi.boolean()
    .default(false)
    .messages({
      'boolean.base': 'includeInactive must be a boolean value',
    }),
});

/**
 * Course popularity validation schema
 */
export const coursePopularitySchema = Joi.object({
  period: Joi.string()
    .valid('week', 'month', 'quarter', 'year')
    .default('month')
    .messages({
      'any.only': 'Period must be one of: week, month, quarter, year',
    }),

  limit: Joi.number()
    .integer()
    .min(1)
    .max(50)
    .default(10)
    .messages({
      'number.integer': 'Limit must be an integer',
      'number.min': 'Limit must be at least 1',
      'number.max': 'Limit cannot exceed 50',
    }),
});