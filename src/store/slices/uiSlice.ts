import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Notification, ModalState } from '@/types';

interface UIState {
  sidebarCollapsed: boolean;
  activeModal: ModalState;
  notifications: Notification[];
  theme: 'light' | 'dark';
  isLoading: boolean;
  breadcrumbs: Array<{ label: string; href?: string }>;
  pageTitle: string;
  searchQuery: string;
  layout: {
    showSidebar: boolean;
    showHeader: boolean;
    contentPadding: boolean;
  };
}

const initialState: UIState = {
  sidebarCollapsed: false,
  activeModal: { isOpen: false },
  notifications: [],
  theme: 'light',
  isLoading: false,
  breadcrumbs: [],
  pageTitle: 'CRM Dashboard',
  searchQuery: '',
  layout: {
    showSidebar: true,
    showHeader: true,
    contentPadding: true,
  },
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleSidebar: (state) => {
      state.sidebarCollapsed = !state.sidebarCollapsed;
    },
    setSidebarCollapsed: (state, action: PayloadAction<boolean>) => {
      state.sidebarCollapsed = action.payload;
    },
    openModal: (state, action: PayloadAction<{ type: string; data?: any }>) => {
      state.activeModal = {
        isOpen: true,
        type: action.payload.type,
        data: action.payload.data,
      };
    },
    closeModal: (state) => {
      state.activeModal = { isOpen: false };
    },
    showNotification: (state, action: PayloadAction<Omit<Notification, 'id'>>) => {
      const notification: Notification = {
        id: Date.now().toString(),
        ...action.payload,
      };
      state.notifications.push(notification);
      
      // Auto-remove success notifications after 5 seconds
      if (notification.type === 'success' && !notification.duration) {
        notification.duration = 5000;
      }
    },
    removeNotification: (state, action: PayloadAction<string>) => {
      state.notifications = state.notifications.filter(
        notification => notification.id !== action.payload
      );
    },
    clearNotifications: (state) => {
      state.notifications = [];
    },
    setTheme: (state, action: PayloadAction<'light' | 'dark'>) => {
      state.theme = action.payload;
      // Persist theme to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('theme', action.payload);
      }
    },
    setGlobalLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setBreadcrumbs: (state, action: PayloadAction<Array<{ label: string; href?: string }>>) => {
      state.breadcrumbs = action.payload;
    },
    setPageTitle: (state, action: PayloadAction<string>) => {
      state.pageTitle = action.payload;
      // Update document title
      if (typeof window !== 'undefined') {
        document.title = `${action.payload} - CRM System`;
      }
    },
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
    },
    clearSearch: (state) => {
      state.searchQuery = '';
    },
    setLayout: (state, action: PayloadAction<Partial<UIState['layout']>>) => {
      state.layout = { ...state.layout, ...action.payload };
    },
    resetLayout: (state) => {
      state.layout = initialState.layout;
    },
    // Notification helpers
    showSuccessNotification: (state, action: PayloadAction<string>) => {
      const notification: Notification = {
        id: Date.now().toString(),
        type: 'success',
        message: action.payload,
        duration: 5000,
      };
      state.notifications.push(notification);
    },
    showErrorNotification: (state, action: PayloadAction<string>) => {
      const notification: Notification = {
        id: Date.now().toString(),
        type: 'error',
        message: action.payload,
      };
      state.notifications.push(notification);
    },
    showWarningNotification: (state, action: PayloadAction<string>) => {
      const notification: Notification = {
        id: Date.now().toString(),
        type: 'warning',
        message: action.payload,
        duration: 7000,
      };
      state.notifications.push(notification);
    },
    showInfoNotification: (state, action: PayloadAction<string>) => {
      const notification: Notification = {
        id: Date.now().toString(),
        type: 'info',
        message: action.payload,
        duration: 5000,
      };
      state.notifications.push(notification);
    },
  },
});

export const {
  toggleSidebar,
  setSidebarCollapsed,
  openModal,
  closeModal,
  showNotification,
  removeNotification,
  clearNotifications,
  setTheme,
  setGlobalLoading,
  setBreadcrumbs,
  setPageTitle,
  setSearchQuery,
  clearSearch,
  setLayout,
  resetLayout,
  showSuccessNotification,
  showErrorNotification,
  showWarningNotification,
  showInfoNotification,
} = uiSlice.actions;

// Selectors
export const selectSidebarCollapsed = (state: { ui: UIState }) => state.ui.sidebarCollapsed;
export const selectActiveModal = (state: { ui: UIState }) => state.ui.activeModal;
export const selectNotifications = (state: { ui: UIState }) => state.ui.notifications;
export const selectTheme = (state: { ui: UIState }) => state.ui.theme;
export const selectGlobalLoading = (state: { ui: UIState }) => state.ui.isLoading;
export const selectBreadcrumbs = (state: { ui: UIState }) => state.ui.breadcrumbs;
export const selectPageTitle = (state: { ui: UIState }) => state.ui.pageTitle;
export const selectSearchQuery = (state: { ui: UIState }) => state.ui.searchQuery;
export const selectLayout = (state: { ui: UIState }) => state.ui.layout;

// Computed selectors
export const selectHasNotifications = (state: { ui: UIState }) => state.ui.notifications.length > 0;
export const selectUnreadNotifications = (state: { ui: UIState }) => 
  state.ui.notifications.filter(n => n.type === 'error' || n.type === 'warning');
export const selectIsModalOpen = (modalType: string) => (state: { ui: UIState }) => 
  state.ui.activeModal.isOpen && state.ui.activeModal.type === modalType;

export default uiSlice.reducer;