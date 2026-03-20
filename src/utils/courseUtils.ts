import { Course, Lead } from '@/types';

/**
 * Course filtering and search utilities
 */

/**
 * Filter courses based on search criteria
 */
export const filterCourses = (
  courses: Course[],
  filters: {
    isActive?: boolean;
    priceMin?: number;
    priceMax?: number;
    search?: string;
  }
): Course[] => {
  return courses.filter(course => {
    // Active status filter
    if (filters.isActive !== undefined && course.isActive !== filters.isActive) {
      return false;
    }

    // Price range filter
    if (filters.priceMin !== undefined && (course.price ?? 0) < filters.priceMin) {
      return false;
    }
    if (filters.priceMax !== undefined && (course.price ?? 0) > filters.priceMax) {
      return false;
    }

    // Search filter (name and description)
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      const searchableFields = [
        course.name.toLowerCase(),
        course.description.toLowerCase(),
      ];
      
      if (!searchableFields.some(field => field.includes(searchTerm))) {
        return false;
      }
    }

    return true;
  });
};

/**
 * Sort courses by specified criteria
 */
export const sortCourses = (
  courses: Course[], 
  sortBy: keyof Course = 'name', 
  sortOrder: 'asc' | 'desc' = 'asc'
): Course[] => {
  return [...courses].sort((a, b) => {
    const aValue = a[sortBy];
    const bValue = b[sortBy];

    // Handle date sorting
    if (aValue instanceof Date && bValue instanceof Date) {
      return sortOrder === 'asc' 
        ? aValue.getTime() - bValue.getTime()
        : bValue.getTime() - aValue.getTime();
    }

    // Handle string sorting
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortOrder === 'asc'
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }

    // Handle number sorting
    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
    }

    // Handle boolean sorting
    if (typeof aValue === 'boolean' && typeof bValue === 'boolean') {
      return sortOrder === 'asc' 
        ? (aValue === bValue ? 0 : aValue ? 1 : -1)
        : (aValue === bValue ? 0 : aValue ? -1 : 1);
    }

    return 0;
  });
};

/**
 * Calculate course statistics
 */
export const calculateCourseStats = (courses: Course[], leads?: Lead[]) => {
  const total = courses.length;
  const active = courses.filter(course => course.isActive).length;
  const inactive = total - active;

  // Price statistics
  const prices = courses.map(course => course.price ?? 0);
  const priceStats = {
    min: prices.length > 0 ? Math.min(...prices) : 0,
    max: prices.length > 0 ? Math.max(...prices) : 0,
    average: prices.length > 0 ? prices.reduce((sum, price) => sum + price, 0) / prices.length : 0,
  };

  // Lead interest statistics (if leads provided)
  let leadInterestStats = {};
  if (leads) {
    const courseInterestCount = leads.reduce((acc, lead) => {
      const course = lead.courseInterest;
      acc[course] = (acc[course] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    leadInterestStats = {
      mostPopular: Object.entries(courseInterestCount)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([course, count]) => ({ course, count })),
      totalInterest: Object.values(courseInterestCount).reduce((sum, count) => sum + count, 0),
    };
  }

  return {
    total,
    active,
    inactive,
    priceStats: {
      ...priceStats,
      average: Math.round(priceStats.average * 100) / 100, // Round to 2 decimal places
    },
    ...leadInterestStats,
  };
};

/**
 * Get popular courses based on lead interest
 */
export const getPopularCourses = (courses: Course[], leads: Lead[], limit: number = 10): Array<{
  course: Course;
  leadCount: number;
  conversionRate: number;
}> => {
  // Count leads by course interest
  const courseInterestCount = leads.reduce((acc, lead) => {
    acc[lead.courseInterest] = (acc[lead.courseInterest] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Count converted leads by course interest
  const convertedLeadsCount = leads
    .filter(lead => lead.stage === 'converted')
    .reduce((acc, lead) => {
      acc[lead.courseInterest] = (acc[lead.courseInterest] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

  // Map courses with their popularity metrics
  const coursesWithStats = courses.map(course => {
    const leadCount = courseInterestCount[course.name] || 0;
    const convertedCount = convertedLeadsCount[course.name] || 0;
    const conversionRate = leadCount > 0 ? (convertedCount / leadCount) * 100 : 0;

    return {
      course,
      leadCount,
      conversionRate: Math.round(conversionRate * 100) / 100,
    };
  });

  // Sort by lead count and return top courses
  return coursesWithStats
    .sort((a, b) => b.leadCount - a.leadCount)
    .slice(0, limit);
};

/**
 * Format course data for CSV export
 */
export const formatCoursesForExport = (courses: Course[]): string => {
  const headers = [
    'ID',
    'Name',
    'Description',
    'Duration',
    'Price',
    'Is Active',
    'Created At',
    'Updated At'
  ];

  const csvRows = [
    headers.join(','),
    ...courses.map(course => [
      course.id,
      `"${course.name.replace(/"/g, '""')}"`,
      `"${course.description.replace(/"/g, '""')}"`,
      `"${course.duration}"`,
      course.price != null ? course.price.toString() : '',
      course.isActive.toString(),
      new Date(course.createdAt).toISOString(),
      new Date(course.updatedAt).toISOString()
    ].join(','))
  ];

  return csvRows.join('\n');
};

/**
 * Format course data for JSON export
 */
export const formatCoursesForJsonExport = (courses: Course[]): string => {
  const exportData = {
    exportDate: new Date().toISOString(),
    totalCourses: courses.length,
    courses: courses.map(course => ({
      id: course.id,
      name: course.name,
      description: course.description,
      duration: course.duration,
      price: course.price,
      isActive: course.isActive,
      createdAt: course.createdAt,
      updatedAt: course.updatedAt,
    })),
  };

  return JSON.stringify(exportData, null, 2);
};

/**
 * Validate course import data
 */
export const validateCourseImportData = (data: any[]): {
  valid: any[];
  invalid: Array<{ data: any; errors: string[] }>;
} => {
  const valid: any[] = [];
  const invalid: Array<{ data: any; errors: string[] }> = [];

  data.forEach(item => {
    const errors: string[] = [];

    // Validate required fields
    if (!item.name || typeof item.name !== 'string' || item.name.trim().length < 2) {
      errors.push('Name is required and must be at least 2 characters');
    }

    if (!item.description || typeof item.description !== 'string' || item.description.trim().length < 10) {
      errors.push('Description is required and must be at least 10 characters');
    }

    if (!item.duration || typeof item.duration !== 'string') {
      errors.push('Duration is required');
    }

    if (item.price !== undefined && (typeof item.price !== 'number' || item.price < 0)) {
      errors.push('Price must be a non-negative number');
    }

    if (errors.length === 0) {
      valid.push(item);
    } else {
      invalid.push({ data: item, errors });
    }
  });

  return { valid, invalid };
};

/**
 * Generate course slug from name
 */
export const generateCourseSlug = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .trim();
};

/**
 * Calculate course duration in hours (if duration format is standardized)
 */
export const parseDurationToHours = (duration: string): number | null => {
  const durationLower = duration.toLowerCase();
  
  // Match patterns like "8 weeks", "3 months", "40 hours"
  const weekMatch = durationLower.match(/(\d+)\s*weeks?/);
  if (weekMatch) {
    return parseInt(weekMatch[1]) * 40; // Assume 40 hours per week
  }

  const monthMatch = durationLower.match(/(\d+)\s*months?/);
  if (monthMatch) {
    return parseInt(monthMatch[1]) * 160; // Assume 160 hours per month
  }

  const hourMatch = durationLower.match(/(\d+)\s*hours?/);
  if (hourMatch) {
    return parseInt(hourMatch[1]);
  }

  const dayMatch = durationLower.match(/(\d+)\s*days?/);
  if (dayMatch) {
    return parseInt(dayMatch[1]) * 8; // Assume 8 hours per day
  }

  return null; // Cannot parse duration
};

/**
 * Get course recommendations based on lead interests
 */
export const getCourseRecommendations = (
  courses: Course[],
  leads: Lead[]
): Course[] => {
  const filteredCourses = courses.filter(course => course.isActive);
  const popularCourses = getPopularCourses(filteredCourses, leads, 5);
  
  return popularCourses.map(item => item.course);
};

/**
 * Check if course name is unique
 */
export const isCourseNameUnique = (courses: Course[], name: string, excludeId?: string): boolean => {
  return !courses.some(course => 
    course.name.toLowerCase() === name.toLowerCase() && 
    course.id !== excludeId
  );
};