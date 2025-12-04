# Feature Specification: Access Control Service & Hooks

**Feature Branch**: `006-access-control-service`  
**Created**: 2024-12-04  
**Status**: Draft  
**Input**: User description: "Access Control service and hooks that interface with the UI Builders adapters Access Controll module. We have prepared fully functional Access Control modules in Stellar adapter. It's time to add a service and relevant hooks that will be the glue between the adapters access control module and the Role Managers UI. It's important to implement the feature detection step as the follwing step after we get contracts schema. Before we can save the contract it must pass the validation - meaning it must be a supported contract that uses standard OpenZeppelin Access Control + Ownable interfaces. Adapter has this logic built already, so the service should just use it."

## Clarifications

### Session 2024-12-04

- Q: How should feature detection integrate with the existing Add Contract flow and storage? -> A: Feature detection must occur after schema loading but **before** persistence. The persistence step (save) must include the detected `AccessControlCapabilities` in the same `RecentContractRecord`. Saving is conditional on validation success (must support AccessControl or Ownable).

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Load Contract & Detect Features (Priority: P1)

As an Administrator, I want to load a contract and immediately see which access control features it supports, so that I only see relevant management options.

**Why this priority**: Core entry point for the application. Without detection, we cannot show the correct UI.

**Independent Test**: Can be tested by loading contracts with different capabilities (Ownable only, AccessControl only, Both, None) and asserting the returned capabilities object matches.

**Acceptance Scenarios**:

1. **Given** a contract address that implements OpenZeppelin AccessControl, **When** I load the contract, **Then** the system detects `hasAccessControl: true` and enables the Roles tab.
2. **Given** a contract address that implements OpenZeppelin Ownable, **When** I load the contract, **Then** the system detects `hasOwnable: true` and enables the Ownership tab.
3. **Given** a contract that supports neither, **When** I load it, **Then** the system alerts that the contract is not supported for management.
4. **Given** an invalid contract address, **When** I attempt to load it, **Then** an appropriate error message is displayed.

---

### User Story 2 - View Roles and Members (Priority: P1)

As an Administrator, I want to view a list of all current roles and their assigned members, so that I can audit access permissions.

**Why this priority**: Essential for understanding the current security state of the contract.

**Independent Test**: Can be tested by calling the service's `getCurrentRoles` method and verifying it returns the expected list of role assignments from the adapter.

**Acceptance Scenarios**:

1. **Given** a loaded AccessControl contract with existing role assignments, **When** I view the Roles section, **Then** I see a list of roles (e.g., DEFAULT_ADMIN_ROLE, MINTER_ROLE) and the addresses assigned to them.
2. **Given** a contract with no members assigned to a role, **When** I view the Roles section, **Then** the role is displayed with an empty member list or "No members" indicator.
3. **Given** the indexer is down (if applicable), **When** I view roles, **Then** the system gracefully falls back to on-chain data (if supported by adapter) or shows a partial data warning.

---

### User Story 3 - View and Manage Ownership (Priority: P1)

As an Administrator, I want to view the current owner and transfer ownership, so that I can manage the contract's supreme authority.

**Why this priority**: Critical for Ownable contracts management.

**Independent Test**: Can be tested by calling `getOwnership` to read state and `transferOwnership` to execute a change.

**Acceptance Scenarios**:

1. **Given** a loaded Ownable contract, **When** I view the Ownership section, **Then** the current owner's address is displayed.
2. **Given** I am the current owner, **When** I submit a "Transfer Ownership" request to a new address, **Then** the system triggers a wallet signature request for the transaction.
3. **Given** the transaction is confirmed, **When** the UI refreshes, **Then** the new owner address is displayed.

---

### User Story 4 - Grant and Revoke Roles (Priority: P2)

As an Administrator, I want to grant new roles to addresses or revoke existing ones, so that I can maintain correct access privileges.

**Why this priority**: The primary action for modifying access control state.

**Independent Test**: Can be tested by invoking `grantRole` and `revokeRole` through the hooks and verifying the adapter receives the correct parameters.

**Acceptance Scenarios**:

1. **Given** a specific role (e.g., MINTER_ROLE), **When** I enter an address and click "Grant", **Then** the system triggers a wallet signature for the grant transaction.
2. **Given** an existing member of a role, **When** I click "Revoke", **Then** the system triggers a wallet signature for the revoke transaction.
3. **Given** a successful grant/revoke transaction, **When** the transaction is confirmed, **Then** the roles list automatically updates to reflect the change.

---

### User Story 5 - Export Access Snapshot (Priority: P3)

As an Auditor, I want to download a snapshot of the current access control state, so that I can keep an offline record or share it with others.

**Why this priority**: Useful utility for reporting but not blocking core management.

**Independent Test**: Can be tested by calling `exportSnapshot` and verifying the output JSON structure.

**Acceptance Scenarios**:

1. **Given** a loaded contract with role data, **When** I click "Export Snapshot", **Then** a JSON file containing all roles, members, and ownership info is downloaded.

### Edge Cases

- **Indexer Unavailability**: The system must handle cases where the indexer (used for historical data or efficient querying) is offline, falling back to on-chain calls where possible or disabling affected features (like history) with a user warning.
- **Unsupported Contract**: If a user loads a contract that doesn't match standard interfaces, the detection step must fail gracefully and inform the user why (validation failure prevents saving).
- **Network Congestion**: Transaction status updates (pending, confirmed) must handle delays robustly without hanging the UI.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The system MUST implement a `useAccessControlService` hook that interfaces with the UI Builder adapter's Access Control module.
- **FR-002**: The system MUST perform feature detection immediately after contract schema retrieval using `accessControlService.getCapabilities(address)`.
- **FR-003**: The system MUST validate that the contract supports at least one managed interface (AccessControl or Ownable) before allowing it to be "Saved" to the local workspace.
- **FR-004**: The system MUST implement `useContractRoles` and `useContractOwnership` hooks to fetch and subscribe to state changes.
- **FR-005**: The system MUST implement mutation hooks (`useGrantRole`, `useRevokeRole`, `useTransferOwnership`) that delegate execution to the adapter.
- **FR-006**: The system MUST persist the contract reference in IndexedDB (via `ui-builder-storage`) only _after_ successful validation of capabilities, and MUST include the detected `capabilities` metadata in the same `RecentContractRecord`.
- **FR-007**: The system MUST NOT contain chain-specific logic (e.g., parsing raw bytes, specific ABI decoding) in the UI layer; it must rely entirely on adapter abstractions.
- **FR-008**: The `RecentContractRecord` type MUST be extended to include an optional `capabilities` field (type `AccessControlCapabilities`).

### Key Entities

- **AccessControlCapabilities**: Object describing what the contract supports (`hasAccessControl`, `hasOwnable`, `hasEnumerableRoles`, etc.).
- **RoleAssignment**: Data structure linking a Role (ID + Label) to a list of Member addresses.
- **OwnershipInfo**: Data structure containing the current owner address (or null).
- **AccessSnapshot**: Serializable object containing full role and ownership state for export.
- **RecentContractRecord**: Existing storage entity, to be extended with `capabilities`.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Feature detection completes successfully for supported contracts (Stellar AccessControl/Ownable) without user intervention.
- **SC-002**: 100% of blockchain interactions (reads/writes) are routed through the adapter interface, with zero direct RPC calls in the UI components.
- **SC-003**: Users can successfully grant/revoke a role and see the UI update to reflect the new state.
- **SC-004**: System prevents adding unsupported contracts to the workspace (0% false positives for supported status).
