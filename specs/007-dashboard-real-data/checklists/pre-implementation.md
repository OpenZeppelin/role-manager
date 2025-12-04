# Pre-Implementation Checklist: Dashboard Real Data Integration

**Purpose**: Author self-review before starting implementation  
**Created**: 2025-12-04  
**Reviewed**: 2025-12-04 ✅  
**Feature**: [spec.md](../spec.md) | [plan.md](../plan.md)  
**Depth**: Lightweight (comprehensive coverage, moderate depth)

---

## Requirement Completeness

- [x] **CHK001** - Are all contract type display values explicitly enumerated (Access Control, Ownable, Access Control + Ownable, Unknown)? [Completeness, Spec §FR-002]

  > ✅ Verified in data-model.md: `type ContractType = 'Access Control' | 'Ownable' | 'Access Control + Ownable' | 'Unknown' | 'Not Supported'`

- [x] **CHK002** - Is the deduplication algorithm for unique accounts specified (Set-based, case-sensitive)? [Gap, Plan §Research]

  > ✅ Verified in research.md §3: Set-based algorithm with code example. JavaScript Set is case-sensitive by default.

- [x] **CHK003** - Are loading state requirements defined for BOTH stats cards AND action buttons? [Completeness, Spec §FR-006, FR-012]
  > ✅ FR-006 covers stats cards loading; FR-012 covers button disabled states during loading.

## Requirement Clarity

- [x] **CHK004** - Is "500ms" performance target measured from contract selection or data fetch start? [Clarity, Spec §SC-001]

  > ✅ SC-001 explicitly states: "within 500ms of selecting a contract"

- [x] **CHK005** - Is the exact text content of the empty state CTA specified ("Add Contract" button text, guidance message)? [Clarity, Spec §FR-011]

  > ✅ RESOLVED: Updated FR-011 with exact text: title "No Contract Selected", description text, and "Add Contract" button.

- [x] **CHK006** - Is address truncation format for snapshot filename defined (how many chars before/after "...")? [Clarity, Spec §FR-009]
  > ✅ Verified in data-model.md: `{first4}...{last4}` (4 chars prefix, 4 chars suffix)

## Scenario Coverage

- [x] **CHK007** - Are requirements defined for partial data scenario (roles succeed, ownership fails)? [Coverage, Edge Case §Partial Data]

  > ✅ Edge Cases explicitly states: "show partial data with error indicator only on the failed section"

- [x] **CHK008** - Is behavior defined when network is switched while Dashboard is visible? [Coverage, Edge Case §Stale Data]

  > ✅ Edge Cases: "data should automatically refetch for the new context"

- [x] **CHK009** - Are retry button requirements specified for error states (placement, behavior)? [Coverage, Spec §FR-007]
  > ✅ RESOLVED: Updated FR-007 with retry placement (inline below error message) and behavior (refetch failed data only).

## Integration & Dependencies

- [x] **CHK010** - Is the assumption that `useExportSnapshot` exists validated against spec 006 implementation? [Assumption, ASSUMP-002]

  > ✅ Verified: `useExportSnapshot` exists in hooks/useAccessControlMutations.ts and is exported in hooks/index.ts

- [x] **CHK011** - Are context provider boundaries defined (inside/outside BrowserRouter)? [Gap, Plan §Research]

  > ✅ research.md §1: "Provider wraps at App.tsx level (outside router but inside BrowserRouter)"

- [x] **CHK012** - Is the relationship between Sidebar state migration and context initialization specified? [Dependency, Plan §File Changes]
  > ✅ research.md: "Sidebar becomes a consumer that calls setSelectedContract"; plan shows Sidebar UPDATE to migrate state to context.

## Export/Snapshot Requirements

- [x] **CHK013** - Does the AccessSnapshot schema in `contracts/` match the spec's Key Entities definition? [Consistency, Spec §Key Entities vs contracts/]

  > ✅ RESOLVED: Updated spec Key Entities to align with data-model.md (added version, renamed timestamp→exportedAt, nested contract object).

- [x] **CHK014** - Is snapshot `version` field included for forward compatibility? [Completeness, data-model.md §AccessSnapshot]
  > ✅ data-model.md and contracts/access-snapshot.schema.json both include `version: '1.0'`

## Non-Functional Requirements

- [x] **CHK015** - Are performance requirements for 50+ roles testable/measurable? [Measurability, Spec §SC-005]
  > ✅ SC-005 specifies "50+ roles without visual lag or performance issues" - threshold is measurable; "visual lag" can be interpreted as <100ms render in testing.

---

## Resolution Summary

| Item   | Status      | Action Taken                                            |
| ------ | ----------- | ------------------------------------------------------- |
| CHK005 | ✅ Resolved | Updated FR-011 with exact empty state text content      |
| CHK009 | ✅ Resolved | Updated FR-007 with retry button placement and behavior |
| CHK013 | ✅ Resolved | Updated spec Key Entities to match data-model.md schema |

## Notes

- All 15 checklist items verified and marked complete
- 3 gaps were identified and resolved by updating spec.md
- Requirements are now ready for implementation
- Reference [data-model.md](../data-model.md) and [research.md](../research.md) for detailed definitions
