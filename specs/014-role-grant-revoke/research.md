# Research: Role Grant and Revoke Actions

**Feature**: 014-role-grant-revoke  
**Date**: 2024-12-11

## Research Questions Resolved

### 1. Address Validation Patterns

**Decision**: Use existing `AddressField` component from `@openzeppelin/ui-builder-ui`

**Rationale**:

- The application is chain-agnostic per Constitution Principle I
- `AddressField` already implements adapter-based validation via `adapter.isValidAddress()`
- Reusing existing component aligns with Constitution Principle II (Reuse-First)
- Component has full React Hook Form integration, accessibility support, and error handling

**Approach**:

- Use `AddressField` component in Assign Role dialog
- Pass the current adapter for chain-specific validation
- Component handles: required validation, format validation, error display

**Component Location**: `@openzeppelin/ui-builder-ui` (from `packages/ui/src/components/fields/AddressField.tsx`)

**Key Props**:

```typescript
<AddressField
  id="account-address"
  name="address"
  label="Account Address"
  placeholder="0x..."
  control={form.control}
  adapter={adapter}
  validation={{ required: true }}
/>
```

**Alternatives Considered**:

- Custom validation logic: Rejected (duplicates existing functionality, violates Constitution)
- Basic Input with manual validation: Rejected (reinventing the wheel)

### 2. Dialog State Management Pattern

**Decision**: Custom hook per dialog with internal state machine

**Rationale**:

- Existing patterns: `AddContractDialog` uses `DialogStep` enum with useState
- React Query handles async transaction state via existing mutation hooks
- Dialog-specific logic (checkbox state, single-change constraint) belongs in dedicated hook

**Approach**:

```typescript
// useManageRolesDialog hook manages:
// - Original assignments (snapshot at open)
// - Current checkbox states
// - Single pending change detection
// - Transaction execution via useGrantRole/useRevokeRole
```

**Alternatives Considered**:

- XState: Rejected (overkill for 4-state dialogs, no existing usage)
- Zustand: Rejected (dialog state is local, not global)

### 3. Single-Change Constraint Implementation

**Decision**: Auto-revert previous toggle when second toggle occurs

**Rationale**:

- Per spec clarification: "when user toggles a second checkbox, the first toggle reverts"
- This is the most intuitive UX - users can explore without getting stuck
- Only one `pendingChange` tracked at a time

**Approach**:

```typescript
interface PendingRoleChange {
  type: 'grant' | 'revoke';
  roleId: string;
  roleName: string;
}

// When checkbox toggled:
// 1. Compare to original state
// 2. If differs from original → this is the new pending change
// 3. Revert any other checkboxes to original state
```

**Alternatives Considered**:

- Disable other checkboxes: Rejected (confusing, feels broken)
- Show error message: Rejected (user has to manually undo first change)

### 4. Self-Revoke Detection

**Decision**: Compare connected wallet address to target account address

**Rationale**:

- Connected wallet address available from `useDerivedAccountStatus()` in `@openzeppelin/ui-builder-react-core`
- Simple lowercase string comparison
- Warning shown inline in dialog, not blocking submission

**Approach**:

```typescript
const isSelfRevoke =
  connectedAddress &&
  accountAddress.toLowerCase() === connectedAddress.toLowerCase() &&
  pendingChange?.type === 'revoke';
```

**Alternatives Considered**:

- Block self-revoke entirely: Rejected (user may legitimately want to)
- No warning: Rejected (accidental lockout is serious)

### 5. Success State Auto-Close

**Decision**: Show success state for 1.5 seconds, then auto-close

**Rationale**:

- Per spec clarification: "Show success message briefly (1-2 seconds)"
- 1.5s is standard for toast-like feedback
- Use `setTimeout` in success callback

**Approach**:

```typescript
onSuccess: (result) => {
  setStep('success');
  setTimeout(() => {
    onOpenChange(false);
  }, 1500);
};
```

### 6. Owner Role Exclusion

**Decision**: Filter by `role.isOwnerRole` property from `RoleWithDescription`

**Rationale**:

- `useRolesPageData` already provides `isOwnerRole` flag
- Owner role uses `OWNER_ROLE_ID` constant from `constants/roles.ts`
- Simple filter when rendering checkbox list or dropdown

**Approach**:

```typescript
const grantableRoles = roles.filter((role) => !role.isOwnerRole);
```

## Existing Code Integration Points

### Hooks to Reuse

- `useGrantRole(adapter, contractAddress, options)` - Execute grant transaction
- `useRevokeRole(adapter, contractAddress, options)` - Execute revoke transaction
- `useRolesPageData()` - Get roles list, connected address, role memberships
- `useAuthorizedAccountsPageData()` - Get account data for Authorized Accounts page
- `useSelectedContract()` - Get current contract and adapter

### Components to Reuse

- `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogFooter` - Dialog structure
- `Button` - Action buttons
- `Checkbox` - Role checkbox list
- `AddressDisplay` - Show formatted address (read-only display)
- `AddressField` - Address input with adapter validation (Assign Role dialog)
- `DialogLoadingState` - Transaction pending state (existing in Contracts/)
- `DialogErrorState` - Error display with retry (existing in Contracts/)

### Types to Reference

- `RoleWithDescription` - Role data with members
- `GrantRoleArgs`, `RevokeRoleArgs` - Mutation parameters
- `TxStatus`, `TransactionStatusUpdate` - Transaction state

## Dependencies Confirmed

| Package                               | Usage                                                     |
| ------------------------------------- | --------------------------------------------------------- |
| `@openzeppelin/ui-builder-ui`         | Dialog, Button, Checkbox, AddressField, AddressDisplay    |
| `@openzeppelin/ui-builder-utils`      | `cn` utility, `logger`                                    |
| `@openzeppelin/ui-builder-types`      | Type definitions, ContractAdapter                         |
| `@openzeppelin/ui-builder-react-core` | `useDerivedAccountStatus`                                 |
| `@tanstack/react-query`               | Already used by mutation hooks                            |
| `react-hook-form`                     | Form management in Assign Role dialog (with AddressField) |
