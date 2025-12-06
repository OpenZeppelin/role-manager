# Tasks: Roles Page Layout Skeleton

**Input**: Design documents from `/specs/008-roles-page-layout/`  
**Prerequisites**: plan.md, spec.md, data-model.md, contracts/components.ts

**Tests**: Not required per constitution (UI-only components)

**Organization**: Tasks grouped by user story for independent implementation

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story (US1-US5) this task belongs to
- All file paths relative to `apps/role-manager/src/`

---

## Phase 1: Setup

**Purpose**: Create component directory structure and type definitions

- [x] T001 Create `components/Roles/` directory for feature components
- [x] T002 Create type definitions in `types/roles.ts` with Role, RoleAccount, RoleIdentifier interfaces per data-model.md

**Checkpoint**: Directory structure and types ready ✅

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Mock data required by ALL user stories - MUST complete before any story

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T003 Create mock data file `components/Roles/mockData.ts` with:
  - `MOCK_CURRENT_USER` address constant
  - `mockRoles: Role[]` (8 roles per data-model.md)
  - `mockRoleAccounts: Record<string, RoleAccount[]>` (accounts grouped by role)
  - `mockRoleIdentifiers: RoleIdentifier[]` (8 identifier entries)

**Checkpoint**: Foundation ready - user story implementation can begin ✅

---

## Phase 3: User Story 1 - View Available Roles (Priority: P1) 🎯 MVP

**Goal**: Display scrollable list of role cards with name, member count, and description

**Independent Test**: Navigate to Roles page → verify 8 role cards render with correct mock data

### Implementation for User Story 1

- [x] T004 [P] [US1] Create `components/Roles/RoleCard.tsx` implementing RoleCardProps interface:
  - Import Card, CardHeader, CardContent from `@openzeppelin/ui-builder-ui`
  - Display role icon (Crown for Owner, Shield for others per FR-007a), name (font-semibold), member count, description
  - Show "Connected" badge when `isConnected={true}`
  - Apply selection border (border-primary, 2px) when `isSelected={true}`

- [x] T005 [US1] Create `components/Roles/RolesList.tsx` implementing RolesListProps interface:
  - Scrollable container (max-height calc(100vh-300px), overflow-y auto)
  - Map roles to RoleCard components with 8px gap
  - Handle selection state via `onSelectRole` callback

**Checkpoint**: Role cards display in scrollable list - US1 independently testable ✅

---

## Phase 4: User Story 2 - Select and View Role Details (Priority: P1) 🎯 MVP

**Goal**: Click role card to show details panel with assigned accounts

**Independent Test**: Click different role cards → verify right panel updates with role name, description, accounts

**Depends on**: US1 (RoleCard/RolesList for selection)

### Implementation for User Story 2

- [x] T006 [P] [US2] Create `components/Roles/AccountRow.tsx` implementing AccountRowProps interface:
  - Import AddressDisplay from `@openzeppelin/ui-builder-ui` with startChars=10, endChars=7, showCopyButton=true
  - Display "You" badge for current user (bg-primary/10, text-primary, rounded-full)
  - Display assignment date for non-owner roles (format: M/D/YYYY)
  - Render action button: "Transfer Ownership" (owner) or "Revoke" (non-owner)

- [x] T007 [US2] Create `components/Roles/RoleDetails.tsx` implementing RoleDetailsProps interface:
  - Import Card, Button from `@openzeppelin/ui-builder-ui`
  - Display role name with icon, description
  - "Assigned Accounts (N)" header with "+ Assign" button (non-owner only)
  - Map accounts to AccountRow components
  - Empty state: "No accounts assigned to this role" (centered, py-8, text-muted)

- [x] T008 [US2] Update `pages/Roles.tsx` with two-panel layout:
  - Import PageHeader from `components/Shared/PageHeader`
  - Add `useState<string>('OWNER_ROLE')` for selection
  - Two-panel flex layout: RolesList (~40%, max 480px) + RoleDetails (~60%)
  - 24px gap between panels (gap-6)
  - Wire up selection: `onSelectRole` → `setSelectedRoleId`

**Checkpoint**: Full role browsing works - US1+US2 MVP independently testable ✅

---

## Phase 5: User Story 3 - View Role Identifiers Reference (Priority: P2)

**Goal**: Display reference table of all role identifiers

**Independent Test**: Scroll to bottom → verify table shows 8 role identifiers with columns

### Implementation for User Story 3

- [ ] T009 [US3] Create `components/Roles/RoleIdentifiersTable.tsx` implementing RoleIdentifiersTableProps interface:
  - Section header "Available Role Identifiers" with description
  - HTML table with columns: Role Identifier (monospace), Name, Description
  - Tailwind styling: border, rounded, text-sm
  - No interactive elements (read-only per FR-023)

- [ ] T010 [US3] Add RoleIdentifiersTable to `pages/Roles.tsx`:
  - Import mockRoleIdentifiers from mockData
  - Place below two-panel layout with 24px margin-top (mt-6)

**Checkpoint**: Role identifiers reference table visible - US3 independently testable

---

## Phase 6: User Story 4 - Copy Account Address (Priority: P2)

**Goal**: Copy account address to clipboard with visual feedback

**Independent Test**: Click copy button → verify checkmark appears for 2 seconds

### Acceptance Verification for User Story 4

> **Note**: US4 is implemented as part of T006 (AccountRow.tsx) via AddressDisplay component. This phase is an acceptance check, not new implementation.

- [ ] T011 [US4] **[VERIFY]** Acceptance check for AddressDisplay integration in AccountRow.tsx:
  - Confirm `showCopyButton={true}` prop is set in T006 implementation
  - Test: Click copy button → checkmark icon appears for 2 seconds
  - AddressDisplay handles copy + feedback automatically (built-in to UI Builder)
  - Mark complete after T006 is verified working

**Checkpoint**: Copy functionality works via AddressDisplay - US4 acceptance verified

---

## Phase 7: User Story 5 - View Security Notice (Priority: P3)

**Goal**: Display security warning banner at page bottom

**Independent Test**: Scroll to bottom → verify amber warning banner with security text

### Implementation for User Story 5

- [ ] T012 [US5] Create `components/Roles/SecurityNotice.tsx` implementing SecurityNoticeProps interface:
  - Import Alert, AlertTitle, AlertDescription from `@openzeppelin/ui-builder-ui` OR custom div
  - AlertTriangle icon from lucide-react
  - Amber styling: bg-amber-50, border-amber-200, text-amber-800
  - Static text per FR-025 about transaction confirmation and Owner privileges

- [ ] T013 [US5] Add SecurityNotice to `pages/Roles.tsx`:
  - Place at page bottom with 24px margin-top (mt-6)

**Checkpoint**: Security notice visible - US5 independently testable

---

## Phase 8: Polish & Integration

**Purpose**: Finalize exports and ensure all components work together

- [ ] T014 Create barrel export `components/Roles/index.ts` exporting:
  - RoleCard, RolesList, AccountRow, RoleDetails, RoleIdentifiersTable, SecurityNotice
  - Re-export types from `types/roles.ts` for convenience

- [ ] T015 Final verification against design screenshots:
  - Compare layout with `assets/screencapture-oz-oss-apps-access-manager-vercel-app-2025-12-05-20_51_11-*.png`
  - Compare layout with `assets/screencapture-oz-oss-apps-access-manager-vercel-app-2025-12-05-20_52_54-*.png`
  - Verify spacing, typography, colors match design

- [ ] T016 [P] Run linting and fix any issues: `pnpm --filter @openzeppelin/role-manager-app lint:fix`

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1: Setup ─────────────────┐
                                ▼
Phase 2: Foundational ──────────┤ (BLOCKS all user stories)
                                ▼
        ┌───────────────────────┼───────────────────────┐
        ▼                       ▼                       ▼
Phase 3: US1 (P1)         Phase 5: US3 (P2)       Phase 7: US5 (P3)
        │                       │                       │
        ▼                       │                       │
Phase 4: US2 (P1)         Phase 6: US4 (P2)            │
        │                       │                       │
        └───────────────────────┴───────────────────────┘
                                ▼
                    Phase 8: Polish & Integration
```

### User Story Dependencies

| Story | Priority | Depends On               | Can Parallel With |
| ----- | -------- | ------------------------ | ----------------- |
| US1   | P1       | Foundational             | US3, US5          |
| US2   | P1       | US1 (RoleCard/RolesList) | US3, US5          |
| US3   | P2       | Foundational             | US1, US5          |
| US4   | P2       | US2 (AccountRow)         | -                 |
| US5   | P3       | Foundational             | US1, US3          |

### Parallel Opportunities

**Within Foundational**:

- T001 and T002 can run in parallel

**After Foundational**:

- T004 (RoleCard) and T006 (AccountRow) can run in parallel
- T009 (RoleIdentifiersTable) and T012 (SecurityNotice) can run in parallel
- US1, US3, US5 can all start in parallel

**Within Polish**:

- T014, T015, T016 can run in parallel

---

## Parallel Example: After Foundational

```bash
# Launch independent components together:
Task: T004 [US1] "Create RoleCard.tsx"
Task: T006 [US2] "Create AccountRow.tsx"
Task: T009 [US3] "Create RoleIdentifiersTable.tsx"
Task: T012 [US5] "Create SecurityNotice.tsx"
```

---

## Implementation Strategy

### MVP First (US1 + US2 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: US1 (role cards display)
4. Complete Phase 4: US2 (role details + selection)
5. **STOP and VALIDATE**: Two-panel layout works
6. Deploy/demo if ready

### Full Feature Delivery

1. Complete MVP (US1 + US2)
2. Add US3 (role identifiers table)
3. Add US4 (verify copy works - minimal effort)
4. Add US5 (security notice)
5. Complete Polish phase
6. Final validation against screenshots

---

## Notes

- All components use mock data - no real blockchain calls
- Interactive buttons are visual only (callbacks optional)
- AddressDisplay from UI Builder handles copy functionality
- Total: **16 tasks** across 8 phases
- Estimated time: 2-3 hours for full implementation
