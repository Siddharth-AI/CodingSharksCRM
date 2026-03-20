import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { DashboardStats, TrendData, ConversionData } from '@/types';

// Use string dates for serializable state
interface SerializableDateRange {
  from: string; // ISO string
  to: string;   // ISO string
}

interface DashboardState {
  stats: DashboardStats | null;
  trends: TrendData[];
  conversionData: ConversionData[];
  dateRange: SerializableDateRange;
  isLoading: boolean;
  error: string | null;
  refreshInterval: number | null;
  lastUpdated: string | null; // ISO string
  filters: {
    courseId?: string;
    period?: 'daily' | 'weekly' | 'monthly';
  };
}

const initialState: DashboardState = {
  stats: null,
  trends: [],
  conversionData: [],
  dateRange: {
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days ago
    to: new Date().toISOString(),
  },
  isLoading: false,
  error: null,
  refreshInterval: null,
  lastUpdated: null,
  filters: {
    period: 'daily',
  },
};

const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    setStats: (state, action: PayloadAction<DashboardStats>) => {
      state.stats = action.payload;
      state.lastUpdated = new Date().toISOString();
    },
    setTrends: (state, action: PayloadAction<TrendData[]>) => {
      state.trends = action.payload;
    },
    setConversionData: (state, action: PayloadAction<ConversionData[]>) => {
      state.conversionData = action.payload;
    },
    setDateRange: (state, action: PayloadAction<SerializableDateRange>) => {
      state.dateRange = action.payload;
    },
    clearDashboard: (state) => {
      state.stats = null;
      state.trends = [];
      state.conversionData = [];
      state.lastUpdated = null;
    },
    setFilters: (state, action: PayloadAction<DashboardState['filters']>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearFilters: (state) => {
      state.filters = { period: 'daily' };
    },
    setRefreshInterval: (state, action: PayloadAction<number | null>) => {
      state.refreshInterval = action.payload;
    },
    updateLastRefresh: (state) => {
      state.lastUpdated = new Date().toISOString();
    },
    // Quick date range presets
    setDateRangePreset: (state, action: PayloadAction<'today' | 'week' | 'month' | 'quarter' | 'year'>) => {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      switch (action.payload) {
        case 'today':
          state.dateRange = {
            from: today.toISOString(),
            to: new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1).toISOString(),
          };
          break;
        case 'week':
          const weekStart = new Date(today);
          weekStart.setDate(today.getDate() - today.getDay());
          state.dateRange = {
            from: weekStart.toISOString(),
            to: now.toISOString(),
          };
          break;
        case 'month':
          state.dateRange = {
            from: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(),
            to: now.toISOString(),
          };
          break;
        case 'quarter':
          const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
          state.dateRange = {
            from: quarterStart.toISOString(),
            to: now.toISOString(),
          };
          break;
        case 'year':
          state.dateRange = {
            from: new Date(now.getFullYear(), 0, 1).toISOString(),
            to: now.toISOString(),
          };
          break;
      }
    },
  },
});

export const {
  setLoading,
  setError,
  setStats,
  setTrends,
  setConversionData,
  setDateRange,
  clearDashboard,
  setFilters,
  clearFilters,
  setRefreshInterval,
  updateLastRefresh,
  setDateRangePreset,
} = dashboardSlice.actions;

// Selectors
export const selectDashboardStats = (state: { dashboard: DashboardState }) => state.dashboard.stats;
export const selectDashboardTrends = (state: { dashboard: DashboardState }) => state.dashboard.trends;
export const selectDashboardConversion = (state: { dashboard: DashboardState }) => state.dashboard.conversionData;
export const selectDashboardDateRange = (state: { dashboard: DashboardState }) => state.dashboard.dateRange;
export const selectDashboardLoading = (state: { dashboard: DashboardState }) => state.dashboard.isLoading;
export const selectDashboardError = (state: { dashboard: DashboardState }) => state.dashboard.error;
export const selectDashboardFilters = (state: { dashboard: DashboardState }) => state.dashboard.filters;
export const selectDashboardLastUpdated = (state: { dashboard: DashboardState }) => state.dashboard.lastUpdated;
export const selectDashboardRefreshInterval = (state: { dashboard: DashboardState }) => state.dashboard.refreshInterval;

// Computed selectors
export const selectDashboardSummary = (state: { dashboard: DashboardState }) => {
  const stats = state.dashboard.stats;
  if (!stats) return null;

  return {
    totalLeads: stats.totalLeads,
    conversionRate: stats.conversionRate,
    messageDeliveryRate: stats.messageDeliveryRate,
    topCourse: Object.entries(stats.byCourse).reduce((a, b) =>
      stats.byCourse[a[0]] > stats.byCourse[b[0]] ? a : b
    )?.[0] || 'N/A',
  };
};

export const selectConversionFunnel = (state: { dashboard: DashboardState }) => {
  const stats = state.dashboard.stats;
  if (!stats) return [];

  return [
    { stage: 'New', count: stats.byStage['new'] ?? 0, percentage: 100 },
    {
      stage: 'Contacted',
      count: stats.byStage['contacted'] ?? 0,
      percentage: stats.totalLeads > 0 ? ((stats.byStage['contacted'] ?? 0) / stats.totalLeads) * 100 : 0
    },
    {
      stage: 'Interested',
      count: stats.byStage['interested'] ?? 0,
      percentage: stats.totalLeads > 0 ? ((stats.byStage['interested'] ?? 0) / stats.totalLeads) * 100 : 0
    },
    {
      stage: 'Converted',
      count: stats.byStage['converted'] ?? 0,
      percentage: stats.totalLeads > 0 ? ((stats.byStage['converted'] ?? 0) / stats.totalLeads) * 100 : 0
    },
  ];
};

export const selectIsDataStale = (state: { dashboard: DashboardState }) => {
  const lastUpdated = state.dashboard.lastUpdated;
  if (!lastUpdated) return true;
  
  const staleThreshold = 5 * 60 * 1000; // 5 minutes
  return Date.now() - new Date(lastUpdated).getTime() > staleThreshold;
};

// Helper selectors that convert string dates back to Date objects for components
export const selectDashboardDateRangeAsDate = (state: { dashboard: DashboardState }) => ({
  from: new Date(state.dashboard.dateRange.from),
  to: new Date(state.dashboard.dateRange.to),
});

export const selectDashboardLastUpdatedAsDate = (state: { dashboard: DashboardState }) => 
  state.dashboard.lastUpdated ? new Date(state.dashboard.lastUpdated) : null;

export default dashboardSlice.reducer;