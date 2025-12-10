import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';

import { AdapterProvider, WalletStateProvider } from '@openzeppelin/ui-builder-react-core';
import type { NativeConfigLoader } from '@openzeppelin/ui-builder-types';

import { MainLayout } from './components/Layout/MainLayout';
import { ContractProvider } from './context/ContractContext';
import { getAdapter, getNetworkById } from './core/ecosystems/ecosystemManager';
import { AuthorizedAccounts } from './pages/AuthorizedAccounts';
import { Dashboard } from './pages/Dashboard';
import { RoleChanges } from './pages/RoleChanges';
import { Roles } from './pages/Roles';

/**
 * Vite glob import for wallet UI kit configuration files.
 * These configs are loaded dynamically by WalletStateProvider.
 *
 * Feature: 013-wallet-connect-header
 */
const kitConfigImporters = import.meta.glob('./config/wallet/*.config.ts');

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
 * - AdapterProvider: Manages adapter singleton instances
 * - WalletStateProvider: Manages wallet connection state
 * - ContractProvider: Shared contract selection state
 *
 * ContractProvider wraps inside BrowserRouter to enable:
 * - Shared contract selection state across all pages
 * - Access to selected contract in Dashboard and other pages
 *
 * Feature: 007-dashboard-real-data
 * Feature: 013-wallet-connect-header (AdapterProvider, WalletStateProvider)
 */
function App() {
  // Create QueryClient inside component with useState for proper encapsulation
  // This avoids shared state issues in SSR or testing scenarios
  const [queryClient] = useState(createQueryClient);

  /**
   * Loads UI kit configuration modules dynamically.
   * Used by WalletStateProvider to load ecosystem-specific wallet UI configs.
   *
   * @param relativePath - Path relative to app root (e.g., './config/wallet/rainbowkit.config.ts')
   * @returns Configuration object or null if not found
   *
   * Feature: 013-wallet-connect-header
   */
  const loadAppConfigModule: NativeConfigLoader = useCallback(async (relativePath) => {
    const importer = kitConfigImporters[relativePath];
    if (importer) {
      try {
        const module = (await importer()) as { default?: Record<string, unknown> };
        return module.default || module;
      } catch {
        return null;
      }
    }
    return null;
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AdapterProvider resolveAdapter={getAdapter}>
          <WalletStateProvider
            initialNetworkId={null}
            getNetworkConfigById={getNetworkById}
            loadConfigModule={loadAppConfigModule}
          >
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
          </WalletStateProvider>
        </AdapterProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
