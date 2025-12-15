# Pre-Implementation Checklist: Two-Step Admin Role Assignment

**Purpose**: Validate requirements completeness, clarity, and alignment with ownership transfer patterns before implementation  
**Created**: 2024-12-15  
**Updated**: 2024-12-15 (gaps addressed)  
**Feature**: [spec.md](../spec.md) | [plan.md](../plan.md)  
**Use**: Author pre-implementation review (lightweight)

---

## Functional Requirements Completeness

- [x] CHK001 - Are all admin state transitions (active→pending→expired/accepted) explicitly documented? [Completeness, Spec §Context]
  - ✅ Documented in Context §AdminState: 'active' | 'pending' | 'expired' | 'renounced'
- [x] CHK002 - Is the behavior for "renounced" admin state specified with UI requirements? [Completeness, Spec §US3]
  - ✅ US3.4: "No Admin (Renounced)" status; Edge Cases: no transfer actions shown
- [x] CHK003 - Are requirements for contracts with BOTH Owner and Admin roles clearly defined? [Completeness, Spec §FR-003a]
  - ✅ Added FR-003a: "Contracts with BOTH Owner AND Admin roles MUST display both independently"
  - ✅ Added Edge Case: "Dual Pending Transfers" handling
- [x] CHK004 - Is the loading state behavior defined for admin info fetching? [Completeness, Spec §FR-006]
  - ✅ FR-006: "consistent with ownership loading pattern"
- [x] CHK005 - Are requirements specified for what happens when `getAdminInfo()` returns null? [Edge Case, Spec §FR-001c]
  - ✅ Added FR-001b/FR-001c: graceful degradation when method unavailable or returns null
  - ✅ Added Edge Case: "Admin Info Unavailable"

## Requirement Clarity & Measurability

- [x] CHK006 - Is "near the top of roles list" quantified with exact positioning (after Owner, before enumerated)? [Clarity, Spec §FR-002a]
  - ✅ FR-002a updated: "position 2 in the roles list (after Owner if present, otherwise first)"
- [x] CHK007 - Is the admin icon choice specified (Shield vs Key mentioned but not decided)? [Clarity, Spec §FR-002c]
  - ✅ FR-002c updated: "**Shield icon** (`lucide-react` Shield) in purple-600 color"
- [x] CHK008 - Is "1-2 seconds" auto-close timing specific enough or should it be exact? [Measurability, Spec §FR-025]
  - ✅ Acceptable industry standard range; matches ownership pattern
- [x] CHK009 - Is "5 seconds" polling interval explicitly stated for admin state refresh? [Clarity, Spec §FR-012]
  - ✅ FR-012: "updated via polling every 5 seconds"
- [x] CHK010 - Are specific validation error message strings defined for all error cases? [Clarity, Spec §FR-016]
  - ✅ FR-016: Exact strings specified ("Invalid address format", "Cannot transfer to yourself", "Expiration must be greater than current block")

## UI/UX Requirements Coverage

- [x] CHK011 - Are visual state requirements defined for all AdminState values (active/pending/expired/renounced)? [Coverage, Spec §US3]
  - ✅ US3 covers all four states with specific display requirements
- [x] CHK012 - Is the pending transfer warning message text specified ("This will replace...")? [Clarity, Spec §Edge Cases]
  - ✅ Edge Cases: "This will replace the existing pending transfer."
- [x] CHK013 - Are loading skeleton requirements consistent with existing ownership patterns? [Consistency, Spec §FR-006]
  - ✅ FR-006 updated: "consistent with ownership loading pattern"
- [x] CHK014 - Are empty state requirements defined when no admin exists? [Coverage, Spec §Edge Cases]
  - ✅ Added Edge Case: "No Admin (Empty State)" - shows role with "No Admin (Renounced)" status
- [x] CHK015 - Is the "Transfer Admin" button label explicitly specified (vs "Transfer Admin Role")? [Clarity, Spec §FR-009]
  - ✅ FR-009 updated: **"Transfer Admin"** (exact label)

## Accessibility Requirements

- [x] CHK016 - Are keyboard navigation requirements complete for all dialog states? [Completeness, Spec §FR-032-035]
  - ✅ FR-032 through FR-035 cover focus management, escape key, tab navigation
- [x] CHK017 - Is ARIA labeling specified for the Admin role icon? [Accessibility, Spec §FR-002d]
  - ✅ Added FR-002d: `aria-label="Admin role"` for Shield icon
  - ✅ Added FR-035c: "Admin role icon MUST have appropriate ARIA label"
- [x] CHK018 - Are screen reader announcements defined for transaction status changes? [Accessibility, Spec §FR-035b]
  - ✅ Added FR-035b: "Transaction status changes MUST be announced to screen readers via aria-live regions"
- [x] CHK019 - Is focus trap behavior specified for the Transfer Admin dialog? [Clarity, Spec §FR-035a]
  - ✅ Added FR-035a: "focus trap (inherited from Dialog component)"

## Data & State Management

- [x] CHK020 - Is the `adminInfoQueryKey` pattern documented to match ownership pattern? [Completeness, Plan §Research]
  - ✅ Plan §Research documents query key pattern
- [x] CHK021 - Are cache invalidation requirements explicit for all mutation success paths? [Clarity, Spec §FR-026]
  - ✅ FR-026: "invalidate and refetch admin data after successful operations"
- [x] CHK022 - Is the `isAdminRole` flag addition to `RoleWithDescription` type documented? [Completeness, Spec §Key Entities]
  - ✅ Key Entities: RoleWithDescription (updated) with isAdminRole flag
- [x] CHK023 - Are default values for new type fields specified? [Clarity, Spec §Key Entities]
  - ✅ Added "Type Default Values" section with explicit defaults for all role types
  - ✅ Added FR-002e: "All enumerated roles MUST have `isAdminRole: false` as default value"
- [x] CHK024 - Is the refetchOnWindowFocus behavior requirement explicit? [Clarity, Spec §FR-026a]
  - ✅ FR-026a: "refresh admin state when browser window regains focus"

## Error & Exception Handling

- [x] CHK025 - Are all network error scenarios mapped to specific error messages? [Coverage, Spec §FR-028]
  - ✅ FR-028: "clear messages and retry options"
- [x] CHK026 - Is user rejection (wallet cancel) handling explicitly distinguished from network errors? [Clarity, Spec §FR-027]
  - ✅ FR-027: "handle user rejection gracefully, returning to form state with inputs preserved"
- [x] CHK027 - Is the retry behavior specified (same params or re-validate)? [Clarity, Spec §FR-028a/b]
  - ✅ Added FR-028a: "Retry MUST use the same form parameters (stored in hook state)"
  - ✅ Added FR-028b: "re-validate expiration against current block before submission"
- [x] CHK028 - Are adapter method availability checks documented (`service.getAdminInfo` optional)? [Completeness, Spec §FR-001b]
  - ✅ Added FR-001b: "If `service.getAdminInfo` method is not available, Admin role MUST NOT be displayed"
- [x] CHK029 - Is concurrent state change handling specified (admin changes while dialog open)? [Coverage, Spec §Edge Cases]
  - ✅ Edge Cases: "Concurrent Operations" handling documented

## Ownership Transfer Pattern Alignment (Spec 015)

- [x] CHK030 - Does `useContractAdminInfo` mirror `useContractOwnership` query structure? [Consistency, Plan §Research]
  - ✅ Plan §Research: explicit pattern mapping documented
- [x] CHK031 - Does `useTransferAdminRole` follow `useTransferOwnership` mutation pattern? [Consistency, Plan §Research]
  - ✅ Plan §Research: "Copy useTransferOwnership → useTransferAdminRole"
- [x] CHK032 - Does `useAcceptAdminTransfer` follow `useAcceptOwnership` mutation pattern? [Consistency, Plan §Research]
  - ✅ Plan §Research: "Copy useAcceptOwnership → useAcceptAdminTransfer"
- [x] CHK033 - Does `useAdminTransferDialog` mirror `useOwnershipTransferDialog` state machine? [Consistency, Plan §Research]
  - ✅ Plan §Research: State machine documented
- [x] CHK034 - Does `TransferAdminDialog` follow `TransferOwnershipDialog` component structure? [Consistency, Plan §Research]
  - ✅ Plan §Research: Component pattern documented
- [x] CHK035 - Is `PendingTransferInfo` reuse explicitly documented with prop mapping? [Completeness, Spec §FR-006b]
  - ✅ FR-006b: `transferLabel="Admin Role"` and `recipientLabel="Admin"` specified
- [x] CHK036 - Are admin role constants (ID, name, description) parallel to owner constants? [Consistency, Plan §Phase 1]
  - ✅ Plan/data-model.md: ADMIN_ROLE_ID, ADMIN_ROLE_NAME, ADMIN_ROLE_DESCRIPTION documented

## Integration & Dependencies

- [x] CHK037 - Is the assumption that adapter API exists validated/documented? [Dependency, Spec §Assumptions]
  - ✅ Assumptions section documents API availability
- [x] CHK038 - Are `AdminInfo`, `AdminState`, `PendingAdminTransfer` type imports specified? [Completeness, Plan §Dependencies]
  - ✅ Plan §Dependencies: Types from `@openzeppelin/ui-builder-types`
- [x] CHK039 - Is the `hasTwoStepAdmin` capability check documented for all conditional logic? [Completeness, Spec §FR-004]
  - ✅ FR-001a, FR-002, FR-004 all reference capability check
- [x] CHK040 - Is Dashboard integration (`useRoleChangesPageData`) scope documented? [Completeness, Plan §Phase 5]
  - ✅ Plan §Phase 5: Dashboard integration documented

## Acceptance Criteria Quality

- [x] CHK041 - Can SC-001 through SC-017 be objectively measured/tested? [Measurability, Spec §Success Criteria]
  - ✅ All criteria are testable with specific conditions
- [x] CHK042 - Are acceptance scenarios in US1-US5 testable without implementation details? [Testability, Spec §User Scenarios]
  - ✅ Given/When/Then format with observable outcomes
- [x] CHK043 - Is "code reuse maximized" (SC-017) quantifiable or too vague? [Measurability, Spec §SC-017]
  - ✅ SC-017 updated: Now specifies 3 concrete reuse criteria (PendingTransferInfo, mutation hooks, dialog state machine)

## Gaps & Ambiguities Identified

- [x] CHK044 - Is single-step admin transfer intentionally out of scope (only two-step)? [Scope, Spec §Scope Boundaries]
  - ✅ Added "Scope Boundaries" section: single-step explicitly out of scope
- [x] CHK045 - Are requirements for admin + owner both pending simultaneously addressed? [Coverage, Spec §Edge Cases]
  - ✅ Added Edge Case: "Dual Pending Transfers" - tracked and displayed independently
- [x] CHK046 - Is mobile/responsive behavior for dialogs specified or inherited? [Spec §Scope Boundaries]
  - ✅ Added to Scope Boundaries: "inherits existing responsive patterns from dialogs"
- [x] CHK047 - Is internationalization/localization of error messages in scope? [Spec §Scope Boundaries]
  - ✅ Added to Scope Boundaries: "inherits existing patterns" (out of scope for new strings)

---

## Summary

**Status**: ✅ All 47 items addressed  
**Gaps Fixed**: 15 requirements added/clarified in spec.md  
**Ready for**: Implementation

### Requirements Added

| Item      | Requirement Added                     |
| --------- | ------------------------------------- |
| CHK003    | FR-003a (dual Owner+Admin)            |
| CHK005    | FR-001b, FR-001c (null handling)      |
| CHK007    | FR-002c (Shield icon specified)       |
| CHK014    | Edge Case: No Admin (Empty State)     |
| CHK015    | FR-009 (exact button label)           |
| CHK017    | FR-002d, FR-035c (ARIA labels)        |
| CHK018    | FR-035b (screen reader announcements) |
| CHK019    | FR-035a (focus trap)                  |
| CHK023    | Type Default Values section, FR-002e  |
| CHK027    | FR-028a, FR-028b (retry behavior)     |
| CHK028    | FR-001b (adapter method check)        |
| CHK043    | SC-017 (measurable reuse criteria)    |
| CHK044    | Scope Boundaries section              |
| CHK045    | Edge Case: Dual Pending Transfers     |
| CHK046/47 | Scope Boundaries (inherited patterns) |
