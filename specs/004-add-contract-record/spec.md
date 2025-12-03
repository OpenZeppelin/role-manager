# Feature Specification: Add Contract Record

**Feature Branch**: `004-add-contract-record`  
**Created**: 2025-12-02  
**Status**: Draft  
**Input**: User description: "Add contract record creation feature with dialog containing name, address, and network selector fields. Uses existing UI components from UI Builder. Address validation is network-specific via adapter pattern."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Add New Contract Record (Priority: P1)

A user wants to add a new contract to track in the Role Manager. They click "Add Contract" in the sidebar, which opens a dialog. The user enters a contract name for identification, pastes the contract address, selects the appropriate network from a dropdown, and clicks "Add" to save the contract record.

**Why this priority**: This is the core functionality - without being able to add contracts, users cannot use the Role Manager to track any contracts.

**Independent Test**: Can be fully tested by opening the dialog, filling in all fields with valid data, and verifying the contract appears in the contract selector dropdown. Delivers immediate value by allowing users to add contracts to track.

**Acceptance Scenarios**:

1. **Given** the user is viewing the sidebar with no contracts added, **When** the user clicks "Add Contract", **Then** a dialog appears with fields for contract name, address, and network selection.

2. **Given** the Add Contract dialog is open, **When** the user enters a valid name ("My Contract"), valid address ("0x1234..."), selects "Ethereum Mainnet", and clicks "Add", **Then** the dialog closes, the contract is saved, and it becomes the active selection in the contract selector.

3. **Given** the Add Contract dialog is open with all valid inputs, **When** the user clicks "Cancel", **Then** the dialog closes without saving any data.

---

### User Story 2 - Network-Specific Address Validation (Priority: P1)

A user enters a contract address that should be validated against the selected network's address format. The system uses the appropriate blockchain adapter to validate the address format in real-time as the user types or changes networks.

**Why this priority**: Address validation prevents data corruption and user frustration from invalid entries. Critical for data integrity since invalid addresses would make contracts unusable.

**Independent Test**: Can be tested by selecting different networks (EVM, Solana, Stellar) and entering addresses with various formats - verifying valid addresses are accepted and invalid ones show error messages.

**Acceptance Scenarios**:

1. **Given** the user has selected "Ethereum Mainnet" (EVM), **When** the user enters an invalid address format (e.g., "not-an-address"), **Then** an error message displays indicating the address format is invalid.

2. **Given** the user has selected "Ethereum Mainnet" (EVM), **When** the user enters a valid EVM address (e.g., "0xA1B2C3D4E5F67890ABCD1234E56789ABCDEF12"), **Then** no validation error appears and the Add button is enabled.

3. **Given** the user has entered an address and then changes the network selection, **When** the new network requires a different address format, **Then** the address is re-validated against the new network's rules and error state updates accordingly.

---

### User Story 3 - Network Selection with Search (Priority: P2)

A user needs to select from multiple supported networks across different blockchain ecosystems. The network selector provides search functionality and groups networks by ecosystem for easier navigation.

**Why this priority**: Users may work with many networks; efficient network selection improves UX but is not strictly required for basic functionality.

**Independent Test**: Can be tested by opening the network dropdown, searching for networks by name, and verifying filtering and grouping work correctly.

**Acceptance Scenarios**:

1. **Given** the Add Contract dialog is open, **When** the user clicks the network selector, **Then** a dropdown appears showing all available networks grouped by ecosystem (EVM, Solana, Stellar, etc.).

2. **Given** the network dropdown is open, **When** the user types "sep" in the search field, **Then** the list filters to show only networks containing "sep" (e.g., "Ethereum Sepolia").

3. **Given** a network is selected, **When** the network selector displays the selection, **Then** it shows the network name, icon, and network type badge (mainnet/testnet).

---

### User Story 4 - Delete Contract Record (Priority: P2)

A user wants to remove a contract they no longer need to track. From the contract selector dropdown, users can delete contracts they are not currently viewing.

**Why this priority**: Delete completes the basic contract management flow but is less frequently used than creation.

**Independent Test**: Can be tested by adding a contract, then using the delete action from the dropdown to remove it and verifying it no longer appears.

**Acceptance Scenarios**:

1. **Given** the contract selector dropdown is open with multiple contracts, **When** the user clicks the delete icon on a non-selected contract, **Then** the contract is removed from storage and disappears from the list.

2. **Given** a contract is currently selected, **When** the user views the dropdown, **Then** the delete icon is not shown for the currently selected contract (cannot delete active selection).

---

### Out of Scope

- **Edit Contract**: Modifying an existing contract's name, address, or network is deferred to a future feature.

---

### Edge Cases

**Input Validation**:

- What happens when the user submits with an empty contract name? → System displays validation error "Contract name is required".
- What happens when the user submits with an empty address? → System displays validation error "Contract address is required".
- What happens when no network is selected? → The Add button remains disabled; address field is disabled with placeholder "Select a network first".
- What happens if user types 65+ characters in name field? → Input is allowed but error "Contract name must be 64 characters or less" is shown. (Boundary: 63 chars ✓, 64 chars ✓, 65 chars ✗)
- What happens when user pastes invalid content into address field? → Paste is allowed; validation error shown immediately after paste.
- What happens with whitespace in name field? → Leading/trailing whitespace is trimmed before validation and save. A name of only whitespace is invalid.
- What happens with whitespace in address field? → Leading/trailing whitespace is trimmed. Addresses are validated after trimming.
- What happens with mixed case in EVM addresses? → Addresses are validated as-is; checksum validation is delegated to adapter (EVM adapter handles checksum).

**Network & Adapter**:

- What happens if a contract with the same address and network already exists? → System updates the existing record's lastAccessed timestamp (upsert behavior per existing storage implementation).
- What happens if adapter loading fails? → Error message displayed on address field with retry option (see ERR-002).
- What happens if all ecosystems are disabled? → Empty state shown in dialog (see ERR-005).
- What happens with rapid network switching? → Each switch cancels pending adapter load; only the final network's adapter is used.
- What happens when user selects Solana (disabled ecosystem)? → Solana networks are NOT shown in the selector (filtered out based on ecosystem config).

**Dialog Behavior**:

- What happens if the user presses Escape while the dialog is open? → Dialog closes without saving; form state is NOT persisted.
- What happens if user re-opens dialog after cancellation? → Form starts fresh (empty fields, no pre-filled values).
- What happens if user adds multiple contracts in succession? → Each time dialog opens fresh; previous contract is selected after first add.
- What happens if the address field is focused and user presses Escape? → Dialog closes (Escape propagates to dialog).

**Delete Behavior**:

- What happens when user deletes the last remaining contract? → The selector shows empty state with "Add Contract" option.
- What happens if user tries to delete the currently selected contract? → Delete icon is NOT shown for the active selection (hidden, not disabled).
- What happens if delete fails? → Toast error shown; contract remains in list (see ERR-004).
- What happens with concurrent delete attempts (multi-tab)? → Second delete silently succeeds (idempotent) or fails gracefully with error toast.

**Recovery**:

- What happens if browser refresh occurs mid-add? → Form state is lost; no persistence of partial form state.
- What happens after a failed save attempt? → Form remains open with error toast; user can retry or cancel.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST display an "Add Contract" dialog when user triggers the add action from the contract selector.
- **FR-002**: Dialog MUST contain three input fields: Contract Name (text), Contract Address (address), and Network (selector).
- **FR-003**: System MUST validate contract name is non-empty with maximum 64 characters. Validation occurs on blur and on submit; input is NOT prevented (user can type beyond limit, error shown).
- **FR-004**: System MUST validate contract address format based on the selected network's adapter using `adapter.isValidAddress()`.
- **FR-005**: System MUST re-validate address when user changes network selection.
- **FR-006**: System MUST enable the "Add" button only when all required fields are valid.
- **FR-007**: System MUST save valid contract records to persistent storage using the existing `RecentContractsStorage.addOrUpdate()` method.
- **FR-008**: System MUST close the dialog upon successful save or user cancellation.
- **FR-008a**: Upon successful save, system MUST auto-select the newly added contract in the sidebar selector by calling the contract selection callback with the new contract's ID.
- **FR-009**: Network selector MUST support search/filter functionality.
- **FR-010**: Network selector MUST group networks by ecosystem when displaying options. Groups are displayed as labeled sections (not accordions) in the order: EVM, Stellar, Midnight, Solana.
- **FR-011**: Network selector MUST display network icon, name, and type badge (mainnet/testnet).
- **FR-012**: Dialog MUST use existing UI components from `@openzeppelin/ui-builder-ui` package (TextField, AddressField patterns, NetworkSelector, Dialog).
- **FR-013**: System MUST load the appropriate blockchain adapter based on the selected network's ecosystem for address validation.
- **FR-014**: System MUST allow users to delete non-selected contracts from the contract selector dropdown.
- **FR-015**: System MUST NOT allow deletion of the currently selected contract.
- **FR-016**: System MUST remove deleted contracts from persistent storage immediately (within 100ms of user action).
- **FR-017**: Address field MUST display a dynamic placeholder reflecting the selected network's address format (e.g., "eth: 0xA1B2..."). Implementation MAY derive this from the adapter, network config, or ecosystem registry - whichever provides the most accurate example for the selected network.

### UI/UX Requirements

- **UX-001**: The "Add Contract" button in the dropdown MUST be positioned at the bottom, separated by a divider, with a Plus icon and label "Add new contract".
- **UX-002**: Delete icon MUST be a Trash icon (from lucide-react), positioned on the right side of each contract item, visible only on hover for non-selected contracts.
- **UX-003**: Dialog MUST be centered, have a width of `max-w-md` (28rem), and use standard Dialog component styling from ui-builder-ui.
- **UX-004**: Initial dialog focus MUST be on the Contract Name field.
- **UX-005**: Dialog buttons MUST be in footer: "Cancel" (secondary/ghost) on left, "Add" (primary) on right.
- **UX-006**: Delete does NOT require confirmation dialog - deletion is immediate (consistent with existing AccountSelector pattern).
- **UX-007**: The "Add" button MUST show "Add" text (not "Adding...") in disabled state during submission; submission is fast enough (<500ms) that loading state is not needed.
- **UX-008**: Form field order MUST be: Network (first, required to enable address validation), Contract Name, Contract Address.
- **UX-009**: When no network is selected, address field MUST be disabled with placeholder "Select a network first".
- **UX-010**: When adapter is loading after network selection, address field MUST show a brief loading indicator (spinner) for up to 500ms, then enable.
- **UX-011**: When adapter fails to load (per ERR-002), a "Retry" text button MUST appear inline with the error message, styled as a link (`text-primary underline`), which re-triggers adapter loading when clicked.

### Error Handling Requirements

- **ERR-001**: Validation error messages MUST use the following formats:
  - Empty name: "Contract name is required"
  - Name too long: "Contract name must be 64 characters or less"
  - Empty address: "Contract address is required"
  - Invalid address: "Invalid address format for {ecosystemName}"
  - No network: "Please select a network"
- **ERR-002**: If adapter fails to load, address field MUST display error state with message "Failed to load network adapter. Please try again." and a retry option.
- **ERR-003**: If storage save fails, form MUST remain open with error toast: "Failed to save contract. Please try again."
- **ERR-004**: If storage delete fails, display error toast: "Failed to delete contract. Please try again." Contract remains in list.
- **ERR-005**: If no networks are available (all ecosystems disabled), dialog MUST show empty state: "No networks available. Please enable at least one ecosystem."
- **ERR-006**: Error messages MUST appear below the respective field, in red text (text-destructive), and persist until the error condition is resolved.

### Non-Functional Requirements

#### Performance

- **NFR-P001**: Adapter loading MUST complete within 2 seconds on average network conditions. If loading exceeds 2 seconds, show a loading indicator.
- **NFR-P002**: Network list rendering for 50+ networks MUST complete within 100ms (delegated to NetworkSelector component's virtualization).
- **NFR-P003**: Address validation MUST NOT be debounced (synchronous validation per ASSUMP-004). Validation runs on every input change.
- **NFR-P004**: Dialog open/close animations MUST complete within 200ms (default Dialog component behavior).

#### Accessibility

- **NFR-A001**: Dialog MUST trap focus when open (handled by Dialog component).
- **NFR-A002**: Dialog MUST be closable via Escape key (handled by Dialog component).
- **NFR-A003**: Form fields MUST have associated labels using `htmlFor` attribute.
- **NFR-A004**: Error messages MUST be associated with fields using `aria-describedby` and announced via `aria-live="polite"`.
- **NFR-A005**: Delete button MUST have `aria-label="Delete {contractName}"` for screen readers.
- **NFR-A006**: Keyboard navigation: Tab moves between fields, Enter on form submits (if valid), Escape closes dialog.
- **NFR-A007**: Network selector MUST be keyboard navigable: Arrow keys for selection, Enter to confirm, Escape to close dropdown.

### Integration Requirements

- **INT-001**: NetworkSelector props MUST match `NetworkSelectorProps<NetworkConfig>` interface from ui-builder-ui:
  - `networks: NetworkConfig[]`
  - `selectedNetwork: NetworkConfig | null`
  - `onSelectNetwork: (network: NetworkConfig) => void`
  - `getNetworkLabel: (n) => n.name`
  - `getNetworkIcon: (n) => n.iconComponent`
  - `getNetworkType: (n) => n.type`
  - `getNetworkId: (n) => n.id`
  - `getEcosystem: (n) => n.ecosystem`
  - `groupByEcosystem: true`
- **INT-002**: Dialog MUST use `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogFooter` from ui-builder-ui.
- **INT-003**: Storage method signatures:
  - `addOrUpdate(input: { networkId: string; address: string; label?: string }): Promise<string>` - returns record ID
  - `deleteContract(id: string): Promise<void>`
- **INT-004**: Adapter interface: `isValidAddress(address: string, addressType?: string): boolean` - synchronous return.

### Key Entities

- **Contract Record**: Represents a tracked contract with properties: id (auto-generated), networkId (string), address (string), label (optional string, max 64 chars), lastAccessed (timestamp), createdAt (timestamp). Note: The UI shows "Contract Name" but storage uses "label" field.
- **Network Configuration**: Pre-defined network definitions with id, name, ecosystem, type, icon component. Loaded from adapter packages via local ecosystemManager.
- **Contract Adapter**: Chain-specific adapter providing address validation via `isValidAddress(address)` method. Loaded lazily per ecosystem.

### Terminology Mapping

| UI Term          | Storage Field     | Notes                                                 |
| ---------------- | ----------------- | ----------------------------------------------------- |
| Contract Name    | `label`           | User-facing "name" maps to storage "label"            |
| Contract Address | `address`         | Direct mapping                                        |
| Network          | `networkId`       | Stores network ID string, not full config             |
| Recently Added   | `recentContracts` | Table stores both "recently accessed" and newly added |

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Users can add a new contract record within 30 seconds of opening the dialog. Measurement: Time from dialog open to successful save (automated test with simulated user input).
- **SC-002**: 100% of invalid address formats are caught and display user-friendly error messages before submission. Verification: Unit tests for each adapter's `isValidAddress()` covering known invalid patterns.
- **SC-003**: Contract records persist across browser sessions and appear in the contract selector immediately after adding. Verification: Integration test saving record, refreshing page, confirming record present.
- **SC-004**: Users can find their desired network from 50+ supported networks within 10 seconds using search. Measurement: Search operation filters list within 100ms; user location time is UX heuristic.
- **SC-005**: All form interactions (validation, error display, button state) respond within 100ms of user input. Measurement: React profiler showing no blocking renders >100ms during form interaction.

## Clarifications

### Session 2025-12-02

- Q: After the user successfully adds a contract and the dialog closes, what should happen next? → A: Auto-select the newly added contract in the sidebar selector.
- Q: Is the ability to edit or delete existing contract records in scope for this feature? → A: Creation + Delete in scope; edit deferred to separate feature.
- Q: Should the address field placeholder dynamically reflect the selected network's format? → A: Yes, dynamic placeholder with network prefix (e.g., "eth: 0x..."), dictated by adapter.

### Checklist Resolution Session 2025-12-02

- Q: Should name field prevent input beyond 64 chars or show error? → A: Show error (allow input, validate on blur/submit).
- Q: Is delete confirmation required? → A: No - immediate delete matches existing AccountSelector pattern.
- Q: What is the default network selection? → A: No default (null); user must select explicitly.
- Q: What happens to form state on dialog close? → A: Form state is NOT persisted; each open starts fresh.
- Q: How are disabled ecosystems (Solana) handled? → A: Filtered out of network list entirely (not shown).
- Q: What is "immediately" for delete (FR-016)? → A: Within 100ms of user action.
- Q: Is success feedback needed beyond auto-select? → A: No toast/feedback; auto-selection is sufficient confirmation.

### Implementation Session 2025-12-03 (Scope Changes)

**Two-Step Ecosystem Selection Flow**:

- Q: Should all adapters load when dialog opens? → A: No - lazy loading. Dialog shows ecosystem selector first, then loads adapter/networks only when ecosystem is selected.
- Q: What ecosystems are enabled? → A: Only Stellar is enabled. EVM shows as "Coming Soon". Midnight and Solana are hidden entirely.
- Q: Should first enabled ecosystem be auto-selected? → A: Yes - the first enabled ecosystem in ECOSYSTEM_ORDER is auto-selected when dialog opens.

**New UI Flow**:

1. Dialog opens → First enabled ecosystem (Stellar) is auto-selected
2. Networks load only for the selected ecosystem (lazy)
3. User selects network → Name and Address fields appear
4. User fills form and submits

**New Components Created**:

- `CompactEcosystemSelector.tsx` - Compact 2-column grid ecosystem picker
- `useNetworksByEcosystem.ts` - Hook for lazy-loading networks per ecosystem

## Address Format Examples

| Ecosystem | Valid Example                                              | Invalid Example           | Placeholder            |
| --------- | ---------------------------------------------------------- | ------------------------- | ---------------------- |
| EVM       | `0xA1B2C3D4E5F67890ABCD1234E56789ABCDEF1234`               | `not-an-address`, `0x123` | `eth: 0xA1B2...EF12`   |
| Stellar   | `GCKFBEIYV2U22IO2BJ4KVJOIP7XPWQGQFKKWXR6DOSJBV7STMAQSMTGG` | `invalid-stellar`, `G123` | `stellar: GCKF...MTGG` |
| Midnight  | `0x01020304...` (TBD)                                      | (TBD)                     | `midnight: 0x0102...`  |
| Solana    | (Currently disabled)                                       | -                         | -                      |

Note: Exact validation rules are delegated to each adapter's `isValidAddress()` implementation.

## Assumptions

- **ASSUMP-001**: Network configurations are pre-loaded and available from the `@openzeppelin/ui-builder-adapter-*` packages via the ecosystemManager pattern. **Status**: ✅ Verified - Each adapter package exports `{ecosystem}Networks` array.
- **ASSUMP-002**: The `RecentContractsStorage` service is already functional and handles persistence, including upsert behavior for existing records. **Status**: ✅ Verified - `addOrUpdate()` implemented in storage class.
- **ASSUMP-003**: UI components (Dialog, Button, form fields) are available from `@openzeppelin/ui-builder-ui` package. **Status**: ✅ Verified - Dialog, Button, Input, Label, NetworkSelector all exported.
- **ASSUMP-004**: Address validation is synchronous and available via `ContractAdapter.isValidAddress()` method. **Status**: ✅ Verified - Interface shows `isValidAddress(address: string, addressType?: string): boolean`.
- **ASSUMP-005**: Contract name field uses same validation rules as existing storage (max 64 characters). **Status**: ✅ Verified - Storage validates `label.trim().length > 64`. Note: Control character validation was removed per git diff.
- **ASSUMP-006**: Default network selection will be null (no pre-selection). User must explicitly select a network before entering an address. **Status**: Updated - Changed from "first available" to "no default" for explicit user action.

## Dependencies

- **DEP-001**: Local `ecosystemManager.ts` MUST be created before implementing the dialog. This is a prerequisite that adapts the UI Builder's private ecosystem management pattern.
- **DEP-002**: `react-hook-form` is available via UI Builder dependencies.
- **DEP-003**: `lucide-react` icons (Plus, Trash, Check) are available.
