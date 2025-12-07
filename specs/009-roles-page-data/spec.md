# Feature Specification: Roles Page Real Data Integration

**Feature Branch**: `009-roles-page-data`  
**Created**: 2025-12-07  
**Status**: Draft  
**Input**: User description: "Populate Roles Page with real data. Continuation from the specs: 003, 004, 005, 006, 008. The data is already available."

## Clarifications

### Session 2025-12-07

- Q: What happens when a role description is not available from the access control service? → A: Users can edit the role description inline and provide their own custom description, which is saved to the contract record in local storage.
- Q: What is the maximum character limit for custom role descriptions? → A: 256 characters (paragraph-length, balanced for meaningful descriptions while preventing UI overflow)
- Q: Where can users edit role descriptions? → A: Details panel only; the Role Identifiers Table remains a read-only reference view
- Q: What are "standard network conditions" for NFR-001? → A: Typical broadband connection (~10 Mbps down, ~100ms latency to RPC endpoint)
- Q: What happens when switching contracts while editing a description? → A: Edit is cancelled (discarded), new contract data loads
- Q: What happens when a previously selected role is removed from the contract? → A: Selection resets to first available role per FR-015

## Overview

This specification defines the integration of real blockchain data into the Roles page layout skeleton created in spec 008. The data layer has been fully implemented through previous specs (003-006), and the UI components are ready from spec 008. This feature connects these two layers, replacing mock data with live access control data from the adapter's Access Control module. Additionally, users can customize role descriptions when they are not available from the adapter.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - View Real Roles for Selected Contract (Priority: P1)

A contract administrator navigates to the Roles page after selecting a contract and sees the actual roles detected from the contract's access control interface, including real member counts and role information from the blockchain.

**Why this priority**: The core purpose of this integration—without real data, the page provides no value.

**Independent Test**: Can be fully tested by selecting a contract with known AccessControl roles, navigating to the Roles page, and verifying the displayed roles match the on-chain state.

**Acceptance Scenarios**:

1. **Given** a contract with AccessControl capabilities is selected, **When** the user navigates to the Roles page, **Then** the roles list displays actual roles detected from the contract
2. **Given** a contract with Ownable capabilities is selected, **When** the user navigates to the Roles page, **Then** the Owner role is displayed with the actual owner address
3. **Given** a contract with both AccessControl and Ownable, **When** viewing the Roles page, **Then** all roles including ownership are displayed correctly
4. **Given** roles data is loading, **When** the page is displayed, **Then** a loading skeleton is shown in place of role cards

---

### User Story 2 - View Real Assigned Accounts (Priority: P1)

A contract administrator selects a role and sees the actual blockchain addresses assigned to that role, including their real assignment timestamps where available.

**Why this priority**: Equally critical to viewing roles—the assigned accounts are the actionable data for access management.

**Independent Test**: Can be tested by selecting a role with known members and verifying the displayed addresses match on-chain data.

**Acceptance Scenarios**:

1. **Given** a role is selected, **When** the details panel loads, **Then** actual assigned account addresses are displayed
2. **Given** the connected wallet is assigned to a role, **When** viewing assigned accounts, **Then** the "You" badge appears next to the connected wallet's address
3. **Given** the adapter provides assignment timestamps, **When** viewing accounts, **Then** real assignment dates are displayed
4. **Given** assignment timestamps are not available, **When** viewing accounts, **Then** no date is shown (graceful degradation)

---

### User Story 3 - Handle Contracts Without Access Control (Priority: P1)

A user attempts to view the Roles page for a contract that lacks AccessControl or Ownable capabilities and receives clear feedback about the limitation.

**Why this priority**: Error handling is essential for user experience and preventing confusion.

**Independent Test**: Can be tested by navigating to a contract without access control features and verifying the appropriate empty/error state is displayed.

**Acceptance Scenarios**:

1. **Given** a contract without AccessControl or Ownable capabilities, **When** navigating to the Roles page, **Then** an empty state is displayed with message: "This contract does not support role-based access control. Only contracts implementing OpenZeppelin AccessControl or Ownable interfaces can be managed here."
2. **Given** feature detection has not completed, **When** viewing the Roles page, **Then** a loading state is displayed until detection completes
3. **Given** feature detection fails due to network error, **When** viewing the Roles page, **Then** an error state with retry option is displayed

---

### User Story 4 - View Dynamic Role Identifiers (Priority: P2)

A contract administrator views the Role Identifiers reference table populated with actual role identifiers detected from the contract, including any custom roles beyond the standard set.

**Why this priority**: Important for understanding all available roles but not blocking core functionality.

**Independent Test**: Can be tested by loading a contract with custom roles and verifying they appear in the identifiers table.

**Acceptance Scenarios**:

1. **Given** a contract with standard roles, **When** viewing the identifiers table, **Then** standard role identifiers (ADMIN_ROLE, MINTER_ROLE, etc.) are displayed
2. **Given** a contract with custom roles, **When** viewing the identifiers table, **Then** custom role identifiers are included with their detected names
3. **Given** role names cannot be determined, **When** displaying identifiers, **Then** the role ID hash is shown as a fallback

---

### User Story 5 - Real-time Data Refresh (Priority: P2)

A contract administrator can refresh the roles data to see the latest on-chain state after external changes.

**Why this priority**: Important for accuracy but most users will rely on automatic updates after mutations.

**Independent Test**: Can be tested by triggering a refresh and verifying the data updates to reflect current on-chain state.

**Acceptance Scenarios**:

1. **Given** the Roles page is displayed, **When** the user triggers a manual refresh, **Then** the roles data is re-fetched from the adapter
2. **Given** a mutation has occurred (grant/revoke), **When** the page data refreshes, **Then** the new state is reflected automatically
3. **Given** a refresh is in progress, **When** the user views the page, **Then** a subtle loading indicator shows without replacing content

---

### User Story 6 - Edit Role Description (Priority: P2)

A contract administrator notices a role has no description (or wants to customize an existing one) and edits the description inline. The custom description is saved locally and displayed on subsequent visits.

**Why this priority**: Enhances usability by allowing users to document role purposes, but not required for core data display functionality.

**Independent Test**: Can be tested by clicking to edit a role description, entering custom text, saving, and verifying the description persists after page reload.

**Acceptance Scenarios**:

1. **Given** a role has no description from the adapter, **When** viewing the role details, **Then** an editable placeholder is shown (e.g., "Click to add description")
2. **Given** the user clicks on an empty or existing description, **When** the edit mode activates, **Then** an inline text input appears with the current description (or empty)
3. **Given** the user enters a custom description and saves, **When** the edit is complete, **Then** the description is persisted to the contract record in local storage
4. **Given** a custom description has been saved, **When** the user returns to the page, **Then** the custom description is displayed
5. **Given** a role has both adapter-provided and user-provided descriptions, **When** displaying the role, **Then** the user-provided description takes precedence

---

### Edge Cases

- What happens when the contract has no roles assigned? Display the role list with 0 member counts and an empty state in details panel
- What happens when network connectivity is lost during data fetch? Display cached data if available, otherwise show error state with retry
- What happens when the selected contract changes while data is loading? Cancel pending requests and load data for the new contract
- What happens when a role has hundreds of members? Implement client-side pagination/virtualization per FR-013 from spec 006
- What happens when the adapter returns an error? Display contextual error in the affected component with retry option
- What happens when user tries to save an empty description? Clear the custom description and revert to adapter-provided description (if any) or placeholder
- What happens when description edit is cancelled (Escape key)? Discard changes and revert to previous state
- What happens when user edits description for a role that gets removed from the contract? Custom descriptions are orphaned but do not cause errors; they are cleaned up when the contract record is deleted
- What happens when user is editing a description and data refreshes? Description edit continues uninterrupted; if the role is removed during refresh, edit is cancelled and selection resets to first available role
- What happens when no wallet is connected? Page displays normally; "You" badge is simply not shown for any account

## Requirements _(mandatory)_

### Functional Requirements

#### Data Integration

- **FR-001**: Page MUST use `useContractRoles` hook from spec 006 to fetch real role data
- **FR-002**: Page MUST use `useContractOwnership` hook from spec 006 to fetch ownership data
- **FR-003**: Page MUST use `useAccessControlService` hook to access detected capabilities
- **FR-004**: Page MUST respect the `AccessControlCapabilities` to determine which features to display (hasAccessControl, hasOwnable)
- **FR-005**: Page MUST handle loading, error, and success states for all data fetching operations

#### Role List Integration

- **FR-006**: RoleCard component MUST accept real `RoleAssignment` data from the adapter
- **FR-007**: RoleCard MUST display actual member count from `roleAssignment.members.length`
- **FR-008**: Owner role MUST be populated from ownership data when `hasOwnable: true`
- **FR-009**: Standard AccessControl roles MUST be populated when `hasAccessControl: true`
- **FR-010**: Role descriptions MUST follow this priority: (1) user-provided custom description, (2) adapter-provided description, (3) editable placeholder

#### Details Panel Integration

- **FR-011**: AccountRow component MUST accept real member addresses from `RoleAssignment.members`
- **FR-012**: AccountRow MUST detect and display "You" badge when address matches connected wallet
- **FR-013**: AccountRow MUST display assignment date when provided by adapter, hide when unavailable
- **FR-014**: For Owner role, details panel MUST show single owner address from `OwnershipInfo`

#### State Management

- **FR-015**: Page MUST maintain selected role state, defaulting to first available role
- **FR-016**: Page MUST handle contract switching by resetting state and fetching new data
- **FR-017**: Page MUST support data refresh via `refetch` from hooks (manual and after mutations)
- **FR-018**: Page MUST implement optimistic UI updates where possible for responsive feel

#### Error Handling

- **FR-019**: Page MUST display loading skeletons during initial data fetch
- **FR-020**: Page MUST display error states with retry actions when data fetching fails
- **FR-021**: Page MUST show empty state when contract has no AccessControl or Ownable capabilities
- **FR-022**: Page MUST gracefully handle partial data (e.g., roles loaded but ownership failed)

#### Role Description Editing

- **FR-023**: Role description MUST be editable inline in the details panel when clicked by the user
- **FR-024**: When a role has no adapter-provided description, a clickable placeholder MUST be displayed (e.g., "Click to add description")
- **FR-025**: Edit mode MUST display an inline text input with the current description pre-filled
- **FR-026**: User MUST be able to save the description by pressing Enter or clicking outside (blur)
- **FR-027**: User MUST be able to cancel editing by pressing Escape, reverting to the previous value
- **FR-028**: Custom role descriptions MUST be persisted to the contract record in local storage (IndexedDB via existing storage infrastructure)
- **FR-029**: Custom descriptions MUST take precedence over adapter-provided descriptions when both exist
- **FR-030**: Saving an empty description MUST clear the custom description and revert to adapter-provided (if any) or placeholder
- **FR-031**: Description edits MUST be saved per role identifier within the contract record
- **FR-031a**: Custom descriptions MUST be limited to 256 characters; input exceeding this limit MUST show validation error

#### Role Identifiers Table

- **FR-032**: Table MUST be populated with actual role identifiers detected from the contract
- **FR-033**: Table MUST include custom roles not in the standard set
- **FR-034**: Table MUST display role identifier (hash), human-readable name, and description (including custom descriptions); table is read-only (no inline editing)

### Non-Functional Requirements

- **NFR-001**: Initial page load with data MUST complete within 3 seconds on standard network conditions
- **NFR-002**: Role selection MUST update details panel within 100ms (local state change only)
- **NFR-003**: Data refresh MUST show loading state without blocking UI interaction
- **NFR-004**: Page MUST remain responsive with up to 100 roles and 1000 total members

### Key Entities

- **RoleAssignment**: Real data from adapter containing role identifier, name, and member addresses (from spec 006)
- **OwnershipInfo**: Real ownership data containing owner address (from spec 006)
- **AccessControlCapabilities**: Feature detection result determining available features (from spec 006)
- **ConnectedWallet**: Current user's wallet address for "You" badge detection
- **CustomRoleDescriptions**: User-provided role descriptions stored per contract, keyed by role identifier (extends RecentContractRecord)

## Integration Points

### From Spec 006 (Access Control Service)

```typescript
// Hooks to be used
useAccessControlService(contractAddress): {
  capabilities: AccessControlCapabilities;
  isLoading: boolean;
  error: Error | null;
}

useContractRoles(contractAddress): {
  roles: RoleAssignment[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

useContractOwnership(contractAddress): {
  ownership: OwnershipInfo;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}
```

### From Spec 008 (UI Components)

```typescript
// Components to be updated
RoleCard: { role: RoleAssignment; isSelected: boolean; onClick: () => void }
RoleDetails: { role: RoleAssignment; isOwnerRole: boolean; ... }
AccountRow: { address: string; isCurrentUser: boolean; assignedDate?: Date; ... }
RolesList: { roles: RoleAssignment[]; selectedRole: string; ... }
RoleIdentifiersTable: { roles: RoleIdentifier[] }
```

### From App Context

```typescript
// Contract context
useSelectedContract(): {
  contract: RecentContractRecord | null;
  capabilities: AccessControlCapabilities | null;
}

// Wallet context
useConnectedWallet(): {
  address: string | null;
  isConnected: boolean;
}
```

## Assumptions

- **ASSUMP-001**: The hooks from spec 006 are fully implemented and functional
- **ASSUMP-002**: The UI components from spec 008 are complete and accept the documented props
- **ASSUMP-003**: Contract selection context is available to determine which contract's data to fetch
- **ASSUMP-004**: Connected wallet context is available for "You" badge detection
- **ASSUMP-005**: Role identifier to description mapping exists or can be derived from adapter metadata
- **ASSUMP-006**: The adapter's `getCurrentRoles` returns data in a format compatible with UI components

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Real role data displays correctly for contracts with AccessControl capabilities (100% accuracy vs on-chain state)
- **SC-002**: Real ownership data displays correctly for contracts with Ownable capabilities (100% accuracy vs on-chain state)
- **SC-003**: Connected wallet address is correctly identified with "You" badge (100% accuracy)
- **SC-004**: Page loads and displays data within 3 seconds on standard network (p95)
- **SC-005**: Role selection updates details panel within 100ms (local state)
- **SC-006**: Error states provide actionable feedback with retry options (100% of error scenarios covered)
- **SC-007**: Custom role descriptions persist across page reloads and browser sessions (100% persistence accuracy)
- **SC-008**: Role description inline editing completes (save/cancel) within 100ms of user action
