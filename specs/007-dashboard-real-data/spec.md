# Feature Specification: Dashboard Real Data Integration

**Feature Branch**: `007-dashboard-real-data`  
**Created**: 2025-12-04  
**Status**: Draft  
**Input**: User description: "Populate Dashboard page with real data. Use the functionality implemented in previous specs."

## Clarifications

### Session 2025-12-04

- Q: When a contract supports only Ownable (no AccessControl), how should the Roles stats card behave? → A: Show Roles card with "Not Supported" badge and disable click navigation.
- Q: What naming pattern should be used for the downloaded JSON snapshot file? → A: `access-snapshot-{contractAddress-truncated}-{timestamp}.json` (e.g., `access-snapshot-GCKF...MTGG-2025-12-04T10-30-00.json`).

## User Scenarios & Testing _(mandatory)_

### User Story 1 - View Contract Information on Dashboard (Priority: P1)

As an administrator who has selected a contract, I want to see the actual contract details (name, address, network, detected capabilities) on the Dashboard, so that I can confirm I'm viewing the correct contract and understand its access control features.

**Why this priority**: The Dashboard is the landing page and primary entry point. Without real contract information, users cannot verify they're working with the correct contract or understand its capabilities.

**Independent Test**: Can be fully tested by selecting a contract from the sidebar, navigating to the Dashboard, and verifying the Contract Information card displays the correct name, address, network, and contract type derived from the stored contract record and detected capabilities.

**Acceptance Scenarios**:

1. **Given** a contract is selected in the sidebar, **When** I view the Dashboard, **Then** the Contract Information card shows the contract's label (name), full address, and network name.

2. **Given** a contract with AccessControl capabilities is selected, **When** I view the Dashboard, **Then** the Contract Type badge displays "Access Control" or similar capability indicator.

3. **Given** a contract with Ownable capabilities is selected, **When** I view the Dashboard, **Then** the Contract Type badge reflects the ownership capability.

4. **Given** no contract is selected, **When** I view the Dashboard, **Then** an empty state prompts the user to add or select a contract.

---

### User Story 2 - View Live Role and Account Statistics (Priority: P1)

As an administrator, I want to see the actual count of roles and authorized accounts on the Dashboard, so that I can quickly assess the access control configuration at a glance.

**Why this priority**: The statistics cards provide immediate insight into the contract's security posture. Showing accurate counts is essential for the Dashboard to be useful.

**Independent Test**: Can be tested by loading a contract with known role assignments, navigating to the Dashboard, and verifying the Roles count matches the number of configured roles and the Authorized Accounts count matches the number of unique addresses with role assignments.

**Acceptance Scenarios**:

1. **Given** a contract with 3 configured roles, **When** I view the Dashboard, **Then** the Roles stats card displays "3".

2. **Given** a contract with 8 unique addresses across all roles, **When** I view the Dashboard, **Then** the Authorized Accounts stats card displays "8".

3. **Given** a contract with no roles configured, **When** I view the Dashboard, **Then** the Roles stats card displays "0".

4. **Given** roles data is loading, **When** I view the Dashboard, **Then** the stats cards show a loading indicator instead of the count.

5. **Given** an error occurs while fetching roles, **When** I view the Dashboard, **Then** the stats cards show an error state with a retry option.

---

### User Story 3 - Refresh Dashboard Data (Priority: P2)

As an administrator, I want to manually refresh the Dashboard data, so that I can see the latest on-chain state after external changes have been made.

**Why this priority**: Allows users to fetch fresh data without reloading the entire page. Important for real-time management scenarios but not strictly required for initial display.

**Independent Test**: Can be tested by making an external role change (via different tool), clicking Refresh Data, and verifying the updated counts appear.

**Acceptance Scenarios**:

1. **Given** I am viewing the Dashboard, **When** I click "Refresh Data", **Then** the roles and ownership data are refetched from the blockchain.

2. **Given** a refresh is in progress, **When** the button is clicked, **Then** a loading indicator appears on the button and the stats cards update once data is received.

3. **Given** the refresh fails (network error), **When** the refresh completes, **Then** an error notification is displayed and the previous data remains visible.

---

### User Story 4 - Download Access Control Snapshot (Priority: P3)

As an auditor or administrator, I want to download a JSON snapshot of the current access control state, so that I can keep an offline record, share it with others, or compare states over time.

**Why this priority**: Useful utility for reporting and auditing but not required for day-to-day management. Lower priority as it doesn't affect core viewing functionality.

**Independent Test**: Can be tested by clicking "Download Snapshot", verifying a JSON file is downloaded, and confirming the file contains roles, members, and ownership information.

**Acceptance Scenarios**:

1. **Given** a contract is loaded with role data, **When** I click "Download Snapshot", **Then** a JSON file is downloaded containing all roles, their members, and ownership information.

2. **Given** the snapshot file is downloaded, **When** I inspect the file contents, **Then** it includes contract address, network, timestamp, roles array, and ownership info.

3. **Given** no contract is selected, **When** I view the Dashboard, **Then** the Download Snapshot button is disabled.

---

### Edge Cases

- **No Contract Selected**: Dashboard shows a clear empty state with guidance to add or select a contract. Stats cards and action buttons are disabled.
- **Contract Without Roles Support**: If the contract only supports Ownable (no AccessControl), the Roles card displays "Not Supported" badge and click navigation is disabled (card is not clickable).
- **Stale Data After Network Switch**: If the user switches networks while viewing the Dashboard, data should automatically refetch for the new context.
- **Large Number of Roles/Members**: Dashboard should handle contracts with 100+ roles or 1000+ members without performance degradation.
- **Partial Data Availability**: If roles fetch succeeds but ownership fetch fails, show partial data with error indicator only on the failed section.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: Dashboard MUST display the selected contract's label (name), full address, and network name from the stored `RecentContractRecord`.
- **FR-002**: Dashboard MUST display the contract type based on detected `AccessControlCapabilities` (e.g., "Access Control", "Ownable", "Access Control + Ownable").
- **FR-003**: Dashboard MUST fetch roles data using the existing `useContractRoles` hook from spec 006.
- **FR-004**: Dashboard MUST display the total count of configured roles in the Roles stats card.
- **FR-005**: Dashboard MUST calculate and display the count of unique authorized accounts (deduplicated addresses across all role members) in the Authorized Accounts stats card.
- **FR-006**: Dashboard MUST show loading states while roles/ownership data is being fetched.
- **FR-007**: Dashboard MUST show error states with contextual messages when data fetching fails. Each failed section (roles or ownership) displays an inline error message with a "Retry" button positioned below the message. Retry triggers refetch for the failed data only.
- **FR-008**: The "Refresh Data" button MUST trigger a refetch of roles and ownership data using the `refetch` functions provided by the data hooks.
- **FR-009**: The "Download Snapshot" button MUST generate and download a JSON file containing the current access control state. Filename format: `access-snapshot-{address-truncated}-{ISO-timestamp}.json` (e.g., `access-snapshot-GCKF...MTGG-2025-12-04T10-30-00.json`).
- **FR-010**: The snapshot file MUST include: contract address, network ID, timestamp, capabilities, roles array (with members), and ownership information.
- **FR-011**: Dashboard MUST show an empty state when no contract is selected. Empty state displays: title "No Contract Selected", description "Select a contract from the sidebar or add a new one to get started", and primary CTA button "Add Contract" that opens the AddContractDialog.
- **FR-012**: Dashboard action buttons (Refresh Data, Download Snapshot) MUST be disabled when no contract is selected or when data is loading.
- **FR-013**: Dashboard MUST integrate with the application's selected contract context (from sidebar/contract selector).
- **FR-014**: For contracts without AccessControl support (Ownable-only), the Roles stats card MUST display "Not Supported" badge instead of a count and MUST NOT be clickable.

### Key Entities

- **DashboardData**: Aggregated view model containing contract info, roles summary, and ownership info for display.
- **AccessSnapshot**: Serializable object for export containing:
  - `version`: Schema version string (e.g., "1.0") for forward compatibility
  - `exportedAt`: ISO 8601 timestamp of export
  - `contract`: { address, label, networkId, networkName }
  - `capabilities`: { hasAccessControl, hasOwnable, hasEnumerableRoles? }
  - `roles`: Array of { roleId, roleName, members[] }
  - `ownership`: { owner: string | null, pendingOwner?: string | null }
- **RecentContractRecord** (existing): Storage entity with contract metadata and capabilities from spec 006.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Dashboard displays accurate contract information within 500ms of selecting a contract.
- **SC-002**: Roles and Authorized Accounts counts match the actual on-chain state (verified by comparing with adapter data).
- **SC-003**: Users can refresh data and see updated counts within 5 seconds of clicking "Refresh Data".
- **SC-004**: Downloaded snapshot file is valid JSON and contains all required fields (contract address, network, timestamp, roles, ownership).
- **SC-005**: Dashboard handles contracts with 50+ roles without visual lag or performance issues.
- **SC-006**: Empty state is displayed immediately when no contract is selected, with no flash of stale data.

## Assumptions

- **ASSUMP-001**: A contract selection context (React context or prop drilling) exists or will be created to share the selected contract across the application.
- **ASSUMP-002**: The `useContractRoles` and `useContractOwnership` hooks from spec 006 are fully functional and available.
- **ASSUMP-003**: The adapter is available when a contract is selected (loaded via ecosystem manager per spec 004/005).
- **ASSUMP-004**: Network configurations include `explorerUrl` for generating explorer links.
- **ASSUMP-005**: The file download functionality uses standard browser APIs (Blob + anchor click pattern).
