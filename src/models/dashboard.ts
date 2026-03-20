import Joi from 'joi';
import { DashboardStats, TrendData, ConversionData } from '@/types';

/**
 * Dashboard Statistics Models
 * Handles dashboard data validation and calculations
 */

// Joi validation schemas
export const dateRangeSchema = Joi.object({
  from: Joi.date().required(),
  to: Joi.date().min(Joi.ref('from')).required(),
});

export const dashboardStatsRequestSchema = Joi.object({
  from: Joi.date().required(),
  to: Joi.date().min(Joi.ref('from')).required(),
  courseId: Joi.string().uuid().optional(),
  source: Joi.string().optional(),
});

export const trendPeriodSchema = Joi.object({
  period: Joi.string().valid('daily', 'weekly', 'monthly').required(),
  from: Joi.date().required(),
  to: Joi.date().min(Joi.ref('from')).required(),
});

/**
 * Validate date range
 */
export function validateDateRange(data: any): {
  error?: Joi.ValidationError;
  value?: any;
} {
  return dateRangeSchema.validate(data, { abortEarly: false });
}

/**
 * Validate dashboard stats request
 */
export function validateDashboardStatsRequest(data: any): {
  error?: Joi.ValidationError;
  value?: any;
} {
  return dashboardStatsRequestSchema.validate(data, { abortEarly: false });
}

/**
 * Validate trend period request
 */
export function validateTrendPeriod(data: any): {
  error?: Joi.ValidationError;
  value?: any;
} {
  return trendPeriodSchema.validate(data, { abortEarly: false });
}

/**
 * Calculate conversion rate
 */
export function calculateConversionRate(converted: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((converted / total) * 100 * 100) / 100; // Round to 2 decimal places
}

/**
 * Calculate percentage change
 */
export function calculatePercentageChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100 * 100) / 100;
}

/**
 * Calculate average
 */
export function calculateAverage(values: number[]): number {
  if (values.length === 0) return 0;
  const sum = values.reduce((acc, val) => acc + val, 0);
  return Math.round((sum / values.length) * 100) / 100;
}

/**
 * Calculate median
 */
export function calculateMedian(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

/**
 * Calculate growth rate
 */
export function calculateGrowthRate(current: number, previous: number): {
  rate: number;
  direction: 'up' | 'down' | 'stable';
} {
  const rate = calculatePercentageChange(current, previous);
  let direction: 'up' | 'down' | 'stable' = 'stable';
  
  if (rate > 0) direction = 'up';
  else if (rate < 0) direction = 'down';
  
  return { rate, direction };
}

/**
 * Format currency
 */
export function formatCurrency(amount: number, currency: string = 'INR'): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format percentage
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Format large numbers
 */
export function formatNumber(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return value.toString();
}

/**
 * Get date range presets
 */
export function getDateRangePresets(): Record<string, { from: Date; to: Date }> {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  return {
    today: {
      from: today,
      to: now,
    },
    yesterday: {
      from: new Date(today.getTime() - 24 * 60 * 60 * 1000),
      to: new Date(today.getTime() - 1),
    },
    last7Days: {
      from: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000),
      to: now,
    },
    last30Days: {
      from: new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000),
      to: now,
    },
    thisMonth: {
      from: new Date(now.getFullYear(), now.getMonth(), 1),
      to: now,
    },
    lastMonth: {
      from: new Date(now.getFullYear(), now.getMonth() - 1, 1),
      to: new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59),
    },
    thisYear: {
      from: new Date(now.getFullYear(), 0, 1),
      to: now,
    },
  };
}

/**
 * Generate trend data points
 */
export function generateTrendDataPoints(
  from: Date,
  to: Date,
  period: 'daily' | 'weekly' | 'monthly'
): Date[] {
  const points: Date[] = [];
  const current = new Date(from);
  
  while (current <= to) {
    points.push(new Date(current));
    
    switch (period) {
      case 'daily':
        current.setDate(current.getDate() + 1);
        break;
      case 'weekly':
        current.setDate(current.getDate() + 7);
        break;
      case 'monthly':
        current.setMonth(current.getMonth() + 1);
        break;
    }
  }
  
  return points;
}

/**
 * Calculate time to conversion (in days)
 */
export function calculateTimeToConversion(createdAt: Date, convertedAt: Date): number {
  const diffMs = convertedAt.getTime() - createdAt.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Group data by period
 */
export function groupByPeriod<T extends { date: Date }>(
  data: T[],
  period: 'daily' | 'weekly' | 'monthly'
): Record<string, T[]> {
  const grouped: Record<string, T[]> = {};
  
  data.forEach(item => {
    let key: string;
    
    switch (period) {
      case 'daily':
        key = item.date.toISOString().split('T')[0];
        break;
      case 'weekly':
        const weekStart = new Date(item.date);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        key = weekStart.toISOString().split('T')[0];
        break;
      case 'monthly':
        key = `${item.date.getFullYear()}-${String(item.date.getMonth() + 1).padStart(2, '0')}`;
        break;
    }
    
    if (!grouped[key]) {
      grouped[key] = [];
    }
    grouped[key].push(item);
  });
  
  return grouped;
}

/**
 * Calculate stage distribution
 */
export function calculateStageDistribution(
  byStage: Record<string, number>
): Array<{ stage: string; count: number; percentage: number }> {
  const total = Object.values(byStage).reduce((sum, count) => sum + count, 0);
  
  return Object.entries(byStage).map(([stage, count]) => ({
    stage,
    count,
    percentage: total > 0 ? Math.round((count / total) * 100 * 100) / 100 : 0,
  }));
}

/**
 * Calculate funnel metrics
 */
export function calculateFunnelMetrics(stages: Array<{ stage: string; count: number }>): {
  stages: Array<{
    stage: string;
    count: number;
    percentage: number;
    dropoffRate: number;
  }>;
  overallConversionRate: number;
} {
  if (stages.length === 0) {
    return { stages: [], overallConversionRate: 0 };
  }
  
  const firstStageCount = stages[0].count;
  const lastStageCount = stages[stages.length - 1].count;
  
  const enrichedStages = stages.map((stage, index) => {
    const percentage = firstStageCount > 0 
      ? Math.round((stage.count / firstStageCount) * 100 * 100) / 100 
      : 0;
    
    const dropoffRate = index > 0 && stages[index - 1].count > 0
      ? Math.round(((stages[index - 1].count - stage.count) / stages[index - 1].count) * 100 * 100) / 100
      : 0;
    
    return {
      stage: stage.stage,
      count: stage.count,
      percentage,
      dropoffRate,
    };
  });
  
  const overallConversionRate = calculateConversionRate(lastStageCount, firstStageCount);
  
  return {
    stages: enrichedStages,
    overallConversionRate,
  };
}

/**
 * Calculate message delivery metrics
 */
export function calculateMessageMetrics(stats: {
  sent: number;
  delivered: number;
  read: number;
  failed: number;
}): {
  deliveryRate: number;
  readRate: number;
  failureRate: number;
  engagement: number;
} {
  const total = stats.sent + stats.failed;
  
  return {
    deliveryRate: calculateConversionRate(stats.delivered, stats.sent),
    readRate: calculateConversionRate(stats.read, stats.delivered),
    failureRate: calculateConversionRate(stats.failed, total),
    engagement: calculateConversionRate(stats.read, stats.sent),
  };
}
