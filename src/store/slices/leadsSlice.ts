import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Lead, LeadFilters, PaginationState, LeadStage } from '@/types';
import { api } from '../api';

interface LeadsState {
  items: Lead[];
  selectedLead: Lead | null;
  filters: LeadFilters;
  pagination: PaginationState;
  isLoading: boolean;
  error: string | null;
  optimisticUpdates: Record<string, Partial<Lead>>;
  kanbanView: {
    draggedLead: Lead | null;
    isDragging: boolean;
    stageColumns: Record<LeadStage, Lead[]>;
  };
  searchResults: {
    query: string;
    results: Lead[];
    isSearching: boolean;
  };
  statistics: {
    total: number;
    byStage: Record<LeadStage, number>;
    bySource: Record<string, number>;
    byCourse: Record<string, number>;
    conversionRate: number;
    lastUpdated: Date | null;
  };
  duplicateCheck: {
    mobile: string | null;
    duplicates: Lead[];
    isChecking: boolean;
  };
}

const initialState: LeadsState = {
  items: [],
  selectedLead: null,
  filters: {},
  pagination: {
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  },
  isLoading: false,
  error: null,
  optimisticUpdates: {},
  kanbanView: {
    draggedLead: null,
    isDragging: false,
    stageColumns: {
      [LeadStage.NEW]: [],
      [LeadStage.CONTACTED]: [],
      [LeadStage.INTERESTED]: [],
      [LeadStage.CONVERTED]: [],
    },
  },
  searchResults: {
    query: '',
    results: [],
    isSearching: false,
  },
  statistics: {
    total: 0,
    byStage: {
      [LeadStage.NEW]: 0,
      [LeadStage.CONTACTED]: 0,
      [LeadStage.INTERESTED]: 0,
      [LeadStage.CONVERTED]: 0,
    },
    bySource: {},
    byCourse: {},
    conversionRate: 0,
    lastUpdated: null,
  },
  duplicateCheck: {
    mobile: null,
    duplicates: [],
    isChecking: false,
  },
};

const leadsSlice = createSlice({
  name: 'leads',
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    setLeads: (state, action: PayloadAction<Lead[]>) => {
      state.items = action.payload;
      // Update Kanban columns
      state.kanbanView.stageColumns = {
        [LeadStage.NEW]: action.payload.filter(lead => lead.stage === LeadStage.NEW),
        [LeadStage.CONTACTED]: action.payload.filter(lead => lead.stage === LeadStage.CONTACTED),
        [LeadStage.INTERESTED]: action.payload.filter(lead => lead.stage === LeadStage.INTERESTED),
        [LeadStage.CONVERTED]: action.payload.filter(lead => lead.stage === LeadStage.CONVERTED),
      };
    },
    addLead: (state, action: PayloadAction<Lead>) => {
      state.items.unshift(action.payload);
      // Add to appropriate Kanban column
      state.kanbanView.stageColumns[action.payload.stage].unshift(action.payload);
    },
    updateLead: (state, action: PayloadAction<Lead>) => {
      const index = state.items.findIndex(lead => lead.id === action.payload.id);
      if (index !== -1) {
        const oldLead = state.items[index];
        state.items[index] = action.payload;
        
        // Update Kanban columns if stage changed
        if (oldLead.stage !== action.payload.stage) {
          // Remove from old column
          state.kanbanView.stageColumns[oldLead.stage] = state.kanbanView.stageColumns[oldLead.stage]
            .filter(lead => lead.id !== action.payload.id);
          // Add to new column
          state.kanbanView.stageColumns[action.payload.stage].push(action.payload);
        } else {
          // Update in same column
          const columnIndex = state.kanbanView.stageColumns[action.payload.stage]
            .findIndex(lead => lead.id === action.payload.id);
          if (columnIndex !== -1) {
            state.kanbanView.stageColumns[action.payload.stage][columnIndex] = action.payload;
          }
        }
      }
      if (state.selectedLead?.id === action.payload.id) {
        state.selectedLead = action.payload;
      }
      // Clear optimistic update
      delete state.optimisticUpdates[action.payload.id];
    },
    removeLead: (state, action: PayloadAction<string>) => {
      const leadToRemove = state.items.find(lead => lead.id === action.payload);
      state.items = state.items.filter(lead => lead.id !== action.payload);
      
      // Remove from Kanban columns
      if (leadToRemove) {
        state.kanbanView.stageColumns[leadToRemove.stage] = state.kanbanView.stageColumns[leadToRemove.stage]
          .filter(lead => lead.id !== action.payload);
      }
      
      if (state.selectedLead?.id === action.payload) {
        state.selectedLead = null;
      }
      delete state.optimisticUpdates[action.payload];
    },
    setSelectedLead: (state, action: PayloadAction<Lead | null>) => {
      state.selectedLead = action.payload;
    },
    setFilters: (state, action: PayloadAction<LeadFilters>) => {
      state.filters = action.payload;
    },
    setPagination: (state, action: PayloadAction<PaginationState>) => {
      state.pagination = action.payload;
    },
    clearLeads: (state) => {
      state.items = [];
      state.selectedLead = null;
      state.pagination = initialState.pagination;
      state.optimisticUpdates = {};
      state.kanbanView.stageColumns = initialState.kanbanView.stageColumns;
    },
    // Optimistic updates
    optimisticUpdateLead: (state, action: PayloadAction<{ id: string; updates: Partial<Lead> }>) => {
      const { id, updates } = action.payload;
      state.optimisticUpdates[id] = { ...state.optimisticUpdates[id], ...updates };
      
      // Apply optimistic update to items
      const index = state.items.findIndex(lead => lead.id === id);
      if (index !== -1) {
        const oldLead = state.items[index];
        state.items[index] = { ...state.items[index], ...updates };
        
        // Handle stage changes in Kanban view
        if (updates.stage && updates.stage !== oldLead.stage) {
          // Remove from old column
          state.kanbanView.stageColumns[oldLead.stage] = state.kanbanView.stageColumns[oldLead.stage]
            .filter(lead => lead.id !== id);
          // Add to new column
          state.kanbanView.stageColumns[updates.stage].push(state.items[index]);
        }
      }
      
      // Apply to selected lead if it matches
      if (state.selectedLead?.id === id) {
        state.selectedLead = { ...state.selectedLead, ...updates };
      }
    },
    revertOptimisticUpdate: (state, action: PayloadAction<string>) => {
      const leadId = action.payload;
      delete state.optimisticUpdates[leadId];
      
      // In practice, we'd refetch the data or maintain original state
      // For now, we'll just clear the optimistic update
    },
    // Kanban drag and drop
    setDraggedLead: (state, action: PayloadAction<Lead | null>) => {
      state.kanbanView.draggedLead = action.payload;
      state.kanbanView.isDragging = action.payload !== null;
    },
    optimisticStageChange: (state, action: PayloadAction<{ leadId: string; newStage: LeadStage; oldStage: LeadStage }>) => {
      const { leadId, newStage, oldStage } = action.payload;

      // Ensure both columns exist as arrays
      if (!Array.isArray(state.kanbanView.stageColumns[oldStage])) {
        state.kanbanView.stageColumns[oldStage] = [];
      }
      if (!Array.isArray(state.kanbanView.stageColumns[newStage])) {
        state.kanbanView.stageColumns[newStage] = [];
      }

      const index = state.items.findIndex(lead => lead.id === leadId);
      if (index !== -1) {
        state.items[index].stage = newStage;
        state.items[index].updatedAt = new Date().toISOString() as any;

        const lead = state.items[index];
        // Remove from old column
        state.kanbanView.stageColumns[oldStage] = state.kanbanView.stageColumns[oldStage]
          .filter(l => l.id !== leadId);
        // Also remove from new column in case of duplicates
        state.kanbanView.stageColumns[newStage] = state.kanbanView.stageColumns[newStage]
          .filter(l => l.id !== leadId);
        // Add to new column
        state.kanbanView.stageColumns[newStage].push(lead);
      }
      if (state.selectedLead?.id === leadId) {
        state.selectedLead.stage = newStage;
        state.selectedLead.updatedAt = new Date().toISOString() as any;
      }
    },
    // Same-column reorder
    reorderColumn: (state, action: PayloadAction<{ stage: LeadStage; fromIndex: number; toIndex: number }>) => {
      const { stage, fromIndex, toIndex } = action.payload;
      const col = state.kanbanView.stageColumns[stage];
      if (!col) return;
      const [moved] = col.splice(fromIndex, 1);
      col.splice(toIndex, 0, moved);
    },
    // Bulk operations
    bulkUpdateLeads: (state, action: PayloadAction<{ ids: string[]; updates: Partial<Lead> }>) => {
      const { ids, updates } = action.payload;
      state.items = state.items.map(lead => 
        ids.includes(lead.id) ? { ...lead, ...updates } : lead
      );
      
      // Update Kanban columns if stage changed
      if (updates.stage) {
        ids.forEach(id => {
          const lead = state.items.find(l => l.id === id);
          if (lead) {
            // Remove from all columns first
            Object.values(LeadStage).forEach(stage => {
              state.kanbanView.stageColumns[stage] = state.kanbanView.stageColumns[stage]
                .filter(l => l.id !== id);
            });
            // Add to new column
            state.kanbanView.stageColumns[updates.stage as LeadStage].push(lead);
          }
        });
      }
    },
    // Search and filtering
    setSearchTerm: (state, action: PayloadAction<string>) => {
      state.filters = { ...state.filters, search: action.payload };
      state.searchResults.query = action.payload;
    },
    setSearchResults: (state, action: PayloadAction<{ query: string; results: Lead[] }>) => {
      state.searchResults.query = action.payload.query;
      state.searchResults.results = action.payload.results;
      state.searchResults.isSearching = false;
    },
    setSearching: (state, action: PayloadAction<boolean>) => {
      state.searchResults.isSearching = action.payload;
    },
    clearFilters: (state) => {
      state.filters = {};
      state.searchResults.query = '';
      state.searchResults.results = [];
    },
    // Statistics
    setStatistics: (state, action: PayloadAction<Partial<LeadsState['statistics']>>) => {
      state.statistics = { ...state.statistics, ...action.payload, lastUpdated: new Date().toISOString() as any };
    },
    // Duplicate check
    setDuplicateCheck: (state, action: PayloadAction<{ mobile: string; duplicates: Lead[] }>) => {
      state.duplicateCheck.mobile = action.payload.mobile;
      state.duplicateCheck.duplicates = action.payload.duplicates;
      state.duplicateCheck.isChecking = false;
    },
    setCheckingDuplicates: (state, action: PayloadAction<boolean>) => {
      state.duplicateCheck.isChecking = action.payload;
    },
    clearDuplicateCheck: (state) => {
      state.duplicateCheck = initialState.duplicateCheck;
    },
  },
  extraReducers: (builder) => {
    // RTK Query integration
    builder
      // Get leads
      .addMatcher(api.endpoints.getLeads.matchPending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addMatcher(api.endpoints.getLeads.matchFulfilled, (state, action) => {
        state.isLoading = false;
        state.items = action.payload.data;
        state.pagination = action.payload.pagination;
        // Update Kanban columns
        state.kanbanView.stageColumns = {
          [LeadStage.NEW]: action.payload.data.filter(lead => lead.stage === LeadStage.NEW),
          [LeadStage.CONTACTED]: action.payload.data.filter(lead => lead.stage === LeadStage.CONTACTED),
          [LeadStage.INTERESTED]: action.payload.data.filter(lead => lead.stage === LeadStage.INTERESTED),
          [LeadStage.CONVERTED]: action.payload.data.filter(lead => lead.stage === LeadStage.CONVERTED),
        };
      })
      .addMatcher(api.endpoints.getLeads.matchRejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch leads';
      })
      // Create lead
      .addMatcher(api.endpoints.createLead.matchPending, (state) => {
        state.error = null;
      })
      .addMatcher(api.endpoints.createLead.matchFulfilled, (state, action) => {
        const newLead = action.payload.data;
        if (!newLead) return;
        state.items.unshift(newLead);
        state.kanbanView.stageColumns[newLead.stage].unshift(newLead);
      })
      .addMatcher(api.endpoints.createLead.matchRejected, (state, action) => {
        state.error = action.error.message || 'Failed to create lead';
      })
      // Update lead
      .addMatcher(api.endpoints.updateLead.matchFulfilled, (state, action) => {
        const updatedLead = action.payload.data;
        if (!updatedLead) return;
        const index = state.items.findIndex(lead => lead.id === updatedLead.id);
        if (index !== -1) {
          const oldLead = state.items[index];
          state.items[index] = updatedLead;

          // Update Kanban columns if stage changed
          if (oldLead && oldLead.stage !== updatedLead.stage) {
            state.kanbanView.stageColumns[oldLead.stage] = state.kanbanView.stageColumns[oldLead.stage]
              .filter(lead => lead.id !== updatedLead.id);
            state.kanbanView.stageColumns[updatedLead.stage].push(updatedLead);
          }
        }
        if (state.selectedLead?.id === updatedLead.id) {
          state.selectedLead = updatedLead;
        }
      })
      // Delete lead
      .addMatcher(api.endpoints.deleteLead.matchFulfilled, (state, action) => {
        const leadId = action.meta.arg.originalArgs;
        const leadToRemove = state.items.find(lead => lead.id === leadId);
        state.items = state.items.filter(lead => lead.id !== leadId);
        
        if (leadToRemove) {
          state.kanbanView.stageColumns[leadToRemove.stage] = state.kanbanView.stageColumns[leadToRemove.stage]
            .filter(lead => lead.id !== leadId);
        }
        
        if (state.selectedLead?.id === leadId) {
          state.selectedLead = null;
        }
      })
      // Search leads
      .addMatcher(api.endpoints.searchLeads.matchPending, (state) => {
        state.searchResults.isSearching = true;
      })
      .addMatcher(api.endpoints.searchLeads.matchFulfilled, (state, action) => {
        state.searchResults.isSearching = false;
        state.searchResults.results = action.payload.data;
      })
      .addMatcher(api.endpoints.searchLeads.matchRejected, (state) => {
        state.searchResults.isSearching = false;
      })
      // Get statistics
      .addMatcher(api.endpoints.getLeadStatistics.matchFulfilled, (state, action) => {
        if (!action.payload.data) return;
        state.statistics = {
          total: action.payload.data.total ?? 0,
          byStage: (action.payload.data.byStage ?? {}) as Record<LeadStage, number>,
          bySource: action.payload.data.bySource ?? {},
          byCourse: action.payload.data.byCourse ?? {},
          conversionRate: action.payload.data.conversionRate ?? 0,
          lastUpdated: new Date().toISOString() as any,
        };
      })
      // Check duplicates
      .addMatcher(api.endpoints.checkDuplicateLead.matchPending, (state) => {
        state.duplicateCheck.isChecking = true;
      })
      .addMatcher(api.endpoints.checkDuplicateLead.matchFulfilled, (state, action) => {
        state.duplicateCheck.isChecking = false;
        state.duplicateCheck.mobile = action.payload.data?.mobile ?? null;
        state.duplicateCheck.duplicates = action.payload.data?.data ?? [];
      })
      .addMatcher(api.endpoints.checkDuplicateLead.matchRejected, (state) => {
        state.duplicateCheck.isChecking = false;
      });
  },
});

export const {
  setLoading,
  setError,
  setLeads,
  addLead,
  updateLead,
  removeLead,
  setSelectedLead,
  setFilters,
  setPagination,
  clearLeads,
  optimisticUpdateLead,
  revertOptimisticUpdate,
  setDraggedLead,
  optimisticStageChange,
  reorderColumn,
  bulkUpdateLeads,
  setSearchTerm,
  setSearchResults,
  setSearching,
  clearFilters,
  setStatistics,
  setDuplicateCheck,
  setCheckingDuplicates,
  clearDuplicateCheck,
} = leadsSlice.actions;

// Selectors
export const selectLeads = (state: { leads: LeadsState }) => state.leads.items;
export const selectSelectedLead = (state: { leads: LeadsState }) => state.leads.selectedLead;
export const selectLeadsLoading = (state: { leads: LeadsState }) => state.leads.isLoading;
export const selectLeadsError = (state: { leads: LeadsState }) => state.leads.error;
export const selectLeadsFilters = (state: { leads: LeadsState }) => state.leads.filters;
export const selectLeadsPagination = (state: { leads: LeadsState }) => state.leads.pagination;
export const selectKanbanView = (state: { leads: LeadsState }) => state.leads.kanbanView;
export const selectSearchResults = (state: { leads: LeadsState }) => state.leads.searchResults;
export const selectLeadStatistics = (state: { leads: LeadsState }) => state.leads.statistics;
export const selectDuplicateCheck = (state: { leads: LeadsState }) => state.leads.duplicateCheck;

// Computed selectors
export const selectLeadsByStage = (state: { leads: LeadsState }) => {
  return state.leads.kanbanView.stageColumns;
};

export const selectFilteredLeads = (state: { leads: LeadsState }) => {
  const { items, filters } = state.leads;
  let filtered = items;

  if (filters.search) {
    const searchTerm = filters.search.toLowerCase();
    filtered = filtered.filter(lead => 
      lead.name.toLowerCase().includes(searchTerm) ||
      lead.email.toLowerCase().includes(searchTerm) ||
      lead.mobile.includes(searchTerm) ||
      lead.courseInterest.toLowerCase().includes(searchTerm)
    );
  }

  if (filters.stage) {
    filtered = filtered.filter(lead => lead.stage === filters.stage);
  }

  if (filters.courseInterest) {
    filtered = filtered.filter(lead => 
      lead.courseInterest.toLowerCase().includes(filters.courseInterest!.toLowerCase())
    );
  }

  if (filters.source) {
    filtered = filtered.filter(lead => lead.source === filters.source);
  }

  if (filters.dateFrom) {
    filtered = filtered.filter(lead => new Date(lead.createdAt) >= filters.dateFrom!);
  }

  if (filters.dateTo) {
    filtered = filtered.filter(lead => new Date(lead.createdAt) <= filters.dateTo!);
  }

  return filtered;
};

export const selectLeadsRequiringFollowUp = (state: { leads: LeadsState }) => {
  const oneDayAgo = new Date();
  oneDayAgo.setDate(oneDayAgo.getDate() - 1);

  return state.leads.items.filter(lead => 
    lead.stage === LeadStage.CONTACTED &&
    lead.lastContactedAt &&
    new Date(lead.lastContactedAt) <= oneDayAgo
  );
};

export const selectRecentLeads = (state: { leads: LeadsState }) => {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  return state.leads.items.filter(lead => 
    new Date(lead.createdAt) >= sevenDaysAgo
  ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
};

export const selectLeadById = (state: { leads: LeadsState }, leadId: string) => {
  return state.leads.items.find(lead => lead.id === leadId);
};

export const selectLeadsByIds = (state: { leads: LeadsState }, leadIds: string[]) => {
  return state.leads.items.filter(lead => leadIds.includes(lead.id));
};

export const selectKanbanColumnCounts = (state: { leads: LeadsState }) => {
  const columns = state.leads.kanbanView.stageColumns;
  return {
    [LeadStage.NEW]: columns[LeadStage.NEW].length,
    [LeadStage.CONTACTED]: columns[LeadStage.CONTACTED].length,
    [LeadStage.INTERESTED]: columns[LeadStage.INTERESTED].length,
    [LeadStage.CONVERTED]: columns[LeadStage.CONVERTED].length,
  };
};

export default leadsSlice.reducer;