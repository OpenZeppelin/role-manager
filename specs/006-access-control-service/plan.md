# Implementation Plan: Access Control Service & Hooks

**Branch**: `006-access-control-service` | **Date**: 2024-12-04 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/006-access-control-service/spec.md`

## Summary

Implement the core Access Control service layer for the Role Manager application. This includes a set of React hooks (`useAccessControlService`, `useContractCapabilities`, `useContractRoles`, `useContractOwnership`, `useGrantRole`, etc.) that interface with the underlying UI Builder adapter. The feature also integrates "feature detection" into the contract loading workflow, ensuring that contracts are validated for AccessControl/Ownable support before being persisted to the local IndexedDB workspace. Storage schemas will be updated to cache these capabilities.

## Technical Context

**Language/Version**: TypeScript 5.x / React 18+
**Primary Dependencies**: `@openzeppelin/ui-builder-types`, `@openzeppelin/ui-builder-utils`, `@tanstack/react-query`, `dexie`
**Storage**: IndexedDB (via `@openzeppelin/ui-builder-storage`)
**Testing**: Vitest (Unit/Integration for hooks)
**Target Platform**: Browser (SPA)
**Project Type**: Web Application
**Performance Goals**: Instant UI feedback, optimistic updates where possible
**Constraints**: Must remain chain-agnostic (logic in adapters only), offline-capable
**Scale/Scope**: ~5 new hooks, 1 service wrapper, storage schema migration

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- [x] **I. Adapter-Led**: Logic resides in adapter; UI hooks only expose it.
- [x] **II. Reuse-First**: Uses `ui-builder-storage` and types.
- [x] **III. Type Safety**: Strict TS used.
- [x] **IV. UI/Design**: N/A (logic only).
- [x] **V. Testing**: Hooks will be tested with mock adapters.
- [x] **VI. Persistence**: Uses IndexedDB.

## Project Structure

### Documentation (this feature)

```text
specs/006-access-control-service/
├── plan.md              # This file
├── research.md          # Technology decisions
├── data-model.md        # Entities & storage updates
├── quickstart.md        # Hook usage guide
├── contracts/           # Service interfaces
└── tasks.md             # Implementation tasks
```

### Source Code

```text
apps/role-manager/src/
├── hooks/
│   ├── useAccessControlService.ts      # Adapter wrapper
│   ├── useContractCapabilities.ts      # Feature detection
│   ├── useContractData.ts              # Roles/Ownership queries
│   └── useAccessControlMutations.ts    # Grant/Revoke/Transfer
└── types/
    └── storage.ts                      # Updated RecentContractRecord
```

**Structure Decision**: Add focused hooks to `apps/role-manager/src/hooks/` and update types in place.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
| --------- | ---------- | ------------------------------------ |
| N/A       |            |                                      |
