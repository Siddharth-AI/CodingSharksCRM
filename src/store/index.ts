import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import { combineReducers } from '@reduxjs/toolkit';

// Import slices (will be created in subsequent tasks)
import authSlice from './slices/authSlice';
import leadsSlice from './slices/leadsSlice';
import coursesSlice from './slices/coursesSlice';
import messagesSlice from './slices/messagesSlice';
import templatesSlice from './slices/templatesSlice';
import dashboardSlice from './slices/dashboardSlice';
import uiSlice from './slices/uiSlice';
import activitiesSlice from './slices/activitiesSlice';

// Import API slice
import { api } from './api';

// Persist configuration
const persistConfig = {
  key: 'root',
  storage,
  whitelist: ['auth'], // Only persist auth state
};

// Root reducer
const rootReducer = combineReducers({
  auth: authSlice,
  leads: leadsSlice,
  courses: coursesSlice,
  messages: messagesSlice,
  templates: templatesSlice,
  dashboard: dashboardSlice,
  ui: uiSlice,
  activities: activitiesSlice,
  [api.reducerPath]: api.reducer,
});

// Persisted reducer
const persistedReducer = persistReducer(persistConfig, rootReducer);

// Configure store
export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [
          'persist/PERSIST',
          'persist/REHYDRATE',
          'persist/PAUSE',
          'persist/FLUSH',
          'persist/PURGE',
          'persist/REGISTER',
        ],
        // Ignore RTK Query internal paths that may transiently hold request metadata
        ignoredPaths: [
          'api.queries',
          'api.mutations',
          'api.subscriptions',
        ],
      },
    }).concat(api.middleware),
  devTools: process.env.NODE_ENV !== 'production',
});

// Setup listeners for RTK Query
setupListeners(store.dispatch);

// Create persistor
export const persistor = persistStore(store);

// Export types
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Export store as default
export default store;