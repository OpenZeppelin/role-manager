# Feature Specification: Two-Step Admin Role Assignment

**Feature Branch**: `016-two-step-admin-assignment`  
**Created**: 2024-12-15  
**Status**: Draft  
**Scope**: Admin role transfer for AccessControl contracts with two-step process support  
**Input**: User description: "Two-step Admin role assignment feature. Look at the previously implemented spec 015. We have just implemented a Admin role assignment feature in the UI Builder Stellar adapter. It works exactly the same way the Ownership transfer works. It's a two-step process. The API and the methods are already available in the adapter. Implement this feature in the Role Manager exactly in the same way as the Ownership transfer is implemented from the UX perspective. If necessary please re-use or refactor components, utils, hooks to be re-usable."

## Clarifications

### Session 2024-12-15

- Q: What is the canonical display name for the Admin role? → A: "Admin" (simple, consistent with "Owner" pattern)
- Q: Should admin state auto-refresh? → A: Refresh on window focus + after any transaction (standard blockchain UI pattern)

## Scope Boundaries

**In Scope**:

- Two-step admin transfer (Stellar pattern with expiration)
- Admin role synthesis and display
- Pending transfer management

**Out of Scope**:

- Single-step admin transfer (not supported by current adapter)
- Internationalization/localization of error messages (inherits existing patterns)
- Mobile-specific layouts (inherits existing responsive patterns from dialogs)

## Context & Background

### Two-Step Admin Transfer Mechanism

AccessControl contracts on certain blockchain ecosystems (e.g., Stellar) implement a two-step admin transfer process for enhanced security:

- **Two-Step (e.g., Stellar)**:
  1. Current admin calls `transferAdminRole(newAdmin, expirationLedger)` - creates a pending transfer
  2. Pending admin calls `acceptAdminTransfer()` before expiration - completes the transfer

This mirrors the two-step Ownership transfer pattern already implemented in spec 015.

### UI Builder Adapter API

The UI Builder Stellar adapter already provides:

- `AccessControlCapabilities.hasTwoStepAdmin` - Feature detection flag
- `AdminInfo` with `state`, `admin`, and `pendingTransfer` details
- `AdminState`: 'active' | 'pending' | 'expired' | 'renounced'
- `PendingAdminTransfer`: pendingAdmin, expirationBlock, initiatedAt, etc.
- `getAdminInfo()` - Fetch current admin and pending transfer state
- `transferAdminRole()` - Initiate admin transfer
- `acceptAdminTransfer()` - Accept pending admin transfer

### Existing Infrastructure (Role Manager)

The Role Manager has:

- Ownership transfer implementation (015) with dialog, hooks, and patterns to reuse/refactor
- `TransferOwnershipDialog` component with form states, transaction handling, and accessibility
- `useOwnershipTransferDialog` hook with validation, step management, and retry logic
- `useCurrentBlock` hook for block polling
- Pending changes display on Dashboard AND Roles page (via `PendingTransferInfo` component)
- Established dialog patterns from 014-role-grant-revoke and 015-ownership-transfer

### Owner Role Pattern (for Admin Role Consistency)

The Owner role is currently **synthesized** (not from enumeration):

- Created in `useRolesPageData.ts` when `capabilities.hasOwnable` is true
- Marked with `isOwnerRole: true` flag for special UI treatment (Crown icon, transfer actions)
- Appears at the top of the roles list
- Shows pending transfer info via `PendingTransferInfo` component when ownership state is 'pending' or 'expired'

**The Admin role should follow the same pattern**:

- Synthesized in `useRolesPageData.ts` when `capabilities.hasTwoStepAdmin` is true
- Display name: **"Admin"** (consistent with "Owner" pattern)
- Marked with `isAdminRole: true` flag for special UI treatment
- Appears near the top of roles list (after Owner if present)
- Shows pending transfer info via reusable `PendingTransferInfo` component

### Reusability Approach

To maximize code reuse and maintainability:

1. **Refactor existing components/hooks** to be parameterized for both Ownership and Admin transfers
2. **Create shared abstractions** for common two-step transfer patterns (form validation, transaction execution, dialog states)
3. **Admin-specific components** only where behavior differs significantly

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Initiate Admin Transfer (Two-Step) (Priority: P1)

As the Current Admin on a two-step AccessControl contract, I want to initiate an admin role transfer by specifying the new admin address and an expiration deadline, so that the pending admin has a time-limited window to accept the transfer.

**Why this priority**: This is the primary action for initiating admin role changes. Without this, no admin transfers can begin.

**Independent Test**: Can be fully tested by opening the Transfer Admin dialog, entering a valid address and expiration, submitting the transaction, and verifying a pending transfer is created on-chain.

**Acceptance Scenarios**:

1. **Given** I am the current admin viewing the Admin role on the Roles page, **When** I click "Transfer Admin" on my account row, **Then** a dialog opens with an address input and expiration input.
2. **Given** the Transfer Admin dialog is open, **When** I enter a valid address and expiration ledger, **Then** the "Initiate Transfer" button becomes enabled.
3. **Given** valid inputs are entered, **When** I click "Initiate Transfer", **Then** the system triggers a wallet signature request.
4. **Given** the transaction is confirmed, **When** the dialog updates, **Then** I see a success message indicating the pending transfer was created, and the admin status updates to "Pending Transfer".

---

### User Story 2 - Accept Pending Admin Transfer (Priority: P1)

As the Pending Admin designated in a two-step transfer, I want to accept the admin transfer before it expires, so that I become the new admin of the contract.

**Why this priority**: Without acceptance capability, two-step transfers cannot be completed. This completes the admin transfer flow.

**Independent Test**: Can be fully tested by viewing a contract with a pending admin transfer where the connected wallet is the pending admin, clicking "Accept Admin Role", and verifying admin role transfers to the connected wallet.

**Acceptance Scenarios**:

1. **Given** I am the pending admin (my wallet matches the pending admin address), **When** I view the Admin role section, **Then** I see an "Accept Admin Role" button.
2. **Given** I see the Accept Admin Role button, **When** I click it, **Then** a confirmation dialog opens showing the contract I'm about to become admin of.
3. **Given** the confirmation dialog is open, **When** I click "Accept", **Then** the system triggers a wallet signature request.
4. **Given** the transaction is confirmed, **When** the dialog updates, **Then** I see a success message and the admin status updates to show me as the new admin.

---

### User Story 3 - View Admin Status (Priority: P1)

As a User viewing a contract, I want to see the current admin status including any pending transfers, so that I understand who administers the contract and any upcoming changes.

**Why this priority**: Understanding admin status is fundamental context for all users before taking any action.

**Independent Test**: Can be tested by viewing different contracts with various admin states (active, pending, expired, renounced) and verifying correct display.

**Acceptance Scenarios**:

1. **Given** I am viewing a contract with an active admin and no pending transfer, **When** I view the Admin role section, **Then** I see the admin address and status "Active Admin".
2. **Given** I am viewing a contract with a pending admin transfer, **When** I view the Admin role section, **Then** I see the current admin, pending admin address, and expiration information.
3. **Given** I am viewing a contract where the pending transfer has expired, **When** I view the Admin role section, **Then** I see status "Transfer Expired" with appropriate messaging.
4. **Given** I am viewing a contract with renounced admin, **When** I view the Admin role section, **Then** I see "No Admin (Renounced)" status.

---

### User Story 4 - View Pending Admin Transfer in Dashboard (Priority: P2)

As a User viewing the Dashboard, I want to see pending admin transfers in the "Pending Role Changes" section, so that I can track all pending access control changes in one place.

**Why this priority**: Provides visibility into pending transfers from the Dashboard but is secondary to the core transfer functionality.

**Independent Test**: Can be tested by creating a pending admin transfer and verifying it appears in the Dashboard's pending changes table.

**Acceptance Scenarios**:

1. **Given** a contract has a pending admin transfer, **When** I view the Dashboard, **Then** I see the pending transfer in the "Pending Role Changes" table.
2. **Given** I see a pending admin transfer in the Dashboard, **When** I view the entry details, **Then** I see "Transfer Admin Role" label, pending admin address, and expiration.

---

### User Story 5 - Handle Network Errors (Priority: P2)

As a User initiating or accepting an admin transfer, if a network error occurs, I want to see a clear error message and be able to retry, so that temporary issues don't prevent me from completing the action.

**Why this priority**: Error handling is critical but secondary to the happy path flows.

**Independent Test**: Can be tested by simulating network disconnection during transaction submission and verifying error handling and retry.

**Acceptance Scenarios**:

1. **Given** a network error occurs during transaction submission, **When** the error is detected, **Then** I see a "Network error" message with a retry option.
2. **Given** I am viewing a network error state, **When** I click "Retry", **Then** the system attempts to resubmit the transaction.

---

### Edge Cases

#### Transfer Initiation

- **Self-Transfer**: User cannot initiate transfer to their own address (show validation error).
- **Invalid Address**: Validate address format before enabling submit; show inline validation error.
- **Expiration in Past**: Validate expiration ledger is greater than current ledger; show inline validation error.
- **Current Ledger Polling**: Display updates periodically; if user's input becomes invalid due to ledger progression, show updated validation error.
- **Not the Admin**: Transfer button only visible to current admin; others see view-only status.

#### Transfer Acceptance

- **Expired Transfer**: If pending transfer has expired, show "Transfer Expired" status with no Accept button.
- **Wrong Wallet Connected**: If connected wallet is not the pending admin, show info message "Connect the pending admin wallet to accept".
- **Transfer Already Accepted**: If transfer was already accepted, admin section shows new admin.

#### Pending Transfer Management

- **No Explicit Cancel**: The Stellar AccessControl contract does not have a dedicated "cancel admin transfer" function.
- **Replace Pending Transfer**: Current admin can initiate a new transfer while one is pending; the new transfer automatically replaces the existing pending transfer. Dialog MUST show warning: "This will replace the existing pending transfer."
- **Let Transfer Expire**: Alternatively, the admin can simply let the pending transfer expire at its expiration ledger.

#### General

- **Contract Without AccessControl**: If contract doesn't implement AccessControl with admin, hide admin section entirely.
- **Two-Step Not Supported**: UI only shows admin transfer actions for contracts with `hasTwoStepAdmin` capability.
- **Wallet Disconnected**: All actions require connected wallet; show "Connect Wallet" prompt.
- **Concurrent Operations**: If admin state changes while dialog is open, post-transaction refresh shows current state.
- **Dual Pending Transfers**: Contracts can have BOTH pending ownership AND pending admin transfers simultaneously. Each is tracked and displayed independently in their respective role sections and in the Dashboard's pending transfers table.
- **Admin Info Unavailable**: If `getAdminInfo()` method is not available or throws an error, Admin role is not displayed (no error shown - graceful degradation).
- **No Admin (Renounced State)**: If `getAdminInfo()` returns an `AdminInfo` object where `admin` is null and `state === 'renounced'`, show Admin role with "No Admin (Renounced)" status and no transfer actions. This is distinct from the API being unavailable.

## Requirements _(mandatory)_

### Functional Requirements

#### Admin Role Synthesis & Display (Roles Page)

- **FR-001**: Admin role MUST be **synthesized** in `useRolesPageData` (similar to Owner role) - NOT from role enumeration.
- **FR-001a**: System MUST fetch admin info via `service.getAdminInfo()` when `capabilities.hasTwoStepAdmin` is true.
- **FR-001b**: If `service.getAdminInfo` method is not available on adapter, Admin role MUST NOT be displayed.
- **FR-001c**: If `getAdminInfo()` throws an error, Admin role MUST NOT be displayed (graceful degradation).
- **FR-001d**: If `getAdminInfo()` returns `AdminInfo` with `admin: null` and `state: 'renounced'`, Admin role MUST be displayed with "No Admin (Renounced)" status and no transfer actions.
- **FR-002**: Admin role MUST appear on the Roles page when contract has `hasTwoStepAdmin` capability AND admin info is available.
- **FR-002a**: Admin role MUST appear at position 2 in the roles list (after Owner if present, otherwise first).
- **FR-002b**: Admin role MUST be marked with `isAdminRole: true` flag for special UI treatment.
- **FR-002c**: Admin role MUST display with **Shield icon** (`lucide-react` Shield) in purple-600 color.
- **FR-002d**: Shield icon MUST have `aria-label="Admin role"` for screen reader accessibility.
- **FR-002e**: All enumerated roles MUST have `isAdminRole: false` as default value.
- **FR-003**: When Admin role is selected, the details panel MUST show current admin address in the assigned accounts section.
- **FR-003a**: Contracts with BOTH Owner AND Admin roles MUST display both independently with their respective pending transfers.
- **FR-004**: System MUST only show Admin role transfer actions for contracts with `hasTwoStepAdmin` capability.
- **FR-005**: System MUST format addresses consistently using existing address display patterns.
- **FR-006**: System MUST display loading/skeleton state while admin data is being fetched (consistent with ownership loading pattern).

#### Pending Admin Transfer Display (Roles Page)

- **FR-006a**: For contracts with pending admin transfer, the Admin role details MUST show `PendingTransferInfo` component.
- **FR-006b**: `PendingTransferInfo` MUST display with `transferLabel="Admin Role"` and `recipientLabel="Admin"`.
- **FR-006c**: Pending admin transfer info MUST be visible when admin state is 'pending' or 'expired'.
- **FR-006d**: The "Accept Admin Role" button MUST appear in `PendingTransferInfo` when connected wallet is the pending admin.
- **FR-006e**: If connected wallet is NOT the pending admin, MUST show message: "Connect the pending admin wallet to accept this transfer."

#### Pending Transfers (Dashboard Page)

- **FR-007**: Pending admin transfers MUST appear in the "Pending Role Changes" table on Dashboard.
- **FR-008**: Pending admin transfer entries MUST show "Transfer Admin Role" label, pending admin address, and expiration information.
- **FR-008a**: Dashboard entries MUST be consistent in format with pending ownership transfers.

#### Initiate Transfer (Two-Step)

- **FR-009**: System MUST display **"Transfer Admin"** button (exact label) on the admin's account row in the Admin role details panel, visible only when connected wallet is the current admin.
- **FR-010**: The Transfer Admin dialog MUST display an address input for the new admin.
- **FR-011**: For two-step admin (`hasTwoStepAdmin`), the dialog MUST display an expiration input as a raw ledger number field.
- **FR-012**: Dialog MUST display the current ledger number, updated via polling every 5 seconds.
- **FR-013**: System MUST validate the expiration ledger is strictly greater than the current ledger.
- **FR-014**: System MUST validate the new admin address format using `adapter.isValidAddress()`.
- **FR-015**: System MUST prevent self-transfer (new admin cannot equal current admin).
- **FR-016**: Validation error messages MUST be specific: "Invalid address format", "Cannot transfer to yourself", "Expiration must be greater than current block".
- **FR-017**: The submit button MUST be disabled until valid inputs are provided.
- **FR-018**: System MUST create `useTransferAdminRole` hook for transaction execution.

#### Accept Transfer (Two-Step)

- **FR-019**: System MUST provide "Accept Admin Role" action visible only when connected wallet is the pending admin.
- **FR-020**: Accept Admin dialog MUST display confirmation with contract address being accepted.
- **FR-021**: System MUST create `useAcceptAdminTransfer` hook following existing mutation patterns.
- **FR-022**: System MUST call `service.acceptAdminTransfer()` method from UI Builder adapter.
- **FR-023**: On-chain contract validates caller is pending admin and transfer is not expired.

#### Transaction Execution (All Actions)

- **FR-024**: All admin transfer actions MUST display transaction status updates (idle, pending, confirming, success, error).
- **FR-025**: After successful transaction, dialogs MUST show success state for 1-2 seconds, then auto-close.
- **FR-026**: System MUST invalidate and refetch admin data after successful operations.
- **FR-026a**: System MUST refresh admin state when browser window regains focus.
- **FR-026b**: Admin state refresh uses same React Query patterns as existing ownership/roles data.
- **FR-027**: System MUST handle user rejection gracefully, returning to form state with inputs preserved.
- **FR-028**: System MUST handle network errors with clear messages and retry options.
- **FR-028a**: Retry MUST use the same form parameters (stored in hook state) without requiring re-entry.
- **FR-028b**: After retry, re-validate expiration against current block before submission.

#### Wallet & Authentication

- **FR-029**: All admin transfer actions MUST require a connected wallet.
- **FR-030**: If wallet disconnects while dialog is open, MUST show "Wallet disconnected" error.
- **FR-031**: System MUST use `ExecutionConfig` with `method: 'eoa'` for direct wallet transactions.

#### Accessibility

- **FR-032**: When dialog opens, focus MUST move to the first interactive element.
- **FR-033**: When dialog closes, focus MUST return to the trigger element.
- **FR-034**: Escape key MUST close the dialog (unless transaction is pending/confirming).
- **FR-035**: All interactive elements MUST be keyboard accessible via Tab navigation.
- **FR-035a**: Dialog MUST implement focus trap (inherited from `@openzeppelin/ui-builder-ui` Dialog component).
- **FR-035b**: Transaction status changes MUST be announced to screen readers via aria-live regions (inherited from existing dialog patterns).
- **FR-035c**: Admin role icon MUST have appropriate ARIA label for screen reader identification.

#### Code Reuse & Refactoring

- **FR-036**: System SHOULD refactor existing ownership transfer components/hooks to support both ownership and admin transfers where patterns are identical.
- **FR-037**: Shared two-step transfer logic (form validation, block polling, transaction states) SHOULD be extracted into reusable utilities or base components.

### Key Entities

- **AdminInfo**: Display model from adapter containing admin, state, and pendingTransfer details.
- **RoleWithDescription (updated)**: Add `isAdminRole: boolean` flag (similar to existing `isOwnerRole`). Default value: `false` for all enumerated roles.
- **TransferAdminDialogState**: Dialog state for initiating transfer (newAdmin, expirationBlock, validation).
- **AcceptAdminDialogState**: Dialog state for accepting transfer (confirmation state, transaction status).
- **PendingAdminTransferInfo**: Derived display model for pending transfer (pendingAdmin, expirationBlock).
- **DialogTransactionStep**: Existing enum for dialog states: 'form', 'pending', 'confirming', 'success', 'error', 'cancelled'.

### Type Default Values

When adding `isAdminRole` to `RoleWithDescription`:

- Synthesized Admin role: `isAdminRole: true`, `isOwnerRole: false`
- Synthesized Owner role: `isAdminRole: false`, `isOwnerRole: true`
- Enumerated roles: `isAdminRole: false`, `isOwnerRole: false`

## Success Criteria _(mandatory)_

### Measurable Outcomes

#### Admin Role Display (Roles Page)

- **SC-001**: Admin role appears in the roles list for contracts with `hasTwoStepAdmin` capability.
- **SC-001a**: Admin role is synthesized from `getAdminInfo()`, not role enumeration.
- **SC-001b**: Admin role displays with `isAdminRole: true` flag and distinct icon.
- **SC-002**: Pending admin transfer details are visible on the Roles page when admin state is 'pending' or 'expired'.
- **SC-002a**: `PendingTransferInfo` component displays pending admin, expiration, and accept button.
- **SC-003**: Admin state correctly reflects on-chain data (active/pending/expired/renounced).

#### Transfer Initiation

- **SC-004**: Current admins can successfully initiate admin transfers.
- **SC-005**: For two-step contracts, expiration ledger is correctly passed to the service.
- **SC-006**: Invalid inputs (bad address, past expiration) are caught with clear validation messages.

#### Transfer Acceptance

- **SC-007**: Pending admins can successfully accept pending transfers.
- **SC-008**: Accept button only appears when connected wallet matches pending admin.
- **SC-009**: Post-acceptance, admin role reflects the new admin.

#### Dashboard Integration

- **SC-010**: Pending admin transfers appear in Dashboard's "Pending Role Changes" section.
- **SC-011**: Dashboard entries show correct transfer type label and metadata.

#### Cross-Cutting

- **SC-012**: All admin transfer operations use new hooks following established patterns.
- **SC-013**: Transaction cancellation returns user to usable form state.
- **SC-014**: All dialogs auto-close within 2 seconds after showing success state.
- **SC-015**: UI updates within 5 seconds of transaction confirmation to reflect new admin state.
- **SC-016**: All dialogs pass accessibility requirements (keyboard navigation, focus management).
- **SC-017**: Code reuse achieved: (a) `PendingTransferInfo` reused without duplication, (b) mutation hooks follow existing patterns, (c) dialog state machine mirrors ownership dialog.

## Assumptions

- The UI Builder adapter's `accessControlService.getAdminInfo()`, `transferAdminRole()`, and `acceptAdminTransfer()` methods are available and function as documented.
- The `AdminInfo` type from UI Builder includes all necessary fields for displaying pending transfer state.
- The `hasTwoStepAdmin` capability flag reliably indicates which contracts support admin transfer.
- **The Admin role is NOT returned by `getCurrentRoles()` enumeration** - it must be fetched separately via `getAdminInfo()` and synthesized into the roles list (similar to how Owner role is synthesized from `getOwnership()`).
- Network-specific expiration values (ledger numbers vs block numbers) are handled by the adapter layer.
- The existing ownership transfer implementation (015) provides a solid pattern to follow and potentially refactor.
- The existing `PendingTransferInfo` component is generic and can be reused for Admin transfers by passing appropriate `transferLabel` and `recipientLabel` props.
