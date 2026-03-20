import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Course } from '@/types';
import { api } from '../api';

interface CoursesState {
  items: Course[];
  selectedCourse: Course | null;
  isLoading: boolean;
  error: string | null;
  filters: {
    isActive?: boolean;
    priceMin?: number;
    priceMax?: number;
    search?: string;
  };
  statistics: {
    total: number;
    active: number;
    inactive: number;
    byCategory: Record<string, { total: number; active: number }>;
    priceStats: {
      min: number;
      max: number;
      average: number;
    };
    popularCourses: Array<{
      course: string;
      leadCount: number;
      conversionRate: number;
    }>;
    lastUpdated: Date | null;
  };
  bulkOperations: {
    selectedIds: string[];
    isProcessing: boolean;
  };
}

const initialState: CoursesState = {
  items: [],
  selectedCourse: null,
  isLoading: false,
  error: null,
  filters: {},
  statistics: {
    total: 0,
    active: 0,
    inactive: 0,
    byCategory: {},
    priceStats: {
      min: 0,
      max: 0,
      average: 0,
    },
    popularCourses: [],
    lastUpdated: null,
  },
  bulkOperations: {
    selectedIds: [],
    isProcessing: false,
  },
};

const coursesSlice = createSlice({
  name: 'courses',
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    setCourses: (state, action: PayloadAction<Course[]>) => {
      state.items = action.payload;
    },
    addCourse: (state, action: PayloadAction<Course>) => {
      state.items.push(action.payload);
    },
    updateCourse: (state, action: PayloadAction<Course>) => {
      const index = state.items.findIndex(course => course.id === action.payload.id);
      if (index !== -1) {
        state.items[index] = action.payload;
      }
      if (state.selectedCourse?.id === action.payload.id) {
        state.selectedCourse = action.payload;
      }
    },
    removeCourse: (state, action: PayloadAction<string>) => {
      state.items = state.items.filter(course => course.id !== action.payload);
      if (state.selectedCourse?.id === action.payload) {
        state.selectedCourse = null;
      }
      // Remove from bulk selection if selected
      state.bulkOperations.selectedIds = state.bulkOperations.selectedIds.filter(id => id !== action.payload);
    },
    setSelectedCourse: (state, action: PayloadAction<Course | null>) => {
      state.selectedCourse = action.payload;
    },
    clearCourses: (state) => {
      state.items = [];
      state.selectedCourse = null;
      state.bulkOperations.selectedIds = [];
    },
    setFilters: (state, action: PayloadAction<CoursesState['filters']>) => {
      state.filters = action.payload;
    },
    clearFilters: (state) => {
      state.filters = {};
    },
    toggleCourseActive: (state, action: PayloadAction<string>) => {
      const course = state.items.find(c => c.id === action.payload);
      if (course) {
        course.isActive = !course.isActive;
        course.updatedAt = new Date();
      }
    },
    // Statistics
    setStatistics: (state, action: PayloadAction<Partial<CoursesState['statistics']>>) => {
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
    selectAllCourses: (state) => {
      state.bulkOperations.selectedIds = state.items.map(course => course.id);
    },
    clearBulkSelection: (state) => {
      state.bulkOperations.selectedIds = [];
    },
    setBulkProcessing: (state, action: PayloadAction<boolean>) => {
      state.bulkOperations.isProcessing = action.payload;
    },
    // Bulk update courses
    bulkUpdateCourses: (state, action: PayloadAction<{ ids: string[]; updates: Partial<Course> }>) => {
      const { ids, updates } = action.payload;
      state.items = state.items.map(course => 
        ids.includes(course.id) ? { ...course, ...updates, updatedAt: new Date() } : course
      );
    },
    // Sort courses
    sortCourses: (state, action: PayloadAction<{ field: keyof Course; direction: 'asc' | 'desc' }>) => {
      const { field, direction } = action.payload;
      state.items.sort((a, b) => {
        const aValue = a[field];
        const bValue = b[field];
        
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          return direction === 'asc' 
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue);
        }
        
        if (typeof aValue === 'number' && typeof bValue === 'number') {
          return direction === 'asc' ? aValue - bValue : bValue - aValue;
        }
        
        if (aValue instanceof Date && bValue instanceof Date) {
          return direction === 'asc' 
            ? aValue.getTime() - bValue.getTime()
            : bValue.getTime() - aValue.getTime();
        }
        
        return 0;
      });
    },
  },
  extraReducers: (builder) => {
    // RTK Query integration
    builder
      // Get courses
      .addMatcher(api.endpoints.getCourses.matchPending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addMatcher(api.endpoints.getCourses.matchFulfilled, (state, action) => {
        state.isLoading = false;
        state.items = action.payload.data || [];
      })
      .addMatcher(api.endpoints.getCourses.matchRejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch courses';
      })
      // Create course
      .addMatcher(api.endpoints.createCourse.matchPending, (state) => {
        state.error = null;
      })
      .addMatcher(api.endpoints.createCourse.matchFulfilled, (state, action) => {
        const newCourse = action.payload.data;
        if (!newCourse) return;
        state.items.push(newCourse);
      })
      .addMatcher(api.endpoints.createCourse.matchRejected, (state, action) => {
        state.error = action.error.message || 'Failed to create course';
      })
      // Update course
      .addMatcher(api.endpoints.updateCourse.matchFulfilled, (state, action) => {
        const updatedCourse = action.payload.data;
        if (!updatedCourse) return;
        const index = state.items.findIndex(course => course.id === updatedCourse.id);
        if (index !== -1) {
          state.items[index] = updatedCourse;
        }
        if (state.selectedCourse?.id === updatedCourse.id) {
          state.selectedCourse = updatedCourse;
        }
      })
      // Delete course
      .addMatcher(api.endpoints.deleteCourse.matchFulfilled, (state, action) => {
        const courseId = action.meta.arg.originalArgs;
        state.items = state.items.filter(course => course.id !== courseId);
        if (state.selectedCourse?.id === courseId) {
          state.selectedCourse = null;
        }
        state.bulkOperations.selectedIds = state.bulkOperations.selectedIds.filter(id => id !== courseId);
      });
  },
});

export const {
  setLoading,
  setError,
  setCourses,
  addCourse,
  updateCourse,
  removeCourse,
  setSelectedCourse,
  clearCourses,
  setFilters,
  clearFilters,
  toggleCourseActive,
  setStatistics,
  setBulkSelectedIds,
  toggleBulkSelection,
  selectAllCourses,
  clearBulkSelection,
  setBulkProcessing,
  bulkUpdateCourses,
  sortCourses,
} = coursesSlice.actions;

// Selectors
export const selectCourses = (state: { courses: CoursesState }) => state.courses.items;
export const selectSelectedCourse = (state: { courses: CoursesState }) => state.courses.selectedCourse;
export const selectCoursesLoading = (state: { courses: CoursesState }) => state.courses.isLoading;
export const selectCoursesError = (state: { courses: CoursesState }) => state.courses.error;
export const selectCoursesFilters = (state: { courses: CoursesState }) => state.courses.filters;
export const selectCourseStatistics = (state: { courses: CoursesState }) => state.courses.statistics;
export const selectBulkOperations = (state: { courses: CoursesState }) => state.courses.bulkOperations;

// Computed selectors
export const selectActiveCourses = (state: { courses: CoursesState }) => 
  state.courses.items.filter(course => course.isActive);

export const selectInactiveCourses = (state: { courses: CoursesState }) => 
  state.courses.items.filter(course => !course.isActive);

export const selectFilteredCourses = (state: { courses: CoursesState }) => {
  const { items, filters } = state.courses;
  let filtered = items;

  if (filters.search) {
    const searchTerm = filters.search.toLowerCase();
    filtered = filtered.filter(course => 
      course.name.toLowerCase().includes(searchTerm) ||
      course.description.toLowerCase().includes(searchTerm)
    );
  }

  if (filters.isActive !== undefined) {
    filtered = filtered.filter(course => course.isActive === filters.isActive);
  }

  if (filters.priceMin !== undefined) {
    filtered = filtered.filter(course => (course.price ?? 0) >= filters.priceMin!);
  }

  if (filters.priceMax !== undefined) {
    filtered = filtered.filter(course => (course.price ?? 0) <= filters.priceMax!);
  }

  return filtered;
};

export const selectCourseById = (state: { courses: CoursesState }, courseId: string) => {
  return state.courses.items.find(course => course.id === courseId);
};

export const selectCoursesByIds = (state: { courses: CoursesState }, courseIds: string[]) => {
  return state.courses.items.filter(course => courseIds.includes(course.id));
};

export const selectBulkSelectedCourses = (state: { courses: CoursesState }) => {
  const { items, bulkOperations } = state.courses;
  return items.filter(course => bulkOperations.selectedIds.includes(course.id));
};

export const selectCoursesPriceRange = (state: { courses: CoursesState }) => {
  const courses = state.courses.items;
  if (courses.length === 0) return { min: 0, max: 0 };
  
  const prices = courses.map(course => course.price ?? 0);
  return {
    min: Math.min(...prices),
    max: Math.max(...prices),
  };
};

export const selectPopularCourses = (state: { courses: CoursesState }) => {
  return state.courses.statistics.popularCourses;
};

export const selectCourseNames = (state: { courses: CoursesState }) => {
  return state.courses.items.map(course => course.name);
};

export default coursesSlice.reducer;