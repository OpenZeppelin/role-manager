# Feature Specification: Contract Ownership Transfer

**Feature Branch**: `015-ownership-transfer`  
**Created**: 2024-12-14  
**Status**: Draft  
**Scope**: Ownership management for Ownable contracts (single-step and two-step transfers)  
**Input**: User description: "Contract ownership transfer feature. Ownership transfer in OpenZeppelin's Ownable contracts for Stellar is a two-step process. To be clear each ecosystem can have single step or a multistep process for this. Look at the UI Builder Stellar Adapter and specifically the Access Control Module. It already has everything you need, from feature detection for this specific case to the ownership transfer function. As it is a two step process, we need to think about the UI/UX for this."

## Clarifications

### Session 2024-12-14

- Q: Where should the ownership transfer actions (Transfer/Accept buttons) be placed? → A: Roles page - Owner appears at top of role list; "Transfer Ownership" button on account row when connected as owner. Pending transfers shown in Dashboard's "Pending Role Changes" table.
- Q: How should users specify the expiration for two-step transfers? → A: Raw ledger number input with: (1) validation preventing too-small values, (2) current ledger display with polling updates.

## Context & Background

### Two-Step vs Single-Step Ownership Transfer

Different blockchain ecosystems have different ownership transfer mechanisms:

- **Single-Step (e.g., EVM/Ethereum)**: The current owner calls `transferOwnership(newOwner)` and ownership is immediately transferred.
- **Two-Step (e.g., Stellar)**:
  1. Current owner calls `transferOwnership(newOwner, expirationLedger)` - creates a pending transfer
  2. Pending owner calls `acceptOwnership()` before expiration - completes the transfer

The UI Builder already provides:

- `AccessControlCapabilities.hasTwoStepOwnable` - Feature detection
- `OwnershipInfo` with `state`, `owner`, and `pendingTransfer` details
- `transferOwnership()` and `acceptOwnership()` service methods
- `OwnershipState`: 'owned' | 'pending' | 'expired' | 'renounced'

### Existing Infrastructure (Role Manager)

The Role Manager already has:

- `useTransferOwnership` hook in `useAccessControlMutations.ts` (needs `useAcceptOwnership`)
- Owner role display on Roles page with transfer action
- Pending changes display on Dashboard
- Established dialog patterns from 014-role-grant-revoke
- Transaction execution patterns with status tracking

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Initiate Ownership Transfer (Two-Step) (Priority: P1)

As a Contract Owner on a two-step Ownable contract (e.g., Stellar), I want to initiate an ownership transfer by specifying the new owner address and an expiration deadline, so that the pending owner has a time-limited window to accept the transfer.

**Why this priority**: This is the primary action for initiating ownership changes on two-step systems. Without this, no ownership transfers can begin.

**Independent Test**: Can be fully tested by opening the Transfer Ownership dialog, entering a valid address and expiration, submitting the transaction, and verifying a pending transfer is created on-chain.

**Acceptance Scenarios**:

1. **Given** I am the current owner viewing the Owner role on the Roles page, **When** I click "Transfer Ownership" on my account row, **Then** a dialog opens with an address input and expiration input.
2. **Given** the Transfer Ownership dialog is open, **When** I enter a valid address and expiration ledger, **Then** the "Initiate Transfer" button becomes enabled.
3. **Given** valid inputs are entered, **When** I click "Initiate Transfer", **Then** the system triggers a wallet signature request.
4. **Given** the transaction is confirmed, **When** the dialog updates, **Then** I see a success message indicating the pending transfer was created, and the ownership status updates to "Pending Transfer".

---

### User Story 2 - Accept Pending Ownership Transfer (Priority: P1)

As the Pending Owner designated in a two-step transfer, I want to accept the ownership transfer before it expires, so that I become the new owner of the contract.

**Why this priority**: Without acceptance capability, two-step transfers cannot be completed. This completes the ownership transfer flow.

**Independent Test**: Can be fully tested by viewing a contract with a pending transfer where the connected wallet is the pending owner, clicking "Accept Ownership", and verifying ownership transfers to the connected wallet.

**Acceptance Scenarios**:

1. **Given** I am the pending owner (my wallet matches the pending owner address), **When** I view the ownership section, **Then** I see an "Accept Ownership" button.
2. **Given** I see the Accept Ownership button, **When** I click it, **Then** a confirmation dialog opens showing the contract I'm about to own.
3. **Given** the confirmation dialog is open, **When** I click "Accept", **Then** the system triggers a wallet signature request.
4. **Given** the transaction is confirmed, **When** the dialog updates, **Then** I see a success message and the ownership status updates to show me as the new owner.

---

### User Story 3 - View Ownership Status (Priority: P1)

As a User viewing a contract, I want to see the current ownership status including any pending transfers, so that I understand who controls the contract and any upcoming changes.

**Why this priority**: Understanding ownership status is fundamental context for all users before taking any action.

**Independent Test**: Can be tested by viewing different contracts with various ownership states (owned, pending, expired, renounced) and verifying correct display.

**Acceptance Scenarios**:

1. **Given** I am viewing a contract with an active owner and no pending transfer, **When** I view the ownership section, **Then** I see the owner address and status "Active Owner".
2. **Given** I am viewing a contract with a pending transfer, **When** I view the ownership section, **Then** I see the current owner, pending owner address, and expiration information.
3. **Given** I am viewing a contract where the pending transfer has expired, **When** I view the ownership section, **Then** I see status "Transfer Expired" with appropriate messaging.
4. **Given** I am viewing a contract with renounced ownership, **When** I view the ownership section, **Then** I see "No Owner (Renounced)" status.

---

### User Story 4 - View Pending Transfer Details (Priority: P2)

As a User viewing a contract with a pending ownership transfer, I want to see detailed information about the pending transfer including time remaining, so that I can track transfer progress.

**Why this priority**: Provides important context for pending transfers but is secondary to the ability to initiate/accept transfers.

**Independent Test**: Can be tested by viewing a contract with a pending transfer and verifying all metadata is displayed correctly.

**Acceptance Scenarios**:

1. **Given** a contract has a pending transfer, **When** I view the ownership section, **Then** I see the pending owner's address.
2. **Given** a contract has a pending transfer, **When** I view the ownership section, **Then** I see the expiration ledger/block number.

---

### User Story 5 - Handle Network Errors (Priority: P2)

As a User initiating or accepting an ownership transfer, if a network error occurs, I want to see a clear error message and be able to retry, so that temporary issues don't prevent me from completing the action.

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
- **Not the Owner**: Transfer button only visible to current owner; others see view-only status.

#### Transfer Acceptance

- **Expired Transfer**: If pending transfer has expired, show "Transfer Expired" status with no Accept button.
- **Wrong Wallet Connected**: If connected wallet is not the pending owner, show info message "Connect the pending owner wallet to accept".
- **Transfer Already Accepted**: If transfer was already accepted, ownership section shows new owner.

#### Pending Transfer Management

- **No Explicit Cancel**: The Stellar Ownable contract does not have a dedicated "cancel transfer" function.
- **Replace Pending Transfer**: Current owner can initiate a new transfer while one is pending; the new transfer automatically replaces the existing pending transfer. Dialog MUST show warning: "This will replace the existing pending transfer."
- **Let Transfer Expire**: Alternatively, the owner can simply let the pending transfer expire at its expiration ledger.

#### General

- **Contract Not Ownable**: If contract doesn't implement Ownable, hide ownership section entirely.
- **Single-Step vs Two-Step**: UI adapts based on `hasTwoStepOwnable` capability flag.
- **Wallet Disconnected**: All actions require connected wallet; show "Connect Wallet" prompt.
- **Concurrent Operations**: If ownership state changes while dialog is open, post-transaction refresh shows current state.

## Requirements _(mandatory)_

### Functional Requirements

#### Owner Display (Roles Page)

- **FR-001**: Owner MUST appear at the **top** of the role list on the Roles page (before other roles).
- **FR-002**: When Owner role is selected, the details panel MUST show current owner address in the assigned accounts section.
- **FR-003**: For contracts with `hasTwoStepOwnable` and pending transfer, the Owner details MUST show pending transfer info (pending owner, expiration).
- **FR-004**: System MUST only show Owner role for contracts with `hasOwnable` capability.
- **FR-005**: System MUST format addresses consistently using existing address display patterns.
- **FR-005c**: System MUST display loading/skeleton state while ownership data is being fetched.

#### Pending Transfers (Dashboard Page)

- **FR-005a**: Pending ownership transfers MUST appear in the "Pending Role Changes" table on Dashboard.
- **FR-005b**: Pending transfer entries MUST show "Transfer Ownership" label, timestamp, and step progress (e.g., "2/2" for two-step).

#### Initiate Transfer (Two-Step)

- **FR-006**: System MUST display "Transfer Ownership" button on the owner's account row in the Owner role details panel, visible only when connected wallet is the current owner.
- **FR-007**: The Transfer Ownership dialog MUST display an address input for the new owner.
- **FR-008**: For two-step Ownable (`hasTwoStepOwnable`), the dialog MUST display an expiration input as a raw ledger number field.
- **FR-009**: Dialog MUST display the current ledger number, updated via polling every 5 seconds (5000ms).
- **FR-010**: System MUST validate the expiration ledger is strictly greater than the current ledger.
- **FR-011**: System MUST validate the new owner address format using `adapter.isValidAddress()`.
- **FR-012**: System MUST prevent self-transfer (new owner cannot equal current owner).
- **FR-012a**: Validation error messages MUST be specific: "Invalid address format", "Cannot transfer to yourself", "Expiration must be greater than current block".
- **FR-013**: The submit button MUST be disabled until valid inputs are provided.
- **FR-014**: System MUST use the existing `useTransferOwnership` hook for transaction execution.

#### Accept Transfer (Two-Step)

- **FR-015**: System MUST provide "Accept Ownership" action visible only when connected wallet is the pending owner.
- **FR-016**: Accept Ownership dialog MUST display confirmation with contract address being accepted.
- **FR-017**: System MUST create a new `useAcceptOwnership` hook following existing mutation patterns.
- **FR-018**: System MUST call `service.acceptOwnership()` method from UI Builder adapter.
- **FR-019**: On-chain contract validates caller is pending owner and transfer is not expired.

#### Transaction Execution (All Actions)

- **FR-020**: All ownership actions MUST display transaction status updates (idle, pending, confirming, success, error).
- **FR-021**: After successful transaction, dialogs MUST show success state for 1-2 seconds, then auto-close.
- **FR-022**: System MUST invalidate and refetch ownership data after successful operations.
- **FR-023**: System MUST handle user rejection gracefully, returning to form state.
- **FR-024**: System MUST handle network errors with clear messages and retry options.

#### Wallet & Authentication

- **FR-025**: All ownership actions MUST require a connected wallet.
- **FR-026**: If wallet disconnects while dialog is open, MUST show "Wallet disconnected" error.
- **FR-027**: System MUST use `ExecutionConfig` with `method: 'eoa'` for direct wallet transactions (in `useTransferOwnership` and `useAcceptOwnership` hooks).

#### Accessibility

- **FR-028**: When dialog opens, focus MUST move to the first interactive element.
- **FR-029**: When dialog closes, focus MUST return to the trigger element.
- **FR-030**: Escape key MUST close the dialog (unless transaction is pending/confirming).
- **FR-031**: All interactive elements MUST be keyboard accessible via Tab navigation.

#### Single-Step Adaptation

- **FR-032**: For contracts without `hasTwoStepOwnable`, system MUST omit expiration input and current ledger display.
- **FR-033**: For single-step contracts, ownership transfers immediately (no Accept step needed).

### Key Entities

- **OwnershipStatus**: Display model containing owner, state, and pending transfer details.
- **TransferOwnershipDialogState**: Dialog state for initiating transfer (newOwner, expirationLedger, validation).
- **AcceptOwnershipDialogState**: Dialog state for accepting transfer (confirmation state, transaction status).
- **PendingTransferInfo**: Derived display model for pending transfer (pendingOwner, expirationBlock, timeRemaining).
- **DialogTransactionStep**: Enum for dialog states: 'form', 'pending', 'confirming', 'success', 'error', 'cancelled'.

## Success Criteria _(mandatory)_

### Measurable Outcomes

#### Ownership Status Display

- **SC-001**: Users can view current ownership status for any Ownable contract.
- **SC-002**: Pending transfer details are visible when ownership state is 'pending'.
- **SC-003**: Ownership state correctly reflects on-chain data (owned/pending/expired/renounced).

#### Transfer Initiation

- **SC-004**: Current owners can successfully initiate ownership transfers.
- **SC-005**: For two-step contracts, expiration ledger is correctly passed to the service.
- **SC-006**: Invalid inputs (bad address, past expiration) are caught with clear validation messages.

#### Transfer Acceptance

- **SC-007**: Pending owners can successfully accept pending transfers.
- **SC-008**: Accept button only appears when connected wallet matches pending owner.
- **SC-009**: Post-acceptance, ownership reflects the new owner.

#### Cross-Cutting

- **SC-010**: 100% of ownership operations use existing or new hooks following established patterns.
- **SC-011**: Transaction cancellation returns user to usable form state.
- **SC-012**: All dialogs auto-close within 2 seconds after showing success state.
- **SC-013**: UI updates within 5 seconds of transaction confirmation to reflect new ownership state.
- **SC-014**: All dialogs pass accessibility requirements (keyboard navigation, focus management).
- **SC-015**: Single-step contracts work correctly without expiration input.
- **SC-016**: Two-step contracts show Accept button only to the designated pending owner.

## Assumptions

- The UI Builder adapter's `accessControlService.acceptOwnership()` method is available and functions as documented.
- The `OwnershipInfo` type from UI Builder includes all necessary fields for displaying pending transfer state.
- The `hasTwoStepOwnable` capability flag reliably indicates which transfer flow to use.
- Network-specific expiration values (ledger numbers vs block numbers) are handled by the adapter layer.
- The existing `useContractOwnership` hook properly fetches and caches ownership data.
