# Research: Authorized Accounts Real Data Integration

**Feature**: 011-accounts-real-data  
**Date**: 2025-12-08

## Research Tasks

### 1. Enriched Roles API Integration

**Question**: How to integrate `getCurrentRolesEnriched()` API for timestamp data?

**Decision**: Create new `useContractRolesEnriched` hook that wraps the enriched API with react-query caching.

**Rationale**:

- The enriched API provides `grantedAt` timestamps when indexer is available
- Graceful degradation: returns members without timestamps if indexer unavailable
- Follows existing pattern from `useContractRoles` hook
- React-query handles caching, background refresh, and stale data

**Alternatives Considered**:

- Extend existing `useContractRoles`: Rejected because enriched API has different return type and behavior
- Direct service calls: Rejected because loses react-query benefits (caching, deduplication)

**Implementation Notes**:

```typescript
// New hook signature
export function useContractRolesEnriched(
  adapter: ContractAdapter | null,
  contractAddress: string,
  isContractRegistered?: boolean
): UseContractRolesEnrichedReturn;
```

---

### 2. Role-to-Account Data Transformation

**Question**: How to efficiently transform role-centric data to account-centric view?

**Decision**: Create dedicated `transformRolesToAccounts()` utility function in `utils/account-transformer.ts`.

**Rationale**:

- Single responsibility: transformation logic separate from hooks
- Testable: pure function with no side effects
- Reusable: can be used in other contexts if needed
- Performance: O(n) complexity where n = total members across all roles

**Alternatives Considered**:

- Inline in hook: Rejected because harder to test and pollutes hook logic
- Memoized selector: Considered but simple function with useMemo in hook is sufficient

**Algorithm**:

```typescript
function transformRolesToAccounts(
  enrichedRoles: EnrichedRoleAssignment[],
  ownership: OwnershipInfo | null
): AuthorizedAccountView[] {
  // 1. Build Map<address, AccountData> from roles
  // 2. Add owner if present
  // 3. For each account, find earliest grantedAt
  // 4. Sort: timestamped accounts (newest first), then non-timestamped (alphabetical)
  // 5. Return array
}
```

---

### 3. Client-Side Pagination Pattern

**Question**: How to implement pagination on filtered data?

**Decision**: Follow existing `usePaginatedRoles` pattern - compute pagination in hook, expose controls.

**Rationale**:

- Consistent with existing codebase patterns
- API doesn't support server-side pagination
- Data volume is manageable (<100 accounts typical)
- Filter changes reset to page 1

**Implementation**:

```typescript
// In useAuthorizedAccountsPageData hook
const filteredAccounts = useMemo(() => applyFilters(allAccounts, filters), [allAccounts, filters]);

const { paginatedItems, ...paginationControls } = usePagination(filteredAccounts, { pageSize: 10 });
```

---

### 4. Sorting Strategy

**Question**: How to sort accounts in the table?

**Decision**: Primary sort by `grantedAt` (newest first), secondary sort alphabetical by address for accounts without timestamps.

**Rationale**:

- Newest accounts are typically most relevant for access management
- Alphabetical fallback provides predictable ordering
- Accounts without timestamps appear after timestamped accounts

**Implementation**:

```typescript
function sortAccounts(accounts: AuthorizedAccountView[]): AuthorizedAccountView[] {
  return [...accounts].sort((a, b) => {
    // Both have timestamps: newest first
    if (a.dateAdded && b.dateAdded) {
      return new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime();
    }
    // Only a has timestamp: a comes first
    if (a.dateAdded && !b.dateAdded) return -1;
    // Only b has timestamp: b comes first
    if (!a.dateAdded && b.dateAdded) return 1;
    // Neither has timestamp: alphabetical by address
    return a.address.localeCompare(b.address);
  });
}
```

---

### 5. Status Model Update

**Question**: How to update the status model for transaction-state based statuses?

**Decision**: Remove "Expired" status, keep "Active", prepare types for future "Pending" and "Awaiting Signature".

**Rationale**:

- OZ AccessControl has no timelock/expiration feature
- Status is transaction-state based, not time-based
- All accounts from adapter are "Active" (confirmed on-chain)
- Future expansion for transaction execution and multisig

**Type Changes**:

```typescript
// Before (spec 010)
type AccountStatus = 'active' | 'expired' | 'pending';

// After (spec 011)
type AccountStatus = 'active' | 'pending' | 'awaiting-signature';
// Note: 'pending' and 'awaiting-signature' reserved for future transaction execution spec
```

---

### 6. Component Updates Required

**Question**: Which components need updates for real data?

**Decision**: Update existing components, add new error/empty state components.

**Components to Update**:
| Component | Changes |
|-----------|---------|
| `AccountRow` | Remove `expiresAt` handling, show "-" for missing `dateAdded` |
| `AccountsFilterBar` | Remove "Expired" from status dropdown |
| `AccountsTable` | Wire to real data props |
| `AuthorizedAccounts` (page) | Replace mock data with hook, add states |

**New Components**:
| Component | Purpose |
|-----------|---------|
| `AccountsEmptyState` | Shown when contract lacks AccessControl/Ownable |
| `AccountsErrorState` | Shown when data fetch fails, with retry button |

---

### 7. Hook Pattern Reference

**Question**: What hook patterns to follow from existing codebase?

**Decision**: Follow `useRolesPageData` pattern from spec 009.

**Key Patterns**:

1. Orchestration hook aggregates multiple data sources
2. Loading state = any sub-query loading
3. Error state = any sub-query error
4. `isRefreshing` = fetching but not initial load
5. `refetch` combines all sub-query refetches
6. Contract change resets local state

**Reference Implementation**: `apps/role-manager/src/hooks/useRolesPageData.ts`

---

## Summary of Decisions

| Topic           | Decision                                                |
| --------------- | ------------------------------------------------------- |
| API Integration | New `useContractRolesEnriched` hook                     |
| Transformation  | Dedicated utility function `transformRolesToAccounts()` |
| Pagination      | Client-side, following `usePaginatedRoles` pattern      |
| Sorting         | Newest first by grantedAt, alphabetical fallback        |
| Status Model    | Remove "Expired", keep "Active", prepare future states  |
| Components      | Update existing + add EmptyState, ErrorState            |
| Hook Pattern    | Follow `useRolesPageData` orchestration pattern         |

## Open Questions

None - all clarifications resolved during `/speckit.clarify`.
