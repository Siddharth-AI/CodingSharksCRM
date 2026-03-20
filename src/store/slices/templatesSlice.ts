import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { MessageTemplate, TemplateType, PaginationState } from '@/types';
import { api } from '../api';

interface TemplatesState {
  items: MessageTemplate[];
  selectedTemplate: MessageTemplate | null;
  isLoading: boolean;
  error: string | null;
  pagination: PaginationState;
  filters: {
    courseId?: string;
    type?: TemplateType;
    isActive?: boolean;
    search?: string;
  };
  previewData: {
    template: MessageTemplate | null;
    content: string | null;
    isLoading: boolean;
    leadId?: string;
    courseId?: string;
    customVariables?: Record<string, string>;
  };
  statistics: {
    total: number;
    active: number;
    byType: Record<TemplateType, number>;
    byCourse: Record<string, number>;
    performance: {
      topPerforming: Array<{
        templateId: string;
        name: string;
        messagesSent: number;
        deliveryRate: number;
        readRate: number;
      }>;
      underperforming: Array<{
        templateId: string;
        name: string;
        messagesSent: number;
        deliveryRate: number;
        readRate: number;
      }>;
    };
    lastUpdated: Date | null;
  };
  bulkOperations: {
    selectedIds: string[];
    isProcessing: boolean;
    lastOperation: string | null;
  };
}

const initialState: TemplatesState = {
  items: [],
  selectedTemplate: null,
  isLoading: false,
  error: null,
  pagination: {
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  },
  filters: {},
  previewData: {
    template: null,
    content: null,
    isLoading: false,
  },
  statistics: {
    total: 0,
    active: 0,
    byType: {
      [TemplateType.WELCOME]: 0,
      [TemplateType.FOLLOW_UP_DAY_1]: 0,
      [TemplateType.FOLLOW_UP_DAY_2]: 0,
      [TemplateType.FOLLOW_UP_DAY_3]: 0,
      [TemplateType.CUSTOM]: 0,
    },
    byCourse: {},
    performance: {
      topPerforming: [],
      underperforming: [],
    },
    lastUpdated: null,
  },
  bulkOperations: {
    selectedIds: [],
    isProcessing: false,
    lastOperation: null,
  },
};

const templatesSlice = createSlice({
  name: 'templates',
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    setTemplates: (state, action: PayloadAction<MessageTemplate[]>) => {
      state.items = action.payload;
    },
    addTemplate: (state, action: PayloadAction<MessageTemplate>) => {
      state.items.unshift(action.payload);
    },
    updateTemplate: (state, action: PayloadAction<MessageTemplate>) => {
      const index = state.items.findIndex(template => template.id === action.payload.id);
      if (index !== -1) {
        state.items[index] = action.payload;
      }
      if (state.selectedTemplate?.id === action.payload.id) {
        state.selectedTemplate = action.payload;
      }
    },
    removeTemplate: (state, action: PayloadAction<string>) => {
      state.items = state.items.filter(template => template.id !== action.payload);
      if (state.selectedTemplate?.id === action.payload) {
        state.selectedTemplate = null;
      }
    },
    setSelectedTemplate: (state, action: PayloadAction<MessageTemplate | null>) => {
      state.selectedTemplate = action.payload;
    },
    clearTemplates: (state) => {
      state.items = [];
      state.selectedTemplate = null;
      state.pagination = initialState.pagination;
    },
    setPagination: (state, action: PayloadAction<PaginationState>) => {
      state.pagination = action.payload;
    },
    setFilters: (state, action: PayloadAction<TemplatesState['filters']>) => {
      state.filters = action.payload;
    },
    clearFilters: (state) => {
      state.filters = {};
    },
    toggleTemplateActive: (state, action: PayloadAction<string>) => {
      const template = state.items.find(t => t.id === action.payload);
      if (template) {
        template.isActive = !template.isActive;
        template.updatedAt = new Date();
      }
    },
    // Preview functionality
    setPreviewLoading: (state, action: PayloadAction<boolean>) => {
      state.previewData.isLoading = action.payload;
    },
    setPreviewContent: (state, action: PayloadAction<{ 
      template: MessageTemplate; 
      content: string;
      leadId?: string;
      courseId?: string;
      customVariables?: Record<string, string>;
    }>) => {
      state.previewData.template = action.payload.template;
      state.previewData.content = action.payload.content;
      state.previewData.leadId = action.payload.leadId;
      state.previewData.courseId = action.payload.courseId;
      state.previewData.customVariables = action.payload.customVariables;
      state.previewData.isLoading = false;
    },
    clearPreview: (state) => {
      state.previewData = {
        template: null,
        content: null,
        isLoading: false,
      };
    },
    // Statistics
    setStatistics: (state, action: PayloadAction<Partial<TemplatesState['statistics']>>) => {
      state.statistics = { ...state.statistics, ...action.payload, lastUpdated: new Date() };
    },
    // Bulk operations
    setBulkSelectedIds: (state, action: PayloadAction<string[]>) => {
      state.bulkOperations.selectedIds = action.payload;
    },
    toggleBulkSelection: (state, action: PayloadAction<string>) => {
      const id = action.payload;
      const index = state.bulkOperations.selectedIds.indexOf(id);
      if (index === -1) {
        state.bulkOperations.selectedIds.push(id);
      } else {
        state.bulkOperations.selectedIds.splice(index, 1);
      }
    },
    selectAllTemplates: (state) => {
      state.bulkOperations.selectedIds = state.items.map(t => t.id);
    },
    clearBulkSelection: (state) => {
      state.bulkOperations.selectedIds = [];
    },
    setBulkProcessing: (state, action: PayloadAction<boolean>) => {
      state.bulkOperations.isProcessing = action.payload;
    },
    setBulkLastOperation: (state, action: PayloadAction<string | null>) => {
      state.bulkOperations.lastOperation = action.payload;
    },
    // Bulk update templates
    bulkUpdateTemplates: (state, action: PayloadAction<{ ids: string[]; updates: Partial<MessageTemplate> }>) => {
      const { ids, updates } = action.payload;
      state.items = state.items.map(template => 
        ids.includes(template.id) ? { ...template, ...updates, updatedAt: new Date() } : template
      );
    },
  },
  extraReducers: (builder) => {
    // RTK Query integration
    builder
      // Get templates
      .addMatcher(api.endpoints.getTemplates?.matchPending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addMatcher(api.endpoints.getTemplates?.matchFulfilled, (state, action) => {
        state.isLoading = false;
        state.items = action.payload.data;
        state.pagination = action.payload.pagination;
      })
      .addMatcher(api.endpoints.getTemplates?.matchRejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch templates';
      })
      // Create template
      .addMatcher(api.endpoints.createTemplate?.matchPending, (state) => {
        state.error = null;
      })
      .addMatcher(api.endpoints.createTemplate?.matchFulfilled, (state, action) => {
        const newTemplate = action.payload.data;
        if (!newTemplate) return;
        state.items.unshift(newTemplate);
      })
      .addMatcher(api.endpoints.createTemplate?.matchRejected, (state, action) => {
        state.error = action.error.message || 'Failed to create template';
      })
      // Update template
      .addMatcher(api.endpoints.updateTemplate?.matchFulfilled, (state, action) => {
        const updatedTemplate = action.payload.data;
        if (!updatedTemplate) return;
        const index = state.items.findIndex(template => template.id === updatedTemplate.id);
        if (index !== -1) {
          state.items[index] = updatedTemplate;
        }
        if (state.selectedTemplate?.id === updatedTemplate.id) {
          state.selectedTemplate = updatedTemplate;
        }
      })
      // Delete template
      .addMatcher(api.endpoints.deleteTemplate?.matchFulfilled, (state, action) => {
        const templateId = action.meta.arg.originalArgs;
        state.items = state.items.filter(template => template.id !== templateId);
        if (state.selectedTemplate?.id === templateId) {
          state.selectedTemplate = null;
        }
      })
      // Template preview
      .addMatcher(api.endpoints.getTemplatePreview?.matchPending, (state) => {
        state.previewData.isLoading = true;
      })
      .addMatcher(api.endpoints.getTemplatePreview?.matchFulfilled, (state, action) => {
        state.previewData.isLoading = false;
        state.previewData.template = action.payload.data?.template ?? null;
        state.previewData.content = action.payload.data?.preview ?? null;
      })
      .addMatcher(api.endpoints.getTemplatePreview?.matchRejected, (state) => {
        state.previewData.isLoading = false;
      })
      // Template statistics
      .addMatcher(api.endpoints.getTemplateStatistics?.matchFulfilled, (state, action) => {
        const data = action.payload.data;
        if (!data) return;
        state.statistics = {
          total: data.summary.totalTemplates,
          active: data.summary.activeTemplates,
          byType: data.distribution.byType as Record<TemplateType, number>,
          byCourse: data.distribution.byCourse.reduce((acc: Record<string, number>, item: { courseId: string; count: number }) => {
            acc[item.courseId] = item.count;
            return acc;
          }, {} as Record<string, number>),
          performance: {
            topPerforming: data.performance.topPerforming.map((t: any) => ({
              templateId: t.template.id,
              name: t.template.name,
              messagesSent: t.messagesSent,
              deliveryRate: t.deliveryRate,
              readRate: t.readRate,
            })),
            underperforming: data.performance.underperforming.map((t: any) => ({
              templateId: t.template.id,
              name: t.template.name,
              messagesSent: t.messagesSent,
              deliveryRate: t.deliveryRate,
              readRate: t.readRate,
            })),
          },
          lastUpdated: new Date(),
        };
      })
      // Bulk operations
      .addMatcher(api.endpoints.bulkTemplateOperation?.matchPending, (state) => {
        state.bulkOperations.isProcessing = true;
      })
      .addMatcher(api.endpoints.bulkTemplateOperation?.matchFulfilled, (state, action) => {
        state.bulkOperations.isProcessing = false;
        const payloadData = action.payload.data;
        if (!payloadData) return;
        const results = payloadData.results;
        const operation = action.meta.arg.originalArgs.operation;

        // Update templates based on operation
        if (operation === 'activate' || operation === 'deactivate') {
          const successfulIds = results.filter((r: { success: boolean; id: string }) => r.success).map((r: { success: boolean; id: string }) => r.id);
          state.items = state.items.map(template =>
            successfulIds.includes(template.id)
              ? { ...template, isActive: operation === 'activate', updatedAt: new Date() }
              : template
          );
        } else if (operation === 'delete') {
          const deletedIds = results.filter((r: { success: boolean; id: string }) => r.success).map((r: { success: boolean; id: string }) => r.id);
          state.items = state.items.filter(template => !deletedIds.includes(template.id));
        }
        
        state.bulkOperations.lastOperation = operation;
        state.bulkOperations.selectedIds = [];
      })
      .addMatcher(api.endpoints.bulkTemplateOperation?.matchRejected, (state) => {
        state.bulkOperations.isProcessing = false;
      });
  },
});

export const {
  setLoading,
  setError,
  setTemplates,
  addTemplate,
  updateTemplate,
  removeTemplate,
  setSelectedTemplate,
  clearTemplates,
  setPagination,
  setFilters,
  clearFilters,
  toggleTemplateActive,
  setPreviewLoading,
  setPreviewContent,
  clearPreview,
  setStatistics,
  setBulkSelectedIds,
  toggleBulkSelection,
  selectAllTemplates,
  clearBulkSelection,
  setBulkProcessing,
  setBulkLastOperation,
  bulkUpdateTemplates,
} = templatesSlice.actions;

// Selectors
export const selectTemplates = (state: { templates: TemplatesState }) => state.templates.items;
export const selectSelectedTemplate = (state: { templates: TemplatesState }) => state.templates.selectedTemplate;
export const selectTemplatesLoading = (state: { templates: TemplatesState }) => state.templates.isLoading;
export const selectTemplatesError = (state: { templates: TemplatesState }) => state.templates.error;
export const selectTemplatesPagination = (state: { templates: TemplatesState }) => state.templates.pagination;
export const selectTemplatesFilters = (state: { templates: TemplatesState }) => state.templates.filters;
export const selectPreviewData = (state: { templates: TemplatesState }) => state.templates.previewData;
export const selectTemplateStatistics = (state: { templates: TemplatesState }) => state.templates.statistics;
export const selectBulkOperations = (state: { templates: TemplatesState }) => state.templates.bulkOperations;

// Computed selectors
export const selectActiveTemplates = (state: { templates: TemplatesState }) =>
  state.templates.items.filter(template => template.isActive);

export const selectInactiveTemplates = (state: { templates: TemplatesState }) =>
  state.templates.items.filter(template => !template.isActive);

export const selectTemplatesByCourse = (courseId: string) => (state: { templates: TemplatesState }) =>
  state.templates.items.filter(template => template.courseId === courseId);

export const selectTemplatesByType = (type: TemplateType) => (state: { templates: TemplatesState }) =>
  state.templates.items.filter(template => template.type === type);

export const selectWelcomeTemplates = (state: { templates: TemplatesState }) =>
  state.templates.items.filter(template => template.type === TemplateType.WELCOME);

export const selectFollowUpTemplates = (state: { templates: TemplatesState }) =>
  state.templates.items.filter(template => 
    template.type === TemplateType.FOLLOW_UP_DAY_1 ||
    template.type === TemplateType.FOLLOW_UP_DAY_2 ||
    template.type === TemplateType.FOLLOW_UP_DAY_3
  );

export const selectCustomTemplates = (state: { templates: TemplatesState }) =>
  state.templates.items.filter(template => template.type === TemplateType.CUSTOM);

export const selectFilteredTemplates = (state: { templates: TemplatesState }) => {
  const { items, filters } = state.templates;
  let filtered = items;

  if (filters.search) {
    const searchTerm = filters.search.toLowerCase();
    filtered = filtered.filter(template => 
      template.name.toLowerCase().includes(searchTerm) ||
      template.content.toLowerCase().includes(searchTerm)
    );
  }

  if (filters.courseId) {
    filtered = filtered.filter(template => template.courseId === filters.courseId);
  }

  if (filters.type) {
    filtered = filtered.filter(template => template.type === filters.type);
  }

  if (filters.isActive !== undefined) {
    filtered = filtered.filter(template => template.isActive === filters.isActive);
  }

  return filtered;
};

export const selectTemplateById = (state: { templates: TemplatesState }, templateId: string) => {
  return state.templates.items.find(template => template.id === templateId);
};

export const selectTemplatesByIds = (state: { templates: TemplatesState }, templateIds: string[]) => {
  return state.templates.items.filter(template => templateIds.includes(template.id));
};

export const selectBulkSelectedTemplates = (state: { templates: TemplatesState }) => {
  const { items, bulkOperations } = state.templates;
  return items.filter(template => bulkOperations.selectedIds.includes(template.id));
};

export const selectTemplateUsageStats = (state: { templates: TemplatesState }) => {
  const { items } = state.templates;
  const total = items.length;
  const active = items.filter(t => t.isActive).length;
  const inactive = total - active;
  
  const byType = items.reduce((acc, template) => {
    acc[template.type] = (acc[template.type] || 0) + 1;
    return acc;
  }, {} as Record<TemplateType, number>);
  
  const byCourse = items.reduce((acc, template) => {
    acc[template.courseId] = (acc[template.courseId] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  return {
    total,
    active,
    inactive,
    byType,
    byCourse,
    activePercentage: total > 0 ? Math.round((active / total) * 100) : 0,
  };
};

export const selectRecentTemplates = (state: { templates: TemplatesState }, limit: number = 5) => {
  return state.templates.items
    .slice()
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, limit);
};

export const selectTemplatesNeedingAttention = (state: { templates: TemplatesState }) => {
  const { statistics } = state.templates;
  return statistics.performance.underperforming.slice(0, 5);
};

export const selectTopPerformingTemplates = (state: { templates: TemplatesState }) => {
  const { statistics } = state.templates;
  return statistics.performance.topPerforming.slice(0, 5);
};

export default templatesSlice.reducer;