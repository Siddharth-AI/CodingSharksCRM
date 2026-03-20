import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Activity, ActivityType } from '@/types';

interface ActivitiesState {
  items: Activity[];
  isLoading: boolean;
  error: string | null;
  filters: {
    leadId?: string;
    type?: ActivityType;
    performedBy?: string;
    dateFrom?: Date;
    dateTo?: Date;
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  selectedActivity: Activity | null;
}

const initialState: ActivitiesState = {
  items: [],
  isLoading: false,
  error: null,
  filters: {},
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  },
  selectedActivity: null,
};

const activitiesSlice = createSlice({
  name: 'activities',
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    setActivities: (state, action: PayloadAction<Activity[]>) => {
      state.items = action.payload;
    },
    addActivity: (state, action: PayloadAction<Activity>) => {
      state.items.unshift(action.payload);
      state.pagination.total += 1;
    },
    updateActivity: (state, action: PayloadAction<Activity>) => {
      const index = state.items.findIndex(activity => activity.id === action.payload.id);
      if (index !== -1) {
        state.items[index] = action.payload;
      }
      if (state.selectedActivity?.id === action.payload.id) {
        state.selectedActivity = action.payload;
      }
    },
    removeActivity: (state, action: PayloadAction<string>) => {
      state.items = state.items.filter(activity => activity.id !== action.payload);
      state.pagination.total = Math.max(0, state.pagination.total - 1);
      if (state.selectedActivity?.id === action.payload) {
        state.selectedActivity = null;
      }
    },
    clearActivities: (state) => {
      state.items = [];
      state.pagination = {
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
      };
    },
    setFilters: (state, action: PayloadAction<ActivitiesState['filters']>) => {
      state.filters = action.payload;
      state.pagination.page = 1; // Reset to first page when filters change
    },
    clearFilters: (state) => {
      state.filters = {};
      state.pagination.page = 1;
    },
    setPagination: (state, action: PayloadAction<ActivitiesState['pagination']>) => {
      state.pagination = action.payload;
    },
    setPage: (state, action: PayloadAction<number>) => {
      state.pagination.page = action.payload;
    },
    setSelectedActivity: (state, action: PayloadAction<Activity | null>) => {
      state.selectedActivity = action.payload;
    },
  },
});

export const {
  setLoading,
  setError,
  setActivities,
  addActivity,
  updateActivity,
  removeActivity,
  clearActivities,
  setFilters,
  clearFilters,
  setPagination,
  setPage,
  setSelectedActivity,
} = activitiesSlice.actions;

// Selectors
export const selectActivities = (state: { activities: ActivitiesState }) => state.activities.items;
export const selectActivitiesLoading = (state: { activities: ActivitiesState }) => state.activities.isLoading;
export const selectActivitiesError = (state: { activities: ActivitiesState }) => state.activities.error;
export const selectActivitiesFilters = (state: { activities: ActivitiesState }) => state.activities.filters;
export const selectActivitiesPagination = (state: { activities: ActivitiesState }) => state.activities.pagination;
export const selectSelectedActivity = (state: { activities: ActivitiesState }) => state.activities.selectedActivity;

// Computed selectors
export const selectActivitiesByLead = (leadId: string) => (state: { activities: ActivitiesState }) =>
  state.activities.items.filter(activity => activity.leadId === leadId);

export const selectActivitiesByType = (type: ActivityType) => (state: { activities: ActivitiesState }) =>
  state.activities.items.filter(activity => activity.type === type);

export const selectRecentActivities = (limit: number = 10) => (state: { activities: ActivitiesState }) =>
  state.activities.items.slice(0, limit);

export const selectActivitiesGroupedByDate = (state: { activities: ActivitiesState }) => {
  const grouped: Record<string, Activity[]> = {};
  
  state.activities.items.forEach(activity => {
    const date = activity.createdAt.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    
    if (!grouped[date]) {
      grouped[date] = [];
    }
    grouped[date].push(activity);
  });
  
  return grouped;
};

export const selectActivitiesStats = (state: { activities: ActivitiesState }) => {
  const activities = state.activities.items;
  const total = activities.length;
  
  const byType: Record<ActivityType, number> = {} as Record<ActivityType, number>;
  Object.values(ActivityType).forEach(type => {
    byType[type] = 0;
  });
  
  activities.forEach(activity => {
    byType[activity.type] = (byType[activity.type] || 0) + 1;
  });
  
  // Get activities from last 24 hours
  const last24Hours = new Date();
  last24Hours.setHours(last24Hours.getHours() - 24);
  const recentCount = activities.filter(a => a.createdAt >= last24Hours).length;
  
  // Get activities from last 7 days
  const last7Days = new Date();
  last7Days.setDate(last7Days.getDate() - 7);
  const weekCount = activities.filter(a => a.createdAt >= last7Days).length;
  
  return {
    total,
    byType,
    recentCount,
    weekCount,
  };
};

export default activitiesSlice.reducer;
