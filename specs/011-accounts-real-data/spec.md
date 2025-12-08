# Feature Specification: Authorized Accounts Real Data Integration

**Feature Branch**: `011-accounts-real-data`  
**Created**: 2025-12-08  
**Status**: Draft  
**Input**: User description: "Populate Authorized Accounts with real data. Only view functionality should be defined for this spec. It's a continuation of the spec 010. Replace mock data with real data from the existing data sources and services. Make sure to implement pagination - check if the underlying services already have pagination in the API. Include search and filtering too. Don't include 'adding account or role' functionality. Use existing patterns like in 'Roles' page. Make sure we do have 'Refresh' button in the same way as other pages, and caching. Don't forget that the data should automatically be loaded when the contract is selected/switched right on the 'Authorized Accounts' page."

## Overview

This specification defines the integration of real blockchain data into the Authorized Accounts page layout skeleton created in spec 010. The data layer has been fully implemented through previous specs (003-006), and the UI components are ready from spec 010. This feature connects these two layers, replacing mock data with live access control data from the adapter's Access Control module.

The page will display all accounts that have been granted roles on a contract, aggregating data from the new `useContractRolesEnriched` hook. Unlike the Roles page (which focuses on roles and their members), the Authorized Accounts page focuses on accounts and their assigned roles—providing an account-centric view of access control.

**Scope**: View-only functionality. No mutations (grant/revoke/edit) are included in this spec.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - View Real Authorized Accounts (Priority: P1)

A contract administrator navigates to the Authorized Accounts page after selecting a contract and sees the actual accounts that have been granted roles on the contract, with their real role assignments and status information.

**Why this priority**: The core purpose of this integration—without real data, the page provides no value.

**Independent Test**: Can be fully tested by selecting a contract with known role assignments, navigating to the Authorized Accounts page, and verifying the displayed accounts match the on-chain state.

**Acceptance Scenarios**:

1. **Given** a contract with AccessControl capabilities is selected, **When** the user navigates to the Authorized Accounts page, **Then** the accounts table displays actual accounts that have been granted roles
2. **Given** a contract with Ownable capabilities is selected, **When** the user navigates to the Authorized Accounts page, **Then** the owner address is displayed as an authorized account with the "Owner" role
3. **Given** an account has multiple roles, **When** viewing the accounts table, **Then** all assigned roles are displayed as badges for that account
4. **Given** the page is loading, **When** data is being fetched, **Then** a loading skeleton is displayed

---

### User Story 2 - Automatic Data Loading on Contract Selection (Priority: P1)

A user selects or switches to a different contract while on the Authorized Accounts page, and the page automatically loads and displays the authorized accounts for the newly selected contract without requiring manual refresh.

**Why this priority**: Essential for seamless user experience when managing multiple contracts.

**Independent Test**: Can be tested by switching between contracts using the contract selector while on the Authorized Accounts page and verifying data updates automatically.

**Acceptance Scenarios**:

1. **Given** the user is on the Authorized Accounts page, **When** they select a different contract from the contract selector, **Then** the accounts data automatically refreshes for the new contract
2. **Given** a contract switch is in progress, **When** data is loading for the new contract, **Then** a loading state is displayed without blocking UI interaction
3. **Given** the user switches contracts rapidly, **When** multiple switches occur, **Then** only the final contract's data is displayed (cancellation of stale requests)

---

### User Story 3 - Search and Filter Accounts (Priority: P2)

A user wants to find specific accounts by searching for an address or filtering by role. The search and filter functionality operates on the loaded data set.

**Why this priority**: Important for usability with contracts that have many authorized accounts.

**Independent Test**: Can be tested by loading accounts, typing in search, and verifying the table filters correctly.

**Acceptance Scenarios**:

1. **Given** accounts are displayed, **When** the user types an address in the search input, **Then** the table filters to show only accounts matching the search query
2. **Given** accounts are displayed, **When** the user selects a role from the role filter dropdown, **Then** only accounts with that role are shown
3. **Given** both search and role filter are applied, **When** viewing the table, **Then** accounts matching both criteria are displayed
4. **Given** filters are active, **When** the user clears filters, **Then** all accounts are shown again

---

### User Story 4 - Paginated Accounts View (Priority: P2)

A user views a contract with many authorized accounts and can navigate through pages of accounts without loading all data at once.

**Why this priority**: Critical for performance with contracts that have hundreds of authorized accounts.

**Independent Test**: Can be tested by loading a contract with many accounts and verifying pagination controls work correctly.

**Acceptance Scenarios**:

1. **Given** the contract has more accounts than the page size, **When** viewing the table, **Then** pagination controls are displayed showing current page and total pages
2. **Given** pagination controls are visible, **When** the user clicks "Next", **Then** the next page of accounts is displayed
3. **Given** the user is on page 2+, **When** they click "Previous", **Then** the previous page of accounts is displayed
4. **Given** filters are applied, **When** pagination is used, **Then** pagination applies to the filtered results

---

### User Story 5 - Manual Data Refresh (Priority: P2)

A user can manually refresh the accounts data to see the latest on-chain state after external changes (e.g., role grants/revokes made outside the application).

**Why this priority**: Important for accuracy but most users will rely on automatic updates after mutations.

**Independent Test**: Can be tested by triggering a refresh and verifying the data updates.

**Acceptance Scenarios**:

1. **Given** the Authorized Accounts page is displayed, **When** the user clicks the Refresh button, **Then** the accounts data is re-fetched from the adapter
2. **Given** a refresh is in progress, **When** the user views the page, **Then** a subtle loading indicator shows on the Refresh button without replacing content
3. **Given** refresh completes successfully, **When** data has changed, **Then** the table updates to reflect the new state

---

### User Story 6 - Handle Contracts Without Access Control (Priority: P1)

A user attempts to view the Authorized Accounts page for a contract that lacks AccessControl or Ownable capabilities and receives clear feedback about the limitation.

**Why this priority**: Error handling is essential for user experience and preventing confusion.

**Independent Test**: Can be tested by navigating to a contract without access control features.

**Acceptance Scenarios**:

1. **Given** a contract without AccessControl or Ownable capabilities, **When** navigating to the Authorized Accounts page, **Then** an empty state is displayed with message explaining the limitation
2. **Given** feature detection has not completed, **When** viewing the page, **Then** a loading state is displayed until detection completes
3. **Given** data fetching fails due to network error, **When** viewing the page, **Then** an error state with retry option is displayed

---

### Edge Cases

- What happens when an account has no roles? Account should not appear in the list (only accounts with active role assignments are shown)
- What happens when the same address appears in multiple roles? Display as a single row with all roles as badges
- What happens when network connectivity is lost during data fetch? Display cached data if available, otherwise show error state with retry
- What happens when the selected contract changes while data is loading? Cancel pending requests and load data for the new contract
- What happens when search finds no results? Display empty state within the table area with "No matching accounts found" message
- What happens when pagination page becomes invalid after filtering? Reset to page 1 when filters change
- What happens when connected wallet is one of the authorized accounts? Display "You" badge next to the connected wallet's address (same as Roles page)

## Requirements _(mandatory)_

### Functional Requirements

#### Data Integration

- **FR-001**: Page MUST use `getCurrentRolesEnriched()` API (or hook wrapping it) to fetch role data with timestamps
- **FR-001a**: Page MUST gracefully degrade when timestamps unavailable (indexer down) - display "-" for Date Added
- **FR-001b**: If `getCurrentRolesEnriched()` API is unavailable (adapter doesn't support it), page MUST fall back to `getCurrentRoles()` and convert to enriched format with empty timestamps
- **FR-002**: Page MUST use existing `useContractOwnership` hook from spec 006 to fetch ownership data
- **FR-003**: Page MUST aggregate role data to create an account-centric view (invert roles→members to accounts→roles)
- **FR-004**: Page MUST respect `AccessControlCapabilities` to determine feature availability
- **FR-005**: Page MUST handle loading, error, and success states for all data fetching operations
- **FR-006**: Page MUST use react-query caching (via existing hooks) for data persistence and automatic cache invalidation

#### Contract Selection Integration

- **FR-007**: Page MUST use `useSelectedContract` hook to get the currently selected contract
- **FR-008**: Page MUST automatically refetch data when the selected contract changes
- **FR-009**: Page MUST reset filters and pagination when contract changes
- **FR-010**: Page MUST cancel pending requests when contract selection changes (handled by react-query key changes)

#### Accounts Table Integration

- **FR-011**: AccountsTable component MUST accept real account data derived from role assignments
- **FR-012**: Account rows MUST display all roles assigned to each account as role badges
- **FR-013**: Account rows MUST support "You" badge display when address matches connected wallet (currently stubbed as null; wallet detection deferred to future spec)
- **FR-014**: For Owner role, the owner address MUST be included in the accounts list with "Owner" as their role
- **FR-014a**: All accounts from adapter MUST display status as "Active" (confirmed on-chain state)
- **FR-014b**: Status types MUST be updated to remove "Expired" (OZ has no timelock roles) and prepare for future states: "Pending" (transaction in progress), "Awaiting Signature" (multisig)
- **FR-014c**: "Date Added" column MUST display `grantedAt` timestamp from enriched API in localized short date format (e.g., "Jan 15, 2024" or locale equivalent using existing `formatDate` utility); show "-" when unavailable
- **FR-014d**: "Expires" column MUST be removed from the table (OZ has no timelock roles)
- **FR-014e**: Accounts MUST be sorted by Date Added (newest first); accounts without timestamps MUST be sorted alphabetically by address and appear after timestamped accounts

#### Search and Filtering

- **FR-015**: Search MUST filter accounts by address (case-insensitive partial match)
- **FR-016**: Role filter dropdown MUST be populated with actual roles from the contract
- **FR-017**: Filters MUST apply client-side to the loaded data set
- **FR-018**: Multiple filters MUST combine with AND logic
- **FR-019**: Filter state MUST reset when contract changes
- **FR-019a**: Status filter MUST be updated to remove "Expired" option; retain "Active" and prepare for future "Pending"/"Awaiting Signature" states (filter will be functional once transaction execution is implemented)

#### Pagination

- **FR-020**: Page MUST implement client-side pagination on the filtered account list (service does not support server-side pagination)
- **FR-021**: Default page size MUST be 10 accounts per page
- **FR-022**: Pagination controls MUST show current page, total pages, and navigation buttons
- **FR-023**: Pagination MUST reset to page 1 when filters change
- **FR-024**: Pagination controls MUST only appear when total accounts exceed page size

#### Refresh Functionality

- **FR-025**: Page MUST display a Refresh button in the page header (same pattern as Roles page)
- **FR-026**: Refresh button MUST trigger re-fetch of roles and ownership data
- **FR-027**: Refresh button MUST show spinning icon while refresh is in progress
- **FR-028**: Refresh MUST NOT block UI interaction (background refresh)

#### Error Handling

- **FR-029**: Page MUST display loading skeletons during initial data fetch
- **FR-030**: Page MUST display error states with retry actions when data fetching fails
- **FR-031**: Page MUST show empty state when contract has no AccessControl or Ownable capabilities with message: "This contract does not support role-based access control. Only contracts implementing OpenZeppelin AccessControl or Ownable interfaces can be managed here."
- **FR-032**: Page MUST gracefully handle partial data failures: if roles fetch succeeds but ownership fails (or vice versa), display available data with a warning indicator; if both fail, show error state with retry

#### UI Consistency

- **FR-033**: Page MUST follow the same layout pattern as the Roles page (PageHeader, Card with content)
- **FR-034**: Page MUST use existing components from spec 010 (AccountsTable, AccountsFilterBar, etc.)
- **FR-035**: Page MUST remove demo toggle and mock data from spec 010 implementation
- **FR-036**: Page MUST hide "Add Account or Role" button (out of scope for view-only spec)
- **FR-037**: Selection checkboxes and row action menus MUST be retained as placeholders; actions MUST log to console via `logger` (consistent with spec 010 pattern, ready for future mutation spec)

### Key Entities

- **AuthorizedAccountView**: Presentation model aggregating an address with all its assigned roles and earliest `grantedAt` timestamp. Status is always "Active" for accounts returned by adapter (confirmed on-chain). No `expiresAt` field (OZ has no timelock roles). Note: This replaces the mock `AuthorizedAccount` type from spec 010.
- **AccountStatus**: Transaction-state based enum: "Active" (on-chain confirmed), "Pending" (transaction in progress - future), "Awaiting Signature" (multisig - future). No "Expired" status (OZ has no timelock roles).
- **EnrichedRoleAssignment**: Role data with member timestamps from `getCurrentRolesEnriched()` API
- **EnrichedRoleMember**: Member address with optional `grantedAt`, `grantedTxId`, `grantedLedger` metadata
- **OwnershipInfo**: Real ownership data containing owner address (from spec 006)
- **AccessControlCapabilities**: Feature detection result determining available features (from spec 006)
- **AccountsFilterState**: Current filter values including search query and role filter (from spec 010). Status filter retained but only "Active" accounts exist in this view-only spec.
- **PaginationState**: Current page, page size, and navigation state

## Integration Points

### From Spec 006 (Access Control Service)

```typescript
// Hooks to be used (wrapping AccessControlService methods)
useContractRoles(adapter, contractAddress): {
  roles: RoleAssignment[];  // All roles returned at once (no pagination at API level)
  isLoading: boolean;
  isFetching: boolean;
  error: DataError | null;
  refetch: () => Promise<void>;
}

useContractOwnership(adapter, contractAddress): {
  ownership: OwnershipInfo;
  isLoading: boolean;
  isFetching: boolean;
  error: DataError | null;
  refetch: () => Promise<void>;
}

// Underlying service method signatures (for reference)
// Note: No pagination parameters available
AccessControlService.getCurrentRoles(contractAddress: string): Promise<RoleAssignment[]>

// Enriched API (provides timestamps when indexer available)
AccessControlService.getCurrentRolesEnriched(contractAddress: string): Promise<EnrichedRoleAssignment[]>

// EnrichedRoleAssignment types
interface EnrichedRoleMember {
  address: string;           // Member's address
  grantedAt?: string;        // ISO8601 timestamp (e.g., "2024-01-15T10:00:00Z")
  grantedTxId?: string;      // Transaction hash of the grant
  grantedLedger?: number;    // Block/ledger number
}

interface EnrichedRoleAssignment {
  role: RoleIdentifier;      // { id: string, label?: string }
  members: EnrichedRoleMember[];
}
```

### From Spec 010 (UI Components)

```typescript
// Components to be updated/used
AccountsTable: { accounts: AuthorizedAccountView[]; selectedIds: Set<string>; ... }
AccountsFilterBar: { filters: AccountsFilterState; availableRoles: string[]; ... }
AccountsLoadingSkeleton: { rowCount?: number; ... }
AccountRow: { account: AuthorizedAccountView; ... }
```

**Required Component Updates from Spec 010**:

| Component                    | Change                                                  | Reason                            |
| ---------------------------- | ------------------------------------------------------- | --------------------------------- |
| `AuthorizedAccount` type     | Rename to `AuthorizedAccountView`                       | Clearer presentation model naming |
| `AuthorizedAccountView` type | Remove `expiresAt` field                                | OZ has no timelock roles          |
| `AuthorizedAccountView` type | Change `dateAdded: Date` to `dateAdded: string \| null` | ISO8601 string from API, nullable |
| `AuthorizedAccountView` type | Change `roles: string[]` to `roles: RoleBadgeInfo[]`    | Need role ID + name               |
| `AccountStatus` type         | Remove `'expired'` value                                | OZ has no timelock roles          |
| `AccountStatus` type         | Add `'awaiting-signature'` value                        | Future multisig support           |
| `ACCOUNT_STATUS_CONFIG`      | Remove `expired` entry                                  | OZ has no timelock roles          |
| `AccountRow`                 | Remove Expires column rendering                         | Column removed                    |
| `AccountRow`                 | Handle `dateAdded: null` → display "-"                  | Graceful degradation              |
| `AccountsFilterBar`          | Remove "Expired" from status dropdown                   | Status removed                    |

### From App Context

```typescript
// Contract context
useSelectedContract(): {
  selectedContract: RecentContractRecord | null;
  adapter: ContractAdapter | null;
  isContractRegistered: boolean;
}

// Wallet context (for "You" badge)
// Note: Currently stubbed, will use actual wallet connection when available
connectedAddress: string | null;
```

## Data Transformation

The core transformation aggregates role-centric data into account-centric data:

```
Input (from getCurrentRolesEnriched):
  Role A: [
    { address: addr1, grantedAt: "2024-01-15T10:00:00Z" },
    { address: addr2, grantedAt: "2024-01-20T14:30:00Z" }
  ]
  Role B: [
    { address: addr2, grantedAt: "2024-02-01T09:00:00Z" },
    { address: addr3 }  // No timestamp (indexer unavailable)
  ]
  Owner: [addr4]

Output (for AccountsTable):
  addr1: { roles: [Role A], dateAdded: "2024-01-15T10:00:00Z", status: "Active" }
  addr2: { roles: [Role A, Role B], dateAdded: "2024-01-20T14:30:00Z", status: "Active" }
         // Note: Uses earliest grantedAt when account has multiple roles
  addr3: { roles: [Role B], dateAdded: null, status: "Active" }  // Shows "-"
  addr4: { roles: [Owner], dateAdded: null, status: "Active" }   // Owner has no timestamp
```

**Date Added logic**: When an account has multiple roles with different `grantedAt` timestamps, display the **earliest** timestamp (when the account first gained any role).

## API Pagination Analysis

**Finding**: The `AccessControlService.getCurrentRoles()` method does **NOT** support pagination.

```typescript
// From @openzeppelin/ui-builder-types
getCurrentRoles(contractAddress: string): Promise<RoleAssignment[]>
```

The service returns all role assignments in a single call, with each `RoleAssignment` containing all members for that role. There are no `limit`, `offset`, or `cursor` parameters available.

The only method with pagination support is `getHistory()` which accepts `{ limit?: number }`, but this is for historical change events, not current role state.

**Implication**: Client-side pagination is the correct and only approach for the Authorized Accounts page. This aligns with the existing `usePaginatedRoles` hook pattern used elsewhere in the application.

## Clarifications

### Session 2025-12-08

- Q: How should Account Status be handled given the adapter doesn't provide status data? → A: Status is transaction-state based, not time-based. All accounts from adapter show as "Active" (confirmed on-chain). "Pending" will be set during transaction execution (future spec). "Expired" removed (OZ AccessControl has no timelock roles). Future expansion: "Awaiting Signature" for multisig.
- Q: How should Date Added and Expires columns be handled? → A: Keep "Date Added" using `grantedAt` from `getCurrentRolesEnriched()` API. Remove "Expires" column (no timelock roles). Show "-" when timestamp unavailable (graceful degradation when indexer unavailable).
- Q: How should accounts be sorted in the table? → A: By Date Added (newest first), with fallback to alphabetical by address when timestamps unavailable.
- Q: Should selection checkboxes and row actions be kept in view-only spec? → A: Keep all UI elements as placeholders that log to console (consistent with spec 010 pattern). Mutations will be implemented in a future spec.
- Q: Should this spec implement wallet connection for "You" badge? → A: Keep stubbed (null). Wallet detection is a cross-cutting concern to be implemented in a dedicated future spec.

## Assumptions

- **ASSUMP-001**: The hooks from spec 006 are fully implemented and functional
- **ASSUMP-002**: The UI components from spec 010 are complete and accept the documented props
- **ASSUMP-003**: Contract selection context is available via `useSelectedContract` hook
- **ASSUMP-004**: Connected wallet context remains stubbed (null) in this spec; "You" badge will be functional when wallet detection is implemented in a future cross-cutting spec
- **ASSUMP-005**: Client-side pagination is required (AccessControlService does not support server-side pagination for `getCurrentRoles`)
- **ASSUMP-006**: Search/filter must operate client-side (no server-side search available in the service)
- **ASSUMP-007**: Account status is transaction-state based: "Active" = confirmed on-chain, "Pending" = transaction in progress (future), "Awaiting Signature" = multisig pending (future). No "Expired" status (OZ has no timelock roles).
- **ASSUMP-008**: Data volume is manageable client-side (most contracts have <100 unique authorized accounts)

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Real account data displays correctly for contracts with AccessControl capabilities (100% accuracy vs on-chain state)
- **SC-002**: Real ownership data displays correctly for contracts with Ownable capabilities (100% accuracy vs on-chain state)
- **SC-003**: "You" badge stub returns null consistently (awaiting wallet integration in future cross-cutting spec)
- **SC-004**: Page loads and displays data within 3 seconds on standard network conditions (p95)
- **SC-005**: Search filters accounts within 100ms of input (client-side filtering)
- **SC-006**: Pagination navigation updates table within 100ms
- **SC-007**: Contract switching loads new data within 3 seconds
- **SC-008**: Error states provide actionable feedback with retry options (100% of error scenarios covered)
- **SC-009**: Refresh button updates data without page reload or content flicker
