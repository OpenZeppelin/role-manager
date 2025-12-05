import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';

import { MainLayout } from './components/Layout/MainLayout';
import { ContractProvider } from './context/ContractContext';
import { AuthorizedAccounts } from './pages/AuthorizedAccounts';
import { Dashboard } from './pages/Dashboard';
import { RoleChanges } from './pages/RoleChanges';
import { Roles } from './pages/Roles';

/**
 * Creates a QueryClient instance with default options.
 * This factory is used with useState to ensure proper encapsulation
 * and avoid shared state issues in SSR or testing scenarios.
 *
 * Default options:
 * - staleTime: 1 minute - data considered fresh for 1 minute
 * - gcTime: 10 minutes - unused data kept in cache for 10 minutes
 * - retry: false - don't auto-retry failed queries (handled manually)
 */
function createQueryClient(): QueryClient {
  return new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      retry: false,
    },
  },
});
}

/**
 * Root application component
 * Sets up routing and layout structure
 *
 * Provider hierarchy:
 * - QueryClientProvider: React Query for data fetching/caching
 * - BrowserRouter: Client-side routing
 * - ContractProvider: Shared contract selection state
 *
 * ContractProvider wraps inside BrowserRouter to enable:
 * - Shared contract selection state across all pages
 * - Access to selected contract in Dashboard and other pages
 * Feature: 007-dashboard-real-data
 */
function App() {
  // Create QueryClient inside component with useState for proper encapsulation
  // This avoids shared state issues in SSR or testing scenarios
  const [queryClient] = useState(createQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ContractProvider>
          <MainLayout>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/authorized-accounts" element={<AuthorizedAccounts />} />
              <Route path="/roles" element={<Roles />} />
              <Route path="/role-changes" element={<RoleChanges />} />
            </Routes>
          </MainLayout>
        </ContractProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
