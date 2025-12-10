# Implementation Plan: Wallet Connect Header Module

**Branch**: `013-wallet-connect-header` | **Date**: 2025-12-10 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `/specs/013-wallet-connect-header/spec.md`

## Summary

Add wallet connection capability to the Role Manager header by integrating the UI Builder's `@openzeppelin/ui-builder-react-core` package. The wallet UI is **network-dependent**: it only appears when a network is selected from the ecosystem picker in the sidebar (which determines the ecosystem via `selectedNetwork.ecosystem`). The implementation reuses the existing `ContractContext` for network selection and adds wallet state management via the UI Builder's established `WalletStateProvider` pattern.

## Technical Context

**Language/Version**: TypeScript 5.x, React 19.x  
**Primary Dependencies**:

- `@openzeppelin/ui-builder-react-core` (NEW - provides `AdapterProvider`, `WalletStateProvider`, `WalletConnectionHeader`)
- `@openzeppelin/ui-builder-adapter-stellar` (existing - **PRIMARY**: Stellar wallet support via Stellar Wallets Kit)
- `@openzeppelin/ui-builder-adapter-evm` (existing - EVM wallet support for future expansion)
- `@openzeppelin/ui-builder-types` (existing - type definitions)
- `@openzeppelin/ui-builder-ui` (existing - UI components)

**Storage**: N/A (wallet state managed by adapters, no additional persistence needed)  
**Testing**: Vitest for hooks/utils, manual testing for wallet flows  
**Target Platform**: Web SPA (browser)  
**Project Type**: Web application (monorepo app)  
**Performance Goals**: <1s UI update on connection state change (per SC-002)  
**Constraints**: Wallet UI only visible when network selected (per clarification)  
**Scale/Scope**: Single-user client-side application

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                      | Status  | Notes                                                                    |
| ------------------------------ | ------- | ------------------------------------------------------------------------ |
| I. Adapter-Led, Chain-Agnostic | ✅ PASS | Wallet logic resides in adapters; UI consumes generic interfaces         |
| II. Reuse-First                | ✅ PASS | Reuses `@openzeppelin/ui-builder-react-core` for wallet state management |
| III. Type Safety               | ✅ PASS | All new code will be fully typed; no `any` usage                         |
| IV. UI/Design System           | ✅ PASS | Uses `@openzeppelin/ui-builder-ui` components                            |
| V. Testing & TDD               | ✅ PASS | TDD for hooks/logic; UI components tested via Storybook                  |
| VI. Tooling & Persistence      | ✅ PASS | Client-side SPA; wallet state managed by adapters                        |

**Additional Constraints Check**:

- Storage: ✅ No localStorage for wallet data (adapter handles persistence)
- Security: ✅ No hardcoded secrets; relies on wallet connections
- Forms: ✅ N/A (no transaction forms in this feature)

## Project Structure

### Documentation (this feature)

```text
specs/013-wallet-connect-header/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (interfaces)
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
apps/role-manager/src/
├── components/
│   └── Layout/
│       ├── AppHeader.tsx          # MODIFY - add WalletConnectionHeader
│       └── WalletHeaderSection.tsx # NEW - conditional wallet UI wrapper
├── context/
│   ├── ContractContext.tsx        # EXISTING - provides selectedContract/Network
│   └── WalletSyncProvider.tsx     # NEW - syncs ContractContext → WalletState
├── config/
│   └── wallet/
│       ├── stellar-wallets-kit.config.ts  # NEW - Stellar Wallets Kit config (PRIMARY)
│       └── rainbowkit.config.ts           # NEW - RainbowKit config (EVM, future)
├── App.tsx                        # MODIFY - add provider hierarchy
└── core/
    └── ecosystems/
        └── ecosystemManager.ts    # EXISTING - adapter factory (already suitable)
```

**Structure Decision**: Follows existing Role Manager layout. New wallet-related components go in `Layout/` since they're part of the header. Wallet config goes in new `config/wallet/` directory following UI Builder pattern.

## Complexity Tracking

> No constitution violations requiring justification.

| Violation | Why Needed | Simpler Alternative Rejected Because |
| --------- | ---------- | ------------------------------------ |
| None      | N/A        | N/A                                  |

## Integration Architecture

### Provider Hierarchy (Modified)

```tsx
// App.tsx - Updated provider structure
// IMPORTANT: ContractProvider must be OUTSIDE WalletStateProvider to prevent
// infinite loop from remounting when WalletStateProvider's dynamic key changes.
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
            {/* NEW: syncs network selection → wallet state */}
            <MainLayout>
              <Routes>...</Routes>
            </MainLayout>
          </WalletSyncProvider>
        </WalletStateProvider>
      </ContractProvider>
    </AdapterProvider>
  </BrowserRouter>
</QueryClientProvider>
```

### Key Integration Points

1. **Network Selection → Wallet Adapter Sync**: When user selects a network from the ecosystem picker, `WalletSyncProvider` calls `setActiveNetworkId` on `WalletStateProvider` to configure the correct adapter for wallet operations.

2. **Header Conditional Rendering**: `WalletHeaderSection` reads `selectedNetwork` from `ContractContext` and only renders `WalletConnectionHeader` when a network is selected.

3. **Ecosystem Manager Integration**: The existing `getAdapter` function already creates adapter instances by network config, which is what `AdapterProvider.resolveAdapter` needs.
