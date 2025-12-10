# Data Model: Wallet Connect Header Module

**Feature**: 013-wallet-connect-header  
**Date**: 2025-12-10

## Overview

This feature primarily consumes existing data models from `@openzeppelin/ui-builder-types` and `@openzeppelin/ui-builder-react-core`. No new persistent entities are introduced. The wallet connection state is managed entirely by the UI Builder's adapter architecture.

## Consumed Types (from UI Builder)

### WalletConnectionStatus

```typescript
// From @openzeppelin/ui-builder-types/adapters/base.ts
interface WalletConnectionStatus {
  isConnected: boolean;
  address?: string;
  chainId?: string | number;
  isConnecting?: boolean;
  isDisconnected?: boolean;
  isReconnecting?: boolean;
  status?: 'connected' | 'connecting' | 'disconnected' | 'reconnecting';
  connector?: {
    id: string;
    name?: string;
    type?: string;
  };
}
```

### WalletStateContextValue

```typescript
// From @openzeppelin/ui-builder-react-core
interface WalletStateContextValue {
  activeNetworkId: string | null;
  setActiveNetworkId: (networkId: string | null) => void;
  activeNetworkConfig: NetworkConfig | null;
  activeAdapter: ContractAdapter | null;
  isAdapterLoading: boolean;
  walletFacadeHooks: EcosystemSpecificReactHooks | null;
  reconfigureActiveAdapterUiKit: (config?: Partial<UiKitConfiguration>) => void;
}
```

### NetworkConfig

```typescript
// From @openzeppelin/ui-builder-types
interface NetworkConfig {
  id: string;
  name: string;
  ecosystem: Ecosystem;
  chainId: number;
  // ... additional chain-specific properties
}
```

## Local Types (Role Manager)

### WalletSyncProviderProps

```typescript
// New type for the sync provider
interface WalletSyncProviderProps {
  children: React.ReactNode;
}
```

### WalletHeaderSectionProps

```typescript
// Optional - if props are needed for the header section
interface WalletHeaderSectionProps {
  className?: string;
}
```

## State Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                          App.tsx                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  AdapterProvider (resolves adapters by network config)       │   │
│  │  ┌───────────────────────────────────────────────────────┐  │   │
│  │  │  WalletStateProvider (manages wallet connection)       │  │   │
│  │  │  ┌─────────────────────────────────────────────────┐  │  │   │
│  │  │  │  ContractProvider (manages contract selection)   │  │  │   │
│  │  │  │  ┌───────────────────────────────────────────┐  │  │  │   │
│  │  │  │  │  WalletSyncProvider                        │  │  │  │   │
│  │  │  │  │  • Reads selectedNetwork from Contract     │  │  │  │   │
│  │  │  │  │  • Calls setActiveNetworkId on Wallet      │  │  │  │   │
│  │  │  │  │  ┌─────────────────────────────────────┐  │  │  │  │   │
│  │  │  │  │  │  MainLayout                          │  │  │  │   │
│  │  │  │  │  │  └── AppHeader                       │  │  │  │   │
│  │  │  │  │  │      └── WalletHeaderSection        │  │  │  │   │
│  │  │  │  │  │          └── WalletConnectionHeader │  │  │  │   │
│  │  │  │  │  │              (only if contract set)  │  │  │  │   │
│  │  │  │  │  └─────────────────────────────────────┘  │  │  │  │   │
│  │  │  │  └───────────────────────────────────────────┘  │  │  │   │
│  │  │  └─────────────────────────────────────────────────┘  │  │   │
│  │  └───────────────────────────────────────────────────────┘  │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

## State Transitions

### Wallet Connection State Machine

```
                    ┌──────────────────┐
                    │   disconnected   │
                    │  (no contract)   │
                    └────────┬─────────┘
                             │
                    Contract Selected
                             │
                             ▼
                    ┌──────────────────┐
                    │   disconnected   │◄──────────────────┐
                    │  (contract set)  │                   │
                    └────────┬─────────┘                   │
                             │                             │
                    User clicks Connect                    │
                             │                         Disconnect
                             ▼                             │
                    ┌──────────────────┐                   │
                    │    connecting    │                   │
                    └────────┬─────────┘                   │
                             │                             │
               ┌─────────────┼─────────────┐               │
               │             │             │               │
            Success       Rejected       Error             │
               │             │             │               │
               ▼             │             │               │
      ┌──────────────────┐   │             │               │
      │    connected     │───┴─────────────┴───────────────┘
      └────────┬─────────┘
               │
        Network Switch
               │
               ▼
      ┌──────────────────┐
      │   reconnecting   │
      └────────┬─────────┘
               │
               ▼
      ┌──────────────────┐
      │    connected     │ (new network)
      └──────────────────┘
```

## Validation Rules

| Field          | Rule                                                 | Error Message            |
| -------------- | ---------------------------------------------------- | ------------------------ |
| Network ID     | Must match an existing network in ecosystem registry | "Unknown network"        |
| Wallet Address | Must be valid for the ecosystem (adapter validates)  | "Invalid address format" |

## No New Persistent Storage

This feature does not introduce new IndexedDB tables or localStorage keys. Wallet connection persistence is handled by:

- **Stellar Wallets Kit** (Primary): Manages connection state for Stellar wallets (Freighter, Albedo, xBull)
- **wagmi** (for EVM, future): Persists connection in localStorage automatically
- **Adapter**: Each ecosystem's adapter handles reconnection on page refresh where supported by the wallet
