# Feature Specification: Role Changes Page with Real Data

**Feature Branch**: `012-role-changes-data`  
**Created**: 2025-12-08  
**Status**: Draft  
**Input**: User description: "Role Changes page layout with real data. Use the previous specs for more context. Re-use the table components from the Authorized Accounts page."

## Overview

This specification defines the Role Changes page, which displays a chronological history of role-related events (grants, revokes, ownership transfers) for a selected contract. Unlike the Authorized Accounts page (which shows current state), this page provides an audit trail of all access control changes over time.

The page leverages the `getHistory()` API from the adapter's Access Control module, which is the only API with server-side pagination support. Table components from the Authorized Accounts page will be adapted and reused where applicable.

**Scope**: View-only functionality. The page displays historical data and does not perform mutations.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - View Role Change History (Priority: P1)

A contract administrator navigates to the Role Changes page after selecting a contract and sees a chronological list of all role changes (grants and revokes) that have occurred on the contract.

**Why this priority**: The core purpose of this page—without history data, the page provides no value.

**Independent Test**: Can be fully tested by selecting a contract with known role grant/revoke history, navigating to the Role Changes page, and verifying the displayed events match the on-chain history.

**Acceptance Scenarios**:

1. **Given** a contract with AccessControl capabilities is selected, **When** the user navigates to the Role Changes page, **Then** the changes table displays historical role events (grants/revokes)
2. **Given** a contract with Ownable capabilities is selected, **When** the user navigates to the Role Changes page, **Then** ownership transfer events are displayed in the history
3. **Given** a role change event is displayed, **When** viewing the event row, **Then** the user sees the timestamp, action type (Grant/Revoke/Transfer), role name, affected account address, and transaction reference
4. **Given** the page is loading, **When** data is being fetched, **Then** a loading skeleton is displayed

---

### User Story 2 - Automatic Data Loading on Contract Selection (Priority: P1)

A user selects or switches to a different contract while on the Role Changes page, and the page automatically loads and displays the change history for the newly selected contract.

**Why this priority**: Essential for seamless user experience when managing multiple contracts.

**Independent Test**: Can be tested by switching between contracts using the contract selector while on the Role Changes page and verifying data updates automatically.

**Acceptance Scenarios**:

1. **Given** the user is on the Role Changes page, **When** they select a different contract from the contract selector, **Then** the history data automatically refreshes for the new contract
2. **Given** a contract switch is in progress, **When** data is loading for the new contract, **Then** a loading state is displayed without blocking UI interaction
3. **Given** the user switches contracts rapidly, **When** multiple switches occur, **Then** only the final contract's data is displayed (cancellation of stale requests)

---

### User Story 3 - Paginated History View (Priority: P2)

A user views a contract with many historical changes and can navigate through pages of events without loading all data at once.

**Why this priority**: Critical for performance with contracts that have extensive change histories. The `getHistory()` API supports server-side pagination.

**Independent Test**: Can be tested by loading a contract with many historical events and verifying pagination controls work correctly.

**Acceptance Scenarios**:

1. **Given** the contract has more events than the page size, **When** viewing the table, **Then** pagination controls are displayed showing current page and navigation options
2. **Given** pagination controls are visible, **When** the user clicks "Next", **Then** the next page of events is fetched and displayed
3. **Given** the user is on page 2+, **When** they click "Previous", **Then** the previous page of events is displayed
4. **Given** filters are applied, **When** pagination is used, **Then** pagination applies to the filtered results

---

### User Story 4 - Filter Role Changes (Priority: P2)

A user wants to find specific events by filtering by action type (Grant/Revoke) or by role. The filter functionality helps narrow down the change history.

**Why this priority**: Important for usability with contracts that have extensive change histories.

**Independent Test**: Can be tested by loading events, selecting filters, and verifying the table filters correctly.

**Acceptance Scenarios**:

1. **Given** events are displayed, **When** the user selects "Grant" from the action type filter, **Then** only grant events are shown
2. **Given** events are displayed, **When** the user selects a role from the role filter dropdown, **Then** only events for that role are shown
3. **Given** both action type and role filters are applied, **When** viewing the table, **Then** events matching both criteria are displayed
4. **Given** filters are active, **When** the user clears filters, **Then** all events are shown again

---

### User Story 5 - Manual Data Refresh (Priority: P2)

A user can manually refresh the history data to see the latest events after recent role changes.

**Why this priority**: Important for accuracy when external changes have been made.

**Independent Test**: Can be tested by triggering a refresh and verifying the data updates.

**Acceptance Scenarios**:

1. **Given** the Role Changes page is displayed, **When** the user clicks the Refresh button, **Then** the history data is re-fetched from the adapter
2. **Given** a refresh is in progress, **When** the user views the page, **Then** a subtle loading indicator shows on the Refresh button without replacing content
3. **Given** refresh completes successfully, **When** new events have occurred, **Then** the table updates to reflect the new events

---

### User Story 6 - Handle Contracts Without History Support (Priority: P1)

A user attempts to view the Role Changes page for a contract where history is unavailable (indexer down or not supported) and receives clear feedback.

**Why this priority**: Error handling is essential for user experience and preventing confusion.

**Independent Test**: Can be tested by navigating to a contract without history support.

**Acceptance Scenarios**:

1. **Given** a contract where `supportsHistory: false` in capabilities, **When** navigating to the Role Changes page, **Then** an informative message explains that history is unavailable for this contract
2. **Given** the indexer is temporarily unavailable, **When** fetching history fails, **Then** an error state with retry option is displayed
3. **Given** a contract without AccessControl or Ownable capabilities, **When** navigating to the Role Changes page, **Then** an empty state explains the limitation

---

### Edge Cases

- What happens when a contract has no history events? Display empty state with "No role changes recorded" message
- What happens when the indexer is temporarily down? Display error state with retry option; show cached data if available
- What happens when the selected contract changes while data is loading? Cancel pending requests and load data for the new contract
- What happens when filters return no results? Display "No matching events found" within the table area
- What happens when pagination page becomes invalid after filtering? Reset to page 1 when filters change
- What happens when the transaction link is clicked? Open in block explorer in a new tab
- What happens when an ownership transfer event is displayed? Show as "Ownership Transfer" action type with "Owner" as the role
- What happens when a role name cannot be resolved? Display role ID hash as fallback

## Requirements _(mandatory)_

### Functional Requirements

#### Data Integration

- **FR-001**: Page MUST use `getHistory()` API from the adapter's Access Control module to fetch historical events
- **FR-002**: Page MUST utilize cursor-based pagination via `limit` and `cursor` parameters supported by `getHistory()` API
- **FR-003**: Page MUST respect `AccessControlCapabilities.supportsHistory` to determine feature availability
- **FR-004**: Page MUST handle loading, error, and success states for all data fetching operations
- **FR-005**: Page MUST use react-query caching for data persistence and automatic cache invalidation

#### Contract Selection Integration

- **FR-006**: Page MUST use `useSelectedContract` hook to get the currently selected contract
- **FR-007**: Page MUST automatically refetch data when the selected contract changes
- **FR-008**: Page MUST reset filters and pagination when contract changes
- **FR-009**: Page MUST cancel pending requests when contract selection changes (handled by react-query key changes)

#### Changes Table

- **FR-010**: Table MUST display columns: Timestamp, Action, Role, Account, Transaction
- **FR-011**: Timestamp column MUST display date/time in localized format using existing `formatDate` utility
- **FR-012**: Action column MUST display event type: "Grant", "Revoke", or "Ownership Transfer"
- **FR-013**: Role column MUST display role name (with fallback to role ID if name unavailable)
- **FR-014**: Account column MUST display affected address using `AddressDisplay` component (truncated with copy button)
- **FR-015**: Transaction column MUST display transaction hash as a clickable link to block explorer
- **FR-016**: Events MUST be sorted by timestamp (newest first by default)

#### Filtering

- **FR-017**: Filter bar MUST include action type filter dropdown (All, Grant, Revoke, Ownership Transfer)
- **FR-018**: Filter bar MUST include role filter dropdown populated with roles from the contract
- **FR-019**: Filters MUST apply server-side using `roleId` parameter in `HistoryQueryOptions`
- **FR-020**: Multiple filters MUST combine with AND logic
- **FR-021**: Filter state MUST reset when contract changes

#### Pagination

- **FR-022**: Page MUST implement cursor-based pagination using `limit` and `cursor` parameters from `getHistory()` API
- **FR-023**: Default page size MUST be 20 events per page
- **FR-024**: Pagination controls MUST show navigation buttons (Previous/Next) based on `pageInfo.hasNextPage`
- **FR-025**: Page MUST store cursor history to enable backward navigation (Previous button)
- **FR-026**: Pagination MUST reset (clear cursors) when filters change

#### Refresh Functionality

- **FR-027**: Page MUST display a Refresh button in the page header (same pattern as Roles and Authorized Accounts pages)
- **FR-028**: Refresh button MUST trigger re-fetch of history data
- **FR-029**: Refresh button MUST show spinning icon while refresh is in progress
- **FR-030**: Refresh MUST NOT block UI interaction (background refresh)

#### Error Handling

- **FR-031**: Page MUST display loading skeletons during initial data fetch
- **FR-032**: Page MUST display error states with retry actions when data fetching fails
- **FR-033**: Page MUST show informative state when contract has `supportsHistory: false` with message: "Role change history is not available for this contract. History requires an indexer service which may not be available for all networks."
- **FR-034**: Page MUST show empty state when contract has no AccessControl or Ownable capabilities

#### Component Reuse

- **FR-035**: Page MUST create a `CursorPagination` component (adapted from Shared `Pagination`) since cursor-based pagination does not provide page numbers or total counts required by the existing component
- **FR-036**: Page MUST follow the same layout pattern as Authorized Accounts page (PageHeader, Card with filters, Table)
- **FR-037**: Table row components MUST follow similar patterns to `AccountRow` (hover states, focus states)
- **FR-038**: Filter bar MUST follow similar pattern to `AccountsFilterBar`
- **FR-039**: Loading skeleton MUST follow similar pattern to `AccountsLoadingSkeleton`
- **FR-040**: Empty state MUST follow similar pattern to `AccountsEmptyState`

### Key Entities

- **HistoryEntry**: Raw event from adapter representing a role grant, revoke, or ownership transfer. Contains timestamp, changeType, role identifier, affected account address, txId, and ledger.
- **RoleChangeEventView**: Presentation model transformed from HistoryEntry with display-ready values (formatted timestamp, transaction URL, etc.)
- **RoleChangeAction**: Enum representing event types: "grant", "revoke", "ownership-transfer" (mapped from HistoryEntry.changeType)
- **HistoryFilterState**: Current filter values including action type filter and role filter
- **CursorPaginationState**: Current cursor, cursor history (for back navigation), hasNextPage flag
- **PageInfo**: Pagination metadata from API containing hasNextPage and endCursor
- **AccessControlCapabilities**: Feature detection result including `supportsHistory` flag (from spec 006)

## Integration Points

### From Adapter Access Control Module

```typescript
// History API (with cursor-based pagination)
AccessControlService.getHistory(
  contractAddress: string,
  options?: HistoryQueryOptions
): Promise<PaginatedHistoryResult>

// Query options for pagination and filtering
interface HistoryQueryOptions {
  roleId?: string;         // Filter by role (server-side)
  account?: string;        // Filter by account (server-side)
  limit?: number;          // Page size (max items per request)
  cursor?: string;         // Cursor for fetching next page
}

// Paginated response structure
interface PaginatedHistoryResult {
  items: HistoryEntry[];   // Array of history entries for current page
  pageInfo: PageInfo;      // Pagination metadata
}

interface PageInfo {
  hasNextPage: boolean;    // Whether more items exist after current page
  endCursor?: string;      // Cursor to use for fetching next page
}

// HistoryEntry structure (from adapter)
interface HistoryEntry {
  role: { id: string };           // Role identifier
  account: string;                // Affected address
  changeType: 'GRANTED' | 'REVOKED' | 'TRANSFERRED';  // Event type
  txId: string;                   // Transaction hash
  timestamp: string;              // ISO8601 timestamp
  ledger: number;                 // Block/ledger number
}
```

### From Spec 010/011 (UI Components to Adapt)

```typescript
// Components to be adapted for Role Changes
AccountsFilterBar → ChangesFilterBar (similar structure, different filter options)
AccountsTable → ChangesTable (similar structure, different columns)
AccountRow → ChangeRow (similar structure, different data display)
AccountsLoadingSkeleton → ChangesLoadingSkeleton (similar structure)
AccountsEmptyState → ChangesEmptyState (similar structure, different message)
Pagination → CursorPagination (NEW: adapted for cursor-based, no page numbers)
```

### From App Context

```typescript
// Contract context
useSelectedContract(): {
  selectedContract: RecentContractRecord | null;
  adapter: ContractAdapter | null;
  capabilities: AccessControlCapabilities | null;
}

// Explorer URL (via adapter, not a separate hook)
adapter.getExplorerUrl(address: string): string | null
// Used for transaction links: adapter.getExplorerUrl(txId) → block explorer URL
```

## Assumptions

- **ASSUMP-001**: The `getHistory()` API from the adapter is implemented and returns `PaginatedHistoryResult` with cursor-based pagination
- **ASSUMP-002**: The `AccessControlCapabilities.supportsHistory` flag accurately reflects history availability
- **ASSUMP-003**: The adapter provides transaction hashes (`txId`) for linking to block explorer
- **ASSUMP-004**: The adapter provides `getExplorerUrl(address)` method for generating transaction links to block explorer
- **ASSUMP-005**: Server-side pagination via cursor is the primary pagination strategy
- **ASSUMP-006**: Server-side filtering is available via `roleId` and `account` parameters in `HistoryQueryOptions`
- **ASSUMP-007**: A new `CursorPagination` component will be created, adapted from the Shared `Pagination` pattern but without page numbers (cursor-based APIs don't expose total counts)

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Role change history displays accurately for contracts with history support (100% accuracy vs indexer data)
- **SC-002**: Pagination loads and displays within 3 seconds per page (p95)
- **SC-003**: Filter operations complete within 500ms of selection
- **SC-004**: Pagination navigation updates table within 500ms
- **SC-005**: Contract switching loads new data within 3 seconds
- **SC-006**: Error states provide actionable feedback with retry options (100% of error scenarios covered)
- **SC-007**: Refresh button updates data without page reload or content flicker
- **SC-008**: Transaction links correctly open block explorer for the appropriate network
