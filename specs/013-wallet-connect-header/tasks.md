# Tasks: Wallet Connect Header Module

**Input**: Design documents from `/specs/013-wallet-connect-header/`  
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅

**Tests**: Unit tests required for hook state logic per constitution (Principle V). UI components use manual testing via quickstart.md.

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4)
- Paths relative to repository root

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Add dependencies and create project structure for wallet integration

- [x] T001 Add `@openzeppelin/ui-builder-react-core` dependency to `apps/role-manager/package.json`
- [x] T002 [P] Create wallet config directory structure at `apps/role-manager/src/config/wallet/`
- [x] T003 [P] Add `VITE_WALLETCONNECT_PROJECT_ID` to `.env.example` in `apps/role-manager/`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure required before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T004 Port `getNetworkById` function to `apps/role-manager/src/core/ecosystems/ecosystemManager.ts`
- [x] T005 [P] Create `loadAppConfigModule` helper using Vite's `import.meta.glob` in `apps/role-manager/src/App.tsx`
- [x] T006 [P] Create Stellar Wallets Kit config at `apps/role-manager/src/config/wallet/stellar-wallets-kit.config.ts`
- [x] T007 [P] Create RainbowKit config at `apps/role-manager/src/config/wallet/rainbowkit.config.ts`
- [x] T008 Add `AdapterProvider` wrapper to provider hierarchy in `apps/role-manager/src/App.tsx`
- [x] T009 Add `WalletStateProvider` wrapper (inside AdapterProvider) in `apps/role-manager/src/App.tsx`

**Checkpoint**: Provider hierarchy ready - user story implementation can begin ✅

---

## Phase 3: User Story 1 & 2 - Connect Wallet & View Status (Priority: P1) 🎯 MVP

**Goal**: Users can connect a wallet from the header and see their connection status

**Independent Test**:

1. Select a network from ecosystem picker → "Connect Wallet" button appears in header
2. Click connect → Wallet modal appears with ecosystem-appropriate options
3. Complete connection → Address displayed in header

**Note**: US1 and US2 are combined because they share the same components and are both P1 priority.

### Implementation

- [x] T010 [US1] Create `WalletSyncProvider` component at `apps/role-manager/src/context/WalletSyncProvider.tsx` (syncs `selectedNetwork` from `ContractContext` to wallet adapter)
- [x] T010a [US1] Write unit tests for `WalletSyncProvider` hook logic at `apps/role-manager/src/context/__tests__/WalletSyncProvider.test.tsx`
- [x] T011 [US1] Add `WalletSyncProvider` to provider hierarchy in `apps/role-manager/src/App.tsx`
- [x] T012 [P] [US1] Create `WalletHeaderSection` component at `apps/role-manager/src/components/Layout/WalletHeaderSection.tsx` (shows wallet UI when network is selected)
- [x] T013 [US1] Update `AppHeader` to include `WalletHeaderSection` in `apps/role-manager/src/components/Layout/AppHeader.tsx`

**Checkpoint**: User Stories 1 & 2 complete - users can connect wallet and view status ✅

---

## Phase 4: User Story 3 - Disconnect Wallet (Priority: P2)

**Goal**: Users can disconnect their wallet from the header

**Independent Test**:

1. With wallet connected, click account display
2. Click disconnect button
3. Header returns to "Connect Wallet" state

### Implementation

- [x] T014 [US3] Verify disconnect functionality works via `CustomAccountDisplay` (provided by adapter - no code needed, just verification)

**Note**: Disconnect is fully provided by `CustomAccountDisplay` component from adapters. This phase is verification only.

**Checkpoint**: User Story 3 complete - disconnect works via adapter component

---

## Phase 5: User Story 4 - Multiple Ecosystem Support (Priority: P3)

**Goal**: Users can connect wallets from Stellar (primary) and EVM (future) ecosystems

**Independent Test**:

1. Select Stellar network from ecosystem picker → Stellar wallet options appear (Freighter, Albedo, xBull)
2. Select EVM network from ecosystem picker → EVM wallet options appear (MetaMask, WalletConnect)

### Implementation

- [x] T015a [US4] Add NetworkSwitchManager component (copied from UI Builder) at `apps/role-manager/src/components/Wallet/NetworkSwitchManager.tsx`
- [x] T015b [US4] Update WalletSyncProvider to integrate NetworkSwitchManager with networkToSwitchTo state tracking
- [x] T015c [US4] Add wallet reconnection handling to WalletSyncProvider (re-queue switch on reconnect)
- [x] T015 [US4] Verify Stellar ecosystem integration with installed Stellar wallets (select Stellar network)
- [x] T016 [US4] Verify EVM ecosystem integration with browser wallets (select EVM network)

**Note**: Multi-ecosystem support now includes seamless network switching (users stay connected when switching networks). NetworkSwitchManager handles EVM chain switching. These are verification tasks.

**Checkpoint**: User Story 4 complete - both ecosystems supported

---

## Phase 6: Polish & Validation

**Purpose**: Final validation and documentation

- [x] T017 Run full quickstart.md validation checklist
- [x] T018 [P] Verify loading skeleton appears during adapter initialization
- [x] T019 [P] Verify error handling displays raw wallet provider errors
- [x] T020 [P] Test ecosystem switching (select different ecosystem network from sidebar, verify adapter switch)
- [x] T021 Update any outdated documentation if needed

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1 (Setup)
    ↓
Phase 2 (Foundational) ← BLOCKS all user stories
    ↓
Phase 3 (US1 & US2 - MVP) ← Can start after Phase 2
    ↓
Phase 4 (US3) ← Verification only, minimal work
    ↓
Phase 5 (US4) ← Verification only, minimal work
    ↓
Phase 6 (Polish)
```

### Task Dependencies Within Phases

**Phase 2 (Foundational)**:

- T004 (getNetworkById) → No dependencies
- T005-T007 → Can run in parallel [P]
- T008 (AdapterProvider) → Depends on T004
- T009 (WalletStateProvider) → Depends on T005, T008

**Phase 3 (US1 & US2)**:

- T010 (WalletSyncProvider) → Depends on Phase 2 complete
- T010a (WalletSyncProvider tests) → Depends on T010
- T011 (Add to App.tsx) → Depends on T010
- T012 (WalletHeaderSection) → Can run parallel with T010-T011 [P]
- T013 (Update AppHeader) → Depends on T012

### Parallel Opportunities

```bash
# Phase 1 - All parallel:
T002, T003 can run in parallel

# Phase 2 - Parallel groups:
T005, T006, T007 can run in parallel

# Phase 3 - Some parallel:
T012 can run parallel with T010, T011

# Phase 6 - All parallel:
T018, T019, T020 can run in parallel
```

---

## Implementation Strategy

### MVP Scope (Recommended)

1. Complete Phase 1: Setup (3 tasks)
2. Complete Phase 2: Foundational (6 tasks)
3. Complete Phase 3: User Stories 1 & 2 (5 tasks, includes unit test)
4. **STOP and VALIDATE**: Test wallet connect/view flow
5. Deploy/demo - **14 tasks total for MVP**

### Full Implementation

1. MVP (Phases 1-3) → 14 tasks
2. Add Phase 4: US3 verification → 1 task
3. Add Phase 5: US4 verification → 2 tasks
4. Add Phase 6: Polish → 5 tasks
5. **Total: 22 tasks**

### Key Insight: Minimal Custom Code

Most wallet functionality is provided by UI Builder adapters:

- **Role Manager implements**: Provider integration (T008-T011), conditional rendering based on `selectedNetwork` (T012-T013)
- **Adapters provide**: Connect button, account display, disconnect, wallet modals, error handling
- **Ecosystem determination**: Via `selectedNetwork.ecosystem` from the ecosystem picker in sidebar (NOT from selected contract)

---

## Task Summary

| Phase     | Tasks  | Description                          |
| --------- | ------ | ------------------------------------ |
| Phase 1   | 3      | Setup & dependencies                 |
| Phase 2   | 6      | Foundational (provider hierarchy)    |
| Phase 3   | 5      | US1 & US2 - Connect & View (MVP)     |
| Phase 4   | 1      | US3 - Disconnect (verification)      |
| Phase 5   | 2      | US4 - Multi-ecosystem (verification) |
| Phase 6   | 5      | Polish & validation                  |
| **Total** | **22** |                                      |

### Tasks per User Story

| User Story            | Tasks | Notes                        |
| --------------------- | ----- | ---------------------------- |
| US1 (Connect)         | 5     | Combined with US2, incl test |
| US2 (View Status)     | 0     | Shared with US1              |
| US3 (Disconnect)      | 1     | Verification only            |
| US4 (Multi-ecosystem) | 2     | Verification only            |

---

## Notes

- Most functionality provided by UI Builder adapters - minimal custom code required
- US1 & US2 combined because they share components and are both P1 priority
- US3 & US4 are primarily verification tasks since adapters handle the functionality
- Stellar is primary focus; EVM is future expansion
- Unit tests required for hook state logic (WalletSyncProvider) per constitution Principle V
- UI components use manual validation via quickstart.md
- [P] tasks can run in parallel within their phase
- **Ecosystem determination**: The ecosystem is derived from `selectedNetwork.ecosystem` (via the NetworkSelector/ecosystem picker in the sidebar), NOT from the selected contract
