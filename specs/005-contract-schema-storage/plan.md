# Implementation Plan: Contract Schema Loading and Storage

**Branch**: `005-contract-schema-storage` | **Date**: 2025-12-03 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/005-contract-schema-storage/spec.md`

## Summary

This feature adds contract schema loading and storage capabilities to Role Manager, enabling users to:

1. Load Stellar contract schemas via Soroban RPC using adapter-driven dynamic form inputs
2. Provide manual contract definitions (JSON spec or Wasm binary) as fallback
3. Persist loaded schemas in IndexedDB for offline access
4. Refresh schemas and detect function-level changes

The implementation reuses patterns from `ui-builder`:

- `@openzeppelin/ui-builder-renderer` for dynamic form rendering (`DynamicFormField`)
- `@openzeppelin/adapter-stellar` for contract loading via `loadContractWithMetadata()`
- `@openzeppelin/ui-builder-storage` for IndexedDB persistence (extending existing `RecentContractsStorage`)
- `@openzeppelin/ui-builder-types` for `ContractSchema`, `FormFieldType`, etc.

## Technical Context

**Language/Version**: TypeScript 5.x with React 18  
**Primary Dependencies**:

- `@openzeppelin/ui-builder-renderer` (NEW - for `DynamicFormField`)
- `@openzeppelin/adapter-stellar` (existing)
- `@openzeppelin/ui-builder-storage` (existing - Dexie/IndexedDB)
- `@openzeppelin/ui-builder-types` (existing - `ContractSchema`, `FormFieldType`)
- `@openzeppelin/ui-builder-utils` (existing - `logger`, `simpleHash`)

**Storage**: IndexedDB via Dexie (extends existing `RecentContractRecord` with schema fields)  
**Testing**: Vitest (TDD for storage/hooks, following existing patterns)  
**Target Platform**: Browser SPA (client-side only, offline-capable)  
**Project Type**: Monorepo app (`apps/role-manager`)  
**Performance Goals**:

- Schema load via RPC: <5 seconds
- Schema load from storage: <100ms
- Support 100+ stored contracts with schemas without degradation

**Constraints**:

- No backend dependencies (client-side only)
- Must use adapter pattern for chain-agnostic architecture
- Circuit breaker pattern for RPC failure handling (3 failures / 30s)

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                   | Status  | Notes                                                                           |
| --------------------------- | ------- | ------------------------------------------------------------------------------- |
| I. Adapter-Led Architecture | ✅ PASS | Uses adapter's `getContractDefinitionInputs()` and `loadContractWithMetadata()` |
| II. Reuse-First & Monorepo  | ✅ PASS | Reuses `ui-builder-renderer`, `ui-builder-storage`, adapter packages            |
| III. Type Safety & Linting  | ✅ PASS | Uses TypeScript strict mode, types from `ui-builder-types`                      |
| IV. UI/Design System        | ✅ PASS | Uses `DynamicFormField` from renderer, existing UI components                   |
| V. Testing & TDD            | ✅ PASS | TDD for storage layer and hooks (per constitution)                              |
| VI. Tooling & Persistence   | ✅ PASS | IndexedDB via Dexie, standalone SPA                                             |

**Additional Constraints Check:**

- ✅ Storage: Uses IndexedDB (not localStorage)
- ✅ Security: No hardcoded secrets; relies on RPC endpoints
- ✅ Forms: Uses `@openzeppelin/ui-builder-renderer` for dynamic forms

## Project Structure

### Documentation (this feature)

```text
specs/005-contract-schema-storage/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (TypeScript interfaces)
│   └── storage.ts       # Storage interfaces
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
apps/role-manager/src/
├── core/
│   └── storage/
│       ├── database.ts              # MODIFY: Add schema indexes to recentContracts
│       ├── RecentContractsStorage.ts # MODIFY: Add schema-related methods
│       └── __tests__/
│           └── RecentContractsStorage.test.ts # MODIFY: Add schema tests
├── hooks/
│   ├── useContractSchema.ts         # NEW: Hook for schema loading
│   ├── useContractSchemaLoader.ts   # NEW: Circuit breaker + loading logic
│   └── __tests__/
│       ├── useContractSchema.test.tsx
│       └── useContractSchemaLoader.test.tsx
├── components/
│   └── Contracts/
│       ├── ContractDefinitionForm.tsx   # NEW: Dynamic form using DynamicFormField
│       ├── ContractSchemaDisplay.tsx    # NEW: Display loaded schema
│       └── SchemaRefreshButton.tsx      # NEW: Refresh with diff display
├── types/
│   └── storage.ts                   # MODIFY: Extend RecentContractRecord with schema fields
└── services/
    └── schemaComparisonService.ts   # NEW: Schema comparison logic

scripts/
└── setup-local-dev.cjs              # MODIFY: Add ui-builder-renderer to packages
```

**Structure Decision**: Extends existing `RecentContractRecord` and `RecentContractsStorage` rather than creating separate storage. This simplifies the architecture since a contract and its schema are the same entity in Role Manager's context. New hooks follow `useNetworkAdapter` pattern.

## Complexity Tracking

> No constitution violations requiring justification.

| Component               | Complexity | Justification                                                     |
| ----------------------- | ---------- | ----------------------------------------------------------------- |
| RecentContractsStorage  | Low        | Extends existing class with new methods                           |
| useContractSchemaLoader | Medium     | Circuit breaker pattern (matches Builder UI)                      |
| ContractDefinitionForm  | Low        | Uses DynamicFormField from renderer                               |
| Schema comparison       | Medium     | Function-level diff (reuse adapter's compare method if available) |
