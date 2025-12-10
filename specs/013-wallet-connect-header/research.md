# Research: Wallet Connect Header Module

**Feature**: 013-wallet-connect-header  
**Date**: 2025-12-10

## Research Tasks Completed

### 1. UI Builder React Core Integration Pattern

**Decision**: Use `AdapterProvider` and `WalletStateProvider` from `@openzeppelin/ui-builder-react-core`

**Rationale**:

- These providers are the established pattern used by UI Builder's main app
- `AdapterProvider` manages adapter singleton instances and caching
- `WalletStateProvider` manages wallet connection state and UI kit configuration
- Both providers work together to provide a complete wallet experience

**Alternatives Considered**:

- Direct wagmi/viem integration: Rejected - would bypass adapter abstraction, violates constitution
- Custom wallet context: Rejected - duplicates existing functionality in react-core package

**Reference Implementation** (UI Builder App.tsx):

```tsx
<AdapterProvider resolveAdapter={getAdapter}>
  <WalletStateProvider
    initialNetworkId={null}
    getNetworkConfigById={getNetworkById}
    loadConfigModule={loadAppConfigModule}
  >
    {/* App content */}
  </WalletStateProvider>
</AdapterProvider>
```

### 2. WalletStateProvider Requirements

**Decision**: Provide three configuration functions to `WalletStateProvider`

**Required Props**:

| Prop                   | Type                                                 | Source in Role Manager                             |
| ---------------------- | ---------------------------------------------------- | -------------------------------------------------- |
| `initialNetworkId`     | `string \| null`                                     | `null` (ecosystem picker selection drives network) |
| `getNetworkConfigById` | `(id: string) => NetworkConfig \| null`              | New function in ecosystemManager                   |
| `loadConfigModule`     | `(path: string) => Promise<Record<string, unknown>>` | New function using Vite's `import.meta.glob`       |

**Rationale**: These props allow `WalletStateProvider` to:

- Resolve network configurations to load the correct adapter
- Load UI kit configurations (e.g., RainbowKit) dynamically

### 3. Contract Context ↔ Wallet State Synchronization

**Decision**: Create `WalletSyncProvider` component to bridge the two contexts

**Rationale**:

- Role Manager's `ContractContext` manages contract/network selection
- UI Builder's `WalletStateProvider` needs to know the active network for wallet operations
- A sync provider subscribes to contract context and updates wallet state accordingly

**Pattern**:

```tsx
function WalletSyncProvider({ children }) {
  const { selectedNetwork } = useContractContext();
  const { setActiveNetworkId } = useWalletState();

  useEffect(() => {
    // Sync network selection to wallet state
    setActiveNetworkId(selectedNetwork?.id ?? null);
  }, [selectedNetwork, setActiveNetworkId]);

  return <>{children}</>;
}
```

### 4. Header Component Architecture

**Decision**: Create `WalletHeaderSection` wrapper component

**Rationale**:

- Encapsulates the network-selection check logic
- Returns `null` when no network selected (per spec requirement)
- Renders `WalletConnectionHeader` from react-core when network available

**Component Structure**:

```tsx
function WalletHeaderSection() {
  const { selectedNetwork } = useContractContext();

  // Per spec: wallet UI only visible when network selected
  if (!selectedNetwork) {
    return null;
  }

  return <WalletConnectionHeader />;
}
```

### 5. UI Kit Configuration (Ecosystem-Specific)

**Decision**: Create ecosystem-specific wallet UI kit configurations

**Rationale**:

- Each ecosystem has its own wallet UI kit:
  - **Stellar (Primary Focus)**: Stellar Wallets Kit (`@creit.tech/stellar-wallets-kit`)
  - **EVM (Future Expansion)**: RainbowKit
- UI Builder adapters already integrate with these kits
- Configuration files follow established patterns in UI Builder

**Stellar Wallets Kit Configuration** (Primary):

- Supported wallets: Freighter, Albedo, xBull, and other Stellar wallets
- No external project ID required (unlike WalletConnect)
- Configuration managed by adapter-stellar's `stellarUiKitManager`

**RainbowKit Configuration** (EVM, for future use):

- App name: "Role Manager"
- Project ID: Environment variable `VITE_WALLETCONNECT_PROJECT_ID`
- Default chains: Loaded from adapter networks

### 6. Network Configuration Lookup Function

**Decision**: Port `getNetworkById` function from UI Builder's ecosystemManager

**Rationale**:

- `WalletStateProvider` needs to look up network config by ID
- **UI Builder already has this exact function** in their `ecosystemManager.ts`
- Role Manager's ecosystemManager is a simplified copy of UI Builder's - we should port this function too

**Reference** (UI Builder's implementation):

```typescript
// From contracts-ui-builder/packages/builder/src/core/ecosystemManager.ts
export async function getNetworkById(id: string): Promise<NetworkConfig | undefined> {
  // 1. Check all existing populated ecosystem-specific caches first
  for (const ecosystemKey of Object.keys(networksByEcosystemCache)) {
    const ecosystem = ecosystemKey as Ecosystem;
    const cachedNetworksForEcosystem = networksByEcosystemCache[ecosystem];
    if (cachedNetworksForEcosystem) {
      const network = cachedNetworksForEcosystem.find((n) => n.id === id);
      if (network) return network;
    }
  }

  // 2. If not found, iterate through all registered ecosystems and load on-demand
  const allEcosystems = Object.keys(ecosystemRegistry) as Ecosystem[];
  for (const ecosystem of allEcosystems) {
    let networksForEcosystem = networksByEcosystemCache[ecosystem];
    if (!networksForEcosystem) {
      networksForEcosystem = await getNetworksByEcosystem(ecosystem);
    }
    const foundNetwork = networksForEcosystem?.find((n) => n.id === id);
    if (foundNetwork) return foundNetwork;
  }

  return undefined;
}
```

**Note**: Returns `undefined` (not `null`) to match UI Builder's pattern.

## Dependencies to Add

| Package                               | Version   | Purpose                                  |
| ------------------------------------- | --------- | ---------------------------------------- |
| `@openzeppelin/ui-builder-react-core` | `^0.16.0` | Wallet state management, AdapterProvider |

**Setup Script Update**: The `scripts/setup-local-dev.cjs` has been updated to include `@openzeppelin/ui-builder-react-core` in the `UI_BUILDER_PACKAGES` list for local tarball workflow support.

## Environment Variables

| Variable                        | Required                | Purpose                        |
| ------------------------------- | ----------------------- | ------------------------------ |
| `VITE_WALLETCONNECT_PROJECT_ID` | Yes (for WalletConnect) | WalletConnect Cloud project ID |

## Outstanding Items

None - all research tasks resolved.
