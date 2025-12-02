# Feature Specification: Data Store Service

**Feature Branch**: `003-data-store-service`
**Created**: 2025-12-01
**Status**: Draft  
**Input**: User description: "A store service that will be responsible for data CRUD functionality across the whole app."

## Clarifications

### Session 2025-12-01

- Q: What is the maximum number of recent contracts to store? → A: Unlimited (Grow indefinitely until browser quota error)
- Q: How should multi-network data be structured in IndexedDB? → A: Single table + network column (One `RecentContracts` table, filtered by `networkId`)

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Recall Recently Accessed Contracts (Priority: P1)

As an administrator or operator who manages multiple contracts, I want the application to automatically save and list the contracts I have successfully loaded, so that I can quickly switch between them or revisit them in future sessions without re-typing addresses.

**Why this priority**: Reduces friction for users managing multiple contracts, which is a core use case.
**Independent Test**: Load a contract, refresh the page, and verify the contract appears in a "Recent" list.

**Acceptance Scenarios**:

1. **Given** a new user session, **When** I successfully load a contract by address, **Then** it is added to my "Recent Contracts" list.
2. **Given** a list of recent contracts, **When** I select one, **Then** the application loads that contract's details immediately.
3. **Given** a contract in the recent list, **When** I give it a custom nickname, **Then** the nickname is saved and displayed.
4. **Given** a recent contract I no longer need, **When** I delete it from the list, **Then** it is removed from local storage.
5. **Given** I reload a contract already present in recents for the same network, **When** it is loaded again, **Then** its `lastAccessed` is updated and no duplicate entry is created.

---

### User Story 2 - Persist User Preferences (Priority: P2)

As a user, I want the application to remember my selected network and display settings, so that I don't have to re-configure the environment every time I open the app.

**Why this priority**: Improves quality of life but not strictly required for core functionality.
**Independent Test**: Change network to "Stellar Testnet", close tab, reopen, and verify "Stellar Testnet" is still selected.

**Acceptance Scenarios**:

1. **Given** I have selected a specific network (e.g., Stellar Mainnet), **When** I reload the page, **Then** that network remains selected.
2. **Given** I have customized UI filters (if any), **When** I return to the app, **Then** those filters are restored.

---

### Edge Cases

- Storage quota exceeded: the system surfaces a clear message that saving failed due to browser quota and preserves existing records.
- Concurrent updates in multiple tabs: the list reflects updates reactively; last writer wins based on the most recent `lastAccessed`.
- Data schema changes between app versions: future versions will migrate/upgrade without data loss.
- Saved contract on a network that becomes unsupported: entries are hidden from default views and remain deletable.
- No recent contracts yet: show an empty state and guidance.
- No preferences set: apply sensible defaults (e.g., default network selection).
- Invalid contract address input: entries that fail adapter/address validation MUST NOT be persisted.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST persist a list of successfully loaded contracts, capturing address, network ID, last accessed timestamp, and an optional user-defined label.
- **FR-002**: System MUST allow users to manually remove entries from the recent contracts list.
- **FR-003**: System MUST automatically update the `lastAccessed` timestamp when a saved contract is re-loaded.
- **FR-004**: System MUST persist the user's currently selected network/ecosystem context across sessions.
- **FR-005**: System MUST operate entirely with local browser storage (IndexedDB) without reliance on a remote backend database.
- **FR-006**: System MUST ensure data isolation between different networks (e.g., a contract address on Testnet should be distinct from the same address on Mainnet).
- **FR-007**: System MUST NOT enforce an arbitrary limit on the number of stored contracts, allowing growth until browser storage quotas are reached.
- **FR-008**: System MUST store all recent contracts in a single collection/table that can be filtered by `networkId` and sorted by `lastAccessed`.
- **FR-009**: System MUST list recent contracts filtered by the active network and ordered by `lastAccessed` descending.
- **FR-010**: System MUST enforce uniqueness per `[networkId, address]` and update `lastAccessed` instead of creating duplicates.
- **FR-011**: System SHOULD reflect changes across multiple open tabs/windows and resolve conflicts with last-writer-wins on `lastAccessed`.
- **FR-012**: On storage quota errors, the system MUST inform the user and MUST NOT delete existing records automatically.
- **FR-013**: Entries from unsupported networks SHOULD be hidden by default and remain deletable.
- **FR-014**: The system SHOULD NOT persist recent entries that fail adapter-level address validation.

### Key Entities

- **RecentContract**: Represents a smart contract the user has interacted with. Attributes: Address, Network ID, Label/Name, Last Accessed Date.
- **UserPreference**: Represents global application settings. Attributes: Key (e.g., 'active_network'), Value.

### Non-Functional Requirements

- **NFR-001**: Persistence operations (save/update/list) SHOULD be responsive; the recent list render for 50 items SHOULD complete with p95 < 150ms on a typical modern desktop.
- **NFR-002**: Data operations MUST be atomic (no partial writes); in case of failure, either the previous state remains or the new state is fully applied.
- **NFR-003**: Only non-sensitive data (addresses, labels, preferences) is stored locally; no private keys, secrets, or credentials are stored.

## Assumptions & Dependencies

- **ASSUMP-001**: Runs in modern browsers with IndexedDB support; no guarantee for legacy browsers without IndexedDB.
- **ASSUMP-002**: Storage uses the existing app-agnostic storage infrastructure available in the UI Builder ecosystem.
- **ASSUMP-003**: Schema versioning and migrations will be applied to preserve existing data across app upgrades.
- **ASSUMP-004**: `networkId` uses adapter-provided canonical identifiers and is treated as a string.
- **ASSUMP-005**: Labels are user-provided, trimmed strings with a reasonable maximum length (e.g., 64 characters) and no control characters.
- **ASSUMP-006**: Preference keys are strings (e.g., `active_network`); values may be primitives or JSON; unknown keys are allowed for forward compatibility.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Users can access a contract they loaded yesterday in < 2 clicks (via Recent list).
- **SC-002**: The system supports at least 50 recent contracts while keeping recent-list p95 render under 150ms.
- **SC-003**: 95% of recent-list queries complete within 100ms for up to 50 records; persistence operations do not block the main thread for more than 50ms.
- **SC-004**: Users confirm that their data persists after closing and reopening the browser 100% of the time.
