# Interface Contracts: Wallet Connect Header Module

**Feature**: 013-wallet-connect-header  
**Date**: 2025-12-10

## Overview

This feature consumes existing interfaces from UI Builder packages and introduces minimal new interfaces for the Role Manager integration layer. No REST/GraphQL APIs are introduced as this is entirely client-side.

## New Interfaces (Role Manager)

### WalletSyncProvider

Bridges the ContractContext with WalletStateProvider.

```typescript
/**
 * Props for WalletSyncProvider component
 */
interface WalletSyncProviderProps {
  children: React.ReactNode;
}

/**
 * Component that synchronizes network selection with wallet state.
 *
 * @contract
 * - MUST read selectedNetwork from ContractContext
 * - MUST call setActiveNetworkId when selectedNetwork changes
 * - MUST pass null to setActiveNetworkId when no network selected
 * - MUST NOT modify ContractContext state
 */
declare function WalletSyncProvider(props: WalletSyncProviderProps): JSX.Element;
```

### WalletHeaderSection

Conditional wrapper for wallet UI in header.

```typescript
/**
 * Props for WalletHeaderSection component
 */
interface WalletHeaderSectionProps {
  className?: string;
}

/**
 * Component that conditionally renders wallet connection UI.
 *
 * @contract
 * - MUST read selectedNetwork from ContractContext
 * - MUST return null when selectedNetwork is null/undefined
 * - MUST render WalletConnectionHeader when selectedNetwork exists
 * - MUST forward className to WalletConnectionHeader container
 */
declare function WalletHeaderSection(props: WalletHeaderSectionProps): JSX.Element | null;
```

### getNetworkById (Ported from UI Builder)

Ports the network lookup function from UI Builder's ecosystemManager.

```typescript
/**
 * Retrieves a network configuration by its unique ID.
 * Ported from UI Builder's ecosystemManager pattern.
 *
 * @contract
 * - MUST check cached ecosystems first (performance optimization)
 * - MUST load ecosystems on-demand if network not found in cache
 * - MUST return the first matching network
 * - MUST return undefined if no network found (matches UI Builder pattern)
 * - MUST NOT throw on invalid networkId
 *
 * @param id - The unique network identifier
 * @returns NetworkConfig if found, undefined otherwise
 */
declare function getNetworkById(id: string): Promise<NetworkConfig | undefined>;
```

### loadAppConfigModule

Configuration loader for UI kit configs.

```typescript
/**
 * Loads UI kit configuration modules dynamically.
 *
 * @contract
 * - MUST use Vite's import.meta.glob for module resolution
 * - MUST return module.default if available
 * - MUST return null for missing modules (no throw)
 * - MUST handle './config/wallet/*.config.ts' paths
 *
 * @param relativePath - Path relative to app root
 * @returns Configuration object or null
 */
declare function loadAppConfigModule(relativePath: string): Promise<Record<string, unknown> | null>;
```

## Consumed Interfaces (UI Builder)

### AdapterProvider

From `@openzeppelin/ui-builder-react-core`:

```typescript
interface AdapterProviderProps {
  children: React.ReactNode;
  resolveAdapter: (networkConfig: NetworkConfig) => Promise<ContractAdapter>;
}
```

### WalletStateProvider

From `@openzeppelin/ui-builder-react-core`:

```typescript
interface WalletStateProviderProps {
  children: React.ReactNode;
  initialNetworkId?: string | null;
  getNetworkConfigById: (
    networkId: string
  ) => Promise<NetworkConfig | null | undefined> | NetworkConfig | null | undefined;
  loadConfigModule?: (relativePath: string) => Promise<Record<string, unknown> | null>;
}
```

### WalletConnectionHeader

From `@openzeppelin/ui-builder-react-core`:

```typescript
/**
 * Pre-built wallet connection UI for header placement.
 * Internally uses useWalletState hook.
 *
 * @contract (from UI Builder)
 * - Renders loading skeleton when adapter loading
 * - Renders WalletConnectionUI when adapter ready
 * - Handles all wallet operations via adapter
 */
declare const WalletConnectionHeader: React.FC;
```

### useWalletState

From `@openzeppelin/ui-builder-react-core`:

```typescript
interface WalletStateContextValue {
  activeNetworkId: string | null;
  setActiveNetworkId: (networkId: string | null) => void;
  activeNetworkConfig: NetworkConfig | null;
  activeAdapter: ContractAdapter | null;
  isAdapterLoading: boolean;
  walletFacadeHooks: EcosystemSpecificReactHooks | null;
  reconfigureActiveAdapterUiKit: (config?: Partial<UiKitConfiguration>) => void;
}

declare function useWalletState(): WalletStateContextValue;
```

## Component Hierarchy Contract

```
AppHeader
└── rightContent (prop)
    └── WalletHeaderSection
        ├── [null if no network selected]
        └── WalletConnectionHeader (from react-core)
            ├── Loading: Skeleton
            └── Ready: WalletConnectionUI
                ├── NetworkSwitcher
                ├── AccountDisplay
                └── ConnectButton
```

## Error Handling Contract

| Scenario                | Handler                        | User Feedback                      |
| ----------------------- | ------------------------------ | ---------------------------------- |
| Network lookup fails    | Return null                    | Wallet UI not shown                |
| Adapter loading fails   | Handled by WalletStateProvider | Loading skeleton persists          |
| Wallet connection fails | Handled by adapter             | Error toast via WalletConnectionUI |
| Network switch fails    | Handled by adapter             | Error toast via WalletConnectionUI |
