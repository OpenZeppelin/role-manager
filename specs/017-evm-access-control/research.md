# Research: EVM Access Control Integration

**Branch**: `017-evm-access-control` | **Date**: 2026-02-11

## Overview

All technical unknowns were resolved during the specification and clarification phases. This document records the decisions and rationale for each area investigated.

## Decisions

### 1. EVM Wallet Provider

- **Decision**: Use wagmi with the adapter's custom UI kit (not RainbowKit)
- **Rationale**: The EVM adapter already bundles `EvmWalletUiRoot` with wagmi, `WagmiProvider`, and connectors (MetaMask, WalletConnect, Safe, injected). Using the adapter's built-in provider ensures consistency with the UI Builder and avoids additional dependencies.
- **Alternatives considered**: RainbowKit (rejected — adds UI dependency beyond adapter's custom kit), Web3Modal (rejected — different abstraction layer)

### 2. Contract ABI Sourcing

- **Decision**: Auto-fetch from Etherscan V2 / Sourcify for verified contracts only
- **Rationale**: The EVM adapter's `loadContract(address)` handles the full flow: Etherscan V2 unified API → V1 fallback → Sourcify. Proxy detection is built in. Manual ABI pasting deferred to future iteration.
- **Alternatives considered**: Manual ABI paste (rejected for this iteration — worse UX), block explorer API direct call (rejected — adapter already provides this)

### 3. Expiration Terminology

- **Decision**: Fix at ui-types package level with adapter-driven metadata
- **Rationale**: The current `expirationBlock` field conflates three different semantics (Stellar ledger number, EVM block number, UNIX timestamp). A chain-agnostic metadata approach lets the adapter communicate what kind of expiration it uses, and the UI renders accordingly without chain-specific knowledge.
- **Alternatives considered**: Ecosystem-specific UI labels (rejected — violates chain-agnostic principle), generic "expiration" without type info (rejected — insufficient for correct display)

### 4. EVM-Specific Operations Scope

- **Decision**: In scope, implemented chain-agnostically via capability flags
- **Rationale**: `renounceOwnership`, `renounceRole`, `cancelAdminTransfer`, `changeAdminDelay`, `rollbackAdminDelay` should appear when the adapter reports the capability. The UI checks `hasRenounceOwnership`, `hasRenounceRole`, etc. — not the ecosystem identity.
- **Alternatives considered**: Out of scope (rejected — these are important administrative operations), EVM-only code paths (rejected — violates chain-agnostic principle)

### 5. EVM Configuration Pattern

- **Decision**: Follow UI Builder's `AppConfigService` pattern
- **Rationale**: The EVM adapter reads credentials internally from `AppConfigService`. The Role Manager only needs: `public/app.config.json` with `globalServiceConfigs.walletconnect.projectId` and `walletui.evm.kitName: "custom"`, plus `.env.local` with `VITE_APP_CFG_SERVICE_ETHERSCANV2_API_KEY`.
- **Alternatives considered**: Pass credentials directly to adapter constructor (rejected — adapter reads via AppConfigService), store in IndexedDB (rejected — credentials should not persist in browser storage)

### 6. Renounce Confirmation Pattern

- **Decision**: Type-to-confirm (user types "RENOUNCE" to enable submit)
- **Rationale**: Industry standard for irreversible destructive actions in blockchain UIs. Prevents accidental clicks more effectively than simple confirm buttons.
- **Alternatives considered**: Simple confirm button (rejected — too easy to accidentally click), checkbox acknowledgment (rejected — less deliberate than typing)

### 7. Prerequisite Work Ownership

- **Decision**: Prerequisites land upstream as separate releases before this branch
- **Rationale**: Clean separation of concerns. The Role Manager branch should only contain Role Manager changes. Updated `ui-types`, `adapter-evm`, and `adapter-stellar` packages are hard dependencies.
- **Alternatives considered**: All-in-one branch (rejected — mixes concerns across repos), stub/mock approach (rejected — client directed no stubs)

### 8. Ecosystem Switching Architecture

- **Decision**: Use existing `WalletStateProvider` single-provider pattern
- **Rationale**: Already proven in UI Builder and openzeppelin-ui example app. Single ecosystem provider mounted at a time, swapped via React `key` prop. Adapter singletons maintained by `AdapterProvider`. Role Manager already has this infrastructure — no architectural changes needed.
- **Alternatives considered**: Multi-provider (both mounted simultaneously, rejected — cross-context issues), page reload on switch (rejected — poor UX)

### 9. Role Label Display

- **Decision**: Display adapter-provided `RoleIdentifier.label`; truncated hash + copy for unlabeled
- **Rationale**: The EVM adapter's three-layer label resolution (well-known dictionary → ABI discovery → external labels) provides labels pre-resolved in `RoleIdentifier.label`. The Role Manager simply displays what the adapter provides.
- **Alternatives considered**: Role Manager resolves labels itself (rejected — violates adapter-led principle), always show hash (rejected — poor UX for known roles)

## Technology Patterns

### Existing Patterns Reused

- **Mutation hooks**: Follow `useAccessControlMutations` pattern (wraps service calls with React Query mutations)
- **Dialog state hooks**: Follow `useOwnershipTransferDialog` / `useAdminTransferDialog` pattern
- **Capability-driven rendering**: Check `capabilities.hasX` before rendering actions (existing pattern from specs 015/016)
- **React Query caching**: Query keys like `['contractRoles', address]` with invalidation on mutations
- **Error classification**: Network disconnection detection, user rejection detection (existing patterns)

### New Patterns Introduced

- **Type-to-confirm dialog**: New shared component for destructive actions; reusable beyond this feature
- **Role hash display**: New shared component for truncated hash + copy; reusable for any hex identifier
- **Adapter-driven expiration**: New utility layer that reads expiration metadata from adapter instead of hardcoding chain terms
