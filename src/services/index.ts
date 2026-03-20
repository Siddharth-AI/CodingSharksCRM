// Import service classes and instances for local use
import { BaseService, ServiceError, withErrorHandling } from './baseService';
import { LeadService, leadService } from './leadService';
import { CourseService, courseService } from './courseService';
import { MessageService, messageService } from './messageService';
import { TemplateService, templateService } from './templateService';
import { ActivityService, activityService } from './activityService';
import { DashboardService, dashboardService } from './dashboardService';

// Export all service classes and instances
export { BaseService, ServiceError, withErrorHandling };
export { LeadService, leadService };
export { CourseService, courseService };
export { MessageService, messageService };
export { TemplateService, templateService };
export { ActivityService, activityService };
export { DashboardService, dashboardService };

// Export service response types
export type { ServiceResponse } from './baseService';

// Convenience object for accessing all services
export const services = {
  lead: leadService,
  course: courseService,
  message: messageService,
  template: templateService,
  activity: activityService,
  dashboard: dashboardService,
};

// Service factory for creating new instances (useful for testing)
export const createServices = () => ({
  lead: new LeadService(),
  course: new CourseService(),
  message: new MessageService(),
  template: new TemplateService(),
  activity: new ActivityService(),
  dashboard: new DashboardService(),
});

// Type definitions for service collections
export type Services = typeof services;
export type ServiceKeys = keyof Services;

// Helper function to get service by key
export function getService<K extends ServiceKeys>(key: K): Services[K] {
  return services[key];
}

// Service health check utility
export async function checkServiceHealth(): Promise<{
  healthy: boolean;
  services: Record<string, { status: 'ok' | 'error'; error?: string }>;
}> {
  const results: Record<string, { status: 'ok' | 'error'; error?: string }> = {};
  let allHealthy = true;

  // Test each service with a simple health check
  const serviceTests = [
    { name: 'lead', test: () => leadService.getStatistics() },
    { name: 'course', test: () => courseService.getActive() },
    { name: 'message', test: () => messageService.getDeliveryStats() },
    { name: 'template', test: () => templateService.getActive() },
    { name: 'activity', test: () => activityService.getSummary() },
    { name: 'dashboard', test: () => dashboardService.getRealTimeStats() },
  ];

  await Promise.allSettled(
    serviceTests.map(async ({ name, test }) => {
      try {
        await test();
        results[name] = { status: 'ok' };
      } catch (error: any) {
        results[name] = { 
          status: 'error', 
          error: error.message || 'Unknown error' 
        };
        allHealthy = false;
      }
    })
  );

  return {
    healthy: allHealthy,
    services: results,
  };
}

// Service configuration interface
export interface ServiceConfig {
  baseURL?: string;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}

// Global service configuration
let globalConfig: ServiceConfig = {};

export function configureServices(config: ServiceConfig): void {
  globalConfig = { ...globalConfig, ...config };
  // Apply configuration to existing services if needed
}

export function getServiceConfig(): ServiceConfig {
  return { ...globalConfig };
}