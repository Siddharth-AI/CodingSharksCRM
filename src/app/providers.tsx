'use client';

import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from '@/store';
import { AuthProvider } from '@/components/auth/AuthProvider';
import ApiDebugger from '@/components/ui/ApiDebugger';

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <Provider store={store}>
      <PersistGate loading={<div>Loading...</div>} persistor={persistor}>
        <AuthProvider>
          {children}
          {process.env.NODE_ENV === 'development' && <ApiDebugger />}
        </AuthProvider>
      </PersistGate>
    </Provider>
  );
}