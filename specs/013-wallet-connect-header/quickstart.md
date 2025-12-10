# Quickstart: Wallet Connect Header Module

**Feature**: 013-wallet-connect-header  
**Date**: 2025-12-10

## Prerequisites

1. Role Manager development environment set up
2. UI Builder packages available (via tarball workflow)
3. WalletConnect Project ID (obtain from [cloud.walletconnect.com](https://cloud.walletconnect.com))

## Setup Steps

### 1. Add react-core dependency

**Option A: Using setup-local-dev script (recommended)**

```bash
cd /path/to/role-manager

# First, pack all UI Builder packages (run from UI Builder repo)
cd ../contracts-ui-builder
./scripts/pack-all.sh  # or pnpm pack for individual packages

# Then use the setup script (after adding react-core to package.json)
cd ../role-manager
node scripts/setup-local-dev.cjs local
```

**Option B: Manual installation**

```bash
cd apps/role-manager

# Pack the react-core package from UI Builder
cd ../../../contracts-ui-builder
pnpm pack --pack-destination .packed-packages packages/react-core

# Install in role-manager
cd ../role-manager/apps/role-manager
pnpm add file:../../../contracts-ui-builder/.packed-packages/openzeppelin-ui-builder-react-core-0.16.0.tgz
```

> **Note**: The `scripts/setup-local-dev.cjs` script has been updated to include `@openzeppelin/ui-builder-react-core` in the managed packages list.

### 2. Add environment variable

Create/update `.env` in `apps/role-manager/`:

```env
VITE_WALLETCONNECT_PROJECT_ID=your_project_id_here
```

### 3. Create wallet UI kit configurations

**Stellar Wallets Kit (PRIMARY)** - Create `apps/role-manager/src/config/wallet/stellar-wallets-kit.config.ts`:

```typescript
// Stellar Wallets Kit configuration for Stellar wallet connections
// This file is loaded dynamically by WalletStateProvider
// Supports: Freighter, Albedo, xBull, and other Stellar wallets

export default {
  appName: 'Role Manager',
  // Stellar Wallets Kit doesn't require an external project ID
  // Wallet options are auto-detected based on installed browser extensions
};
```

**RainbowKit (EVM, for future use)** - Create `apps/role-manager/src/config/wallet/rainbowkit.config.ts`:

```typescript
// RainbowKit UI kit configuration for EVM wallet connection modals
// This file is loaded dynamically by WalletStateProvider

export default {
  appName: 'Role Manager',
  projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID,
  // Additional RainbowKit options can be added here
};
```

### 4. Port getNetworkById from UI Builder

Add to `apps/role-manager/src/core/ecosystems/ecosystemManager.ts`:

```typescript
/**
 * Get a network configuration by its ID.
 * Ported from UI Builder's ecosystemManager pattern.
 *
 * Uses two-step lookup:
 * 1. Check already-cached ecosystems first
 * 2. Load ecosystems on-demand if not found
 */
export async function getNetworkById(id: string): Promise<NetworkConfig | undefined> {
  // 1. Check existing cached ecosystems first
  for (const ecosystemKey of Object.keys(networksByEcosystemCache)) {
    const ecosystem = ecosystemKey as Ecosystem;
    const cachedNetworks = networksByEcosystemCache[ecosystem];
    if (cachedNetworks) {
      const network = cachedNetworks.find((n) => n.id === id);
      if (network) return network;
    }
  }

  // 2. If not found, iterate through all registered ecosystems and load on-demand
  const allEcosystems: Ecosystem[] = ['evm', 'stellar']; // Add more as supported

  for (const ecosystem of allEcosystems) {
    let networksForEcosystem = networksByEcosystemCache[ecosystem];

    if (!networksForEcosystem) {
      try {
        networksForEcosystem = await getNetworksByEcosystem(ecosystem);
      } catch {
        continue; // Skip ecosystems that fail to load
      }
    }

    const foundNetwork = networksForEcosystem?.find((n) => n.id === id);
    if (foundNetwork) return foundNetwork;
  }

  return undefined;
}
```

### 5. Create WalletSyncProvider

Create `apps/role-manager/src/context/WalletSyncProvider.tsx`:

```typescript
import { useEffect } from 'react';
import { useWalletState } from '@openzeppelin/ui-builder-react-core';
import { useContractContext } from './ContractContext';

interface WalletSyncProviderProps {
  children: React.ReactNode;
}

/**
 * Synchronizes network selection with wallet state.
 * When a network is selected, updates WalletStateProvider with the network ID.
 */
export function WalletSyncProvider({ children }: WalletSyncProviderProps) {
  const { selectedNetwork } = useContractContext();
  const { setActiveNetworkId } = useWalletState();

  useEffect(() => {
    setActiveNetworkId(selectedNetwork?.id ?? null);
  }, [selectedNetwork, setActiveNetworkId]);

  return <>{children}</>;
}
```

### 6. Create WalletHeaderSection

Create `apps/role-manager/src/components/Layout/WalletHeaderSection.tsx`:

```typescript
import { WalletConnectionHeader } from '@openzeppelin/ui-builder-react-core';
import { useContractContext } from '../../context/ContractContext';

interface WalletHeaderSectionProps {
  className?: string;
}

/**
 * Conditional wallet UI for the header.
 * Only renders when a network is selected from the ecosystem picker.
 */
export function WalletHeaderSection({ className }: WalletHeaderSectionProps) {
  const { selectedNetwork } = useContractContext();

  // Per spec: wallet UI only visible when network selected
  if (!selectedNetwork) {
    return null;
  }

  return (
    <div className={className}>
      <WalletConnectionHeader />
    </div>
  );
}
```

### 7. Update AppHeader

Modify `apps/role-manager/src/components/Layout/AppHeader.tsx`:

```typescript
import { Header as UIBuilderHeader } from '@openzeppelin/ui-builder-ui';
import { WalletHeaderSection } from './WalletHeaderSection';

export interface AppHeaderProps {
  onOpenSidebar: () => void;
}

export function AppHeader({ onOpenSidebar }: AppHeaderProps) {
  return (
    <UIBuilderHeader
      title="Role Manager"
      onOpenSidebar={onOpenSidebar}
      rightContent={<WalletHeaderSection />}
    />
  );
}
```

### 8. Update App.tsx provider hierarchy

Modify `apps/role-manager/src/App.tsx`:

```typescript
import { useCallback, useState } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AdapterProvider, WalletStateProvider } from '@openzeppelin/ui-builder-react-core';
import type { NativeConfigLoader } from '@openzeppelin/ui-builder-types';

import { MainLayout } from './components/Layout/MainLayout';
import { ContractProvider } from './context/ContractContext';
import { WalletSyncProvider } from './context/WalletSyncProvider';
import { getAdapter, getNetworkById } from './core/ecosystems/ecosystemManager';
// ... page imports ...

// Vite glob for wallet config files
const kitConfigImporters = import.meta.glob('./config/wallet/*.config.ts');

function App() {
  const [queryClient] = useState(() => new QueryClient({/* ... */}));

  const loadAppConfigModule: NativeConfigLoader = useCallback(async (relativePath) => {
    const importer = kitConfigImporters[relativePath];
    if (importer) {
      try {
        const module = await importer() as { default?: Record<string, unknown> };
        return module.default || module;
      } catch {
        return null;
      }
    }
    return null;
  }, []);

  // IMPORTANT: ContractProvider must be OUTSIDE WalletStateProvider
  // WalletStateProvider uses a dynamic key that causes remounts when adapter loads.
  // If ContractProvider were inside, it would reset selectedNetwork to null.
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AdapterProvider resolveAdapter={getAdapter}>
          <ContractProvider>
            <WalletStateProvider
              initialNetworkId={null}
              getNetworkConfigById={getNetworkById}
              loadConfigModule={loadAppConfigModule}
            >
              <WalletSyncProvider>
                <MainLayout>
                  <Routes>
                    {/* ... routes ... */}
                  </Routes>
                </MainLayout>
              </WalletSyncProvider>
            </WalletStateProvider>
          </ContractProvider>
        </AdapterProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
```

## Testing the Implementation

1. **Start the dev server**:

   ```bash
   cd apps/role-manager
   pnpm dev
   ```

2. **Verify no wallet UI initially** (only if no network auto-selected):
   - Open the app in browser
   - If no network is selected, header shows only "Role Manager" title
   - No "Connect Wallet" button visible until network selected

3. **Select a Stellar network (PRIMARY TEST)**:
   - Use the ecosystem picker (NetworkSelector) in sidebar to select a Stellar network
   - "Connect Wallet" button should appear in header

4. **Connect Stellar wallet (PRIMARY)**:
   - Click "Connect Wallet"
   - Stellar Wallets Kit modal should appear
   - Select Freighter (or other installed Stellar wallet)
   - Approve connection in wallet extension
   - Header should show truncated Stellar address (G...)

5. **Switch Stellar networks**:
   - Click network indicator
   - Select different Stellar network (e.g., testnet vs mainnet)
   - Verify connection updates

6. **Test EVM wallet (future expansion)**:
   - Select an EVM network from the ecosystem picker
   - RainbowKit modal should appear
   - Select MetaMask or other EVM provider
   - Complete connection

7. **Disconnect**:
   - Click account/address in header
   - Select disconnect option
   - Verify header returns to "Connect Wallet" state

### Stellar Wallet Testing Checklist

- [ ] Freighter extension detected and works
- [ ] Albedo connection works
- [ ] xBull connection works
- [ ] Stellar address displayed correctly (G... format)
- [ ] Network indicator shows Stellar network name

## Troubleshooting

### Stellar (Primary Focus)

| Issue                               | Solution                                                    |
| ----------------------------------- | ----------------------------------------------------------- |
| Freighter not detected              | Ensure Freighter browser extension is installed and enabled |
| Stellar wallet modal doesn't appear | Verify adapter-stellar package is correctly installed       |
| Connection rejected                 | User must approve in wallet; check wallet extension popup   |
| Wrong Stellar network               | Use network switcher or configure wallet network settings   |

### EVM (Future Expansion)

| Issue                          | Solution                                       |
| ------------------------------ | ---------------------------------------------- |
| "WalletConnect not configured" | Verify `VITE_WALLETCONNECT_PROJECT_ID` is set  |
| RainbowKit modal not styled    | Ensure UI Builder styles imported in index.css |

### General

| Issue                                 | Solution                                       |
| ------------------------------------- | ---------------------------------------------- |
| No wallet button after network select | Check WalletSyncProvider is in provider tree   |
| Adapter loading forever               | Verify tarball packages installed correctly    |
| Wrong ecosystem wallet shown          | Network selection determines ecosystem/adapter |
