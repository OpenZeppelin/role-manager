# Feature Specification: Contract Schema Loading and Storage

**Feature Branch**: `005-contract-schema-storage`  
**Created**: 2025-12-03  
**Status**: Draft  
**Input**: User description: "Contract schema loading and storing. Look at the Builder UI app. We already have implemented this fully there. Each adapter has it's own way of loading and parsing the schema. We will need this for detecting contract features, querying and executing transaction."

## User Scenarios & Testing _(mandatory)_

<!--
  IMPORTANT: User stories are PRIORITIZED as user journeys ordered by importance.
  Each user story/journey is INDEPENDENTLY TESTABLE - meaning if you implement just ONE of them,
  you should still have a viable MVP that delivers value.
-->

### User Story 1 - Load Contract Schema by Address (Priority: P1)

As a user managing Stellar smart contracts, I want to enter a contract ID and have the system automatically load and parse the contract's spec so that I can interact with the contract's functions.

**Why this priority**: This is the foundational capability that enables all other features - detecting access control patterns, querying view functions, and executing transactions all require a parsed contract schema.

**Independent Test**: Can be fully tested by entering a valid Stellar contract ID and confirming the system displays the contract's functions, inputs, and outputs correctly.

**Acceptance Scenarios**:

1. **Given** a user wants to add a contract, **When** they select an ecosystem/network, **Then** the system renders the appropriate input fields as declared by the adapter's `getContractDefinitionInputs()`.

2. **Given** a user has selected a Stellar network, **When** they enter a valid contract ID, **Then** the system fetches the contract spec via Soroban RPC and displays the contract's functions.

3. **Given** a user enters an invalid contract ID, **When** the system attempts to load, **Then** a clear error message explains what went wrong (invalid format, contract not found, network unreachable).

4. **Given** a contract has no published Wasm/spec on the network, **When** the system attempts to load, **Then** a clear error message explains the contract metadata is unavailable.

---

### User Story 2 - Provide Manual Contract Definition (Priority: P2)

As a user with a contract whose spec cannot be fetched automatically, I want to manually provide the contract definition so that I can still manage contracts that aren't accessible via RPC.

**Why this priority**: Some contracts may have no published Wasm on the network, or users may be working with local/development contracts. Users need a fallback mechanism to work with these contracts.

**Independent Test**: Can be tested by pasting a valid JSON spec for a contract and confirming the system parses and displays the functions correctly.

> **⚠️ Stellar Adapter Status**: The Stellar adapter in `@openzeppelin/ui-builder-adapter-stellar` currently only supports RPC fetching via `getContractDefinitionInputs()` (returns only `contractAddress` field). Manual definition input (JSON spec or Wasm binary) is documented as a **future enhancement** in the adapter ([adapter.ts lines 157-180](https://github.com/OpenZeppelin/contracts-ui-builder/blob/main/packages/adapter-stellar/src/adapter.ts#L157-L180)). When the adapter adds `contractDefinition` to its inputs, Role Manager will automatically support it via the dynamic form rendering.
>
> **For MVP**: This user story is **blocked by adapter enhancement**. Role Manager's architecture is ready (dynamic form rendering, storage with `source: 'manual'`), but the Stellar adapter must first add the `contractDefinition` input field.

**Acceptance Scenarios**:

1. **Given** the adapter's `getContractDefinitionInputs()` includes a manual definition field, **When** the user provides a valid contract definition, **Then** the system parses it and displays the contract's functions.

2. **Given** the user provides an invalid or malformed contract definition, **When** the system attempts to parse it, **Then** a clear error message indicates the specific parsing issue.

3. **Given** the user provides a contract ID and manual definition, **When** both are valid, **Then** the manual definition takes precedence over any fetched spec (sets `source: 'manual'`).

---

### User Story 3 - Persist Contract Schema for Offline Use (Priority: P2)

As a user who has loaded contract schemas, I want them to be stored locally so that I can access the contract information without re-fetching every time I open the application.

**Why this priority**: Reduces network dependency, improves performance, and enables offline browsing of previously loaded contracts.

**Independent Test**: Can be tested by loading a contract, closing the application, reopening it, and confirming the contract schema is available without network requests.

**Acceptance Scenarios**:

1. **Given** a contract schema has been successfully loaded, **When** the user closes and reopens the application, **Then** the contract schema is restored from local storage without network requests.

2. **Given** a contract was loaded with manual definition, **When** the user reopens the application, **Then** both the schema and original definition are restored.

3. **Given** multiple contracts have been loaded, **When** the user opens the application, **Then** all previously loaded contract schemas are available.

---

### User Story 4 - Refresh Contract Schema (Priority: P3)

As a user managing contracts, I want to refresh the contract schema to detect if the contract's interface has changed so that I stay synchronized with the latest contract version.

**Why this priority**: Contracts can be upgraded, ABIs can be updated on block explorers, and implementations can change. Users need a mechanism to detect and update to the latest schema.

**Independent Test**: Can be tested by loading a contract, manually modifying the stored schema, then refreshing and confirming the system detects the difference.

**Acceptance Scenarios**:

1. **Given** a stored contract schema with `source === 'fetched'`, **When** the user requests a refresh, **Then** the system fetches the latest schema from the source.

2. **Given** a stored contract schema with `source === 'manual'`, **When** the user requests a refresh, **Then** the system skips the refresh and preserves the user-provided definition.

3. **Given** the refreshed schema differs from the stored version, **When** the comparison is complete, **Then** the user sees a summary of what changed (added/removed/modified functions).

4. **Given** the refreshed schema is identical to the stored version, **When** the comparison is complete, **Then** the user receives confirmation that no changes were detected.

---

### Edge Cases

- What happens when the Soroban RPC is unavailable during contract loading? Show error immediately with manual retry option. Circuit breaker pattern activates after 3 consecutive failures within 30 seconds to prevent API abuse.
- How does the system handle contracts with many functions? Performance should remain acceptable with appropriate loading indicators.
- What happens when a contract ID exists but has no published Wasm/spec? The system should detect this and inform the user, prompting for manual definition.
- How does the system handle contracts deployed on unsupported Stellar networks? Clear messaging about network support.
- What happens if local storage is full or corrupted? Graceful degradation with the ability to clear and reload.
- What happens when the user switches networks/ecosystems while filling the form? The form inputs should reset to match the new adapter's requirements.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST dynamically render contract loading form inputs based on the adapter's declared requirements (via `getContractDefinitionInputs()`) using `@openzeppelin/ui-builder-renderer` (specifically `DynamicFormField` component).
- **FR-002**: System MUST load contract schemas from Stellar contracts via Soroban RPC.
- **FR-003**: System MUST accept manual contract definitions when the adapter's `getContractDefinitionInputs()` provides a manual definition field. _(Note: For Stellar, this is a future adapter enhancement; Role Manager architecture is ready.)_
- **FR-004**: System MUST validate contract definitions before storing (valid structure, required fields present, ecosystem-appropriate format as declared by the adapter).
- **FR-005**: System MUST persist loaded contract schemas in local storage using the existing IndexedDB infrastructure.
- **FR-006**: System MUST store both the parsed schema and the original contract definition to support re-parsing and comparison.
- **FR-007**: System MUST provide a refresh mechanism to re-fetch contract schemas from their original sources (applies only to `source === 'fetched'` contracts; manual contracts are preserved).
- **FR-008**: System MUST compare refreshed schemas with stored versions and report differences at the function level.
- **FR-009**: System MUST normalize contract definitions into a unified ContractSchema format for consistent downstream processing.
- **FR-010**: System MUST support the Stellar ecosystem, with the architecture designed to support additional ecosystems via the adapter pattern.

### Key Entities

- **ContractSchema**: The normalized internal representation of a contract's interface, containing:
  - Name: Contract identifier or label
  - Ecosystem: Target blockchain ecosystem (stellar, etc.)
  - Functions: Array of function definitions with inputs, outputs, and state mutability
  - Address: Deployed contract ID
  - Metadata: Ecosystem-specific additional context (e.g., spec entries for Stellar)

- **RecentContractRecord (extended)**: The persisted record linking a contract to its schema, extending the existing `RecentContractRecord` from spec 004:
  - Existing fields: `networkId`, `address`, `label`, `lastAccessed`
  - New schema fields (optional, populated when schema is loaded):
    - `ecosystem`: Target blockchain ecosystem
    - `schema`: JSON-serialized ContractSchema
    - `schemaHash`: Hash for quick comparison
    - `source`: `'fetched'` | `'manual'` (determines refresh eligibility)
    - `definitionOriginal`: Original contract definition for re-parsing
    - `schemaMetadata`: Source metadata (where fetched from, when) - only for fetched contracts
  - Composite unique key: `networkId + address` (existing)

- **ContractAdapter**: Interface that each ecosystem implements for loading and parsing contracts:
  - `getContractDefinitionInputs()`: Returns form field definitions declaring what inputs are required to load a contract (e.g., contract ID, optional manual definition fields). The UI renders these dynamically.
  - `loadContract(artifacts)`: Loads a contract using the provided artifacts (form values) and returns a ContractSchema
  - `loadContractWithMetadata(artifacts)`: Enhanced loading that returns schema plus source metadata
  - Handles ecosystem-specific validation and transformation

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Users can load a Stellar contract schema via Soroban RPC in under 5 seconds on a standard internet connection.
- **SC-002**: Users can load a previously stored contract schema in under 100 milliseconds (local storage retrieval).
- **SC-003**: Manual contract definition input (when adapter supports it) successfully parses valid definitions with zero false rejections.
- **SC-004**: Contract schema refresh correctly identifies function-level differences (added, removed, modified) with 100% accuracy.
- **SC-005**: Users can manage up to 100 stored contract schemas without noticeable performance degradation.

## Assumptions

- The existing IndexedDB infrastructure from the data store service (spec 003) is available and functional.
- The Stellar adapter patterns from the contracts-ui-builder package can be imported or replicated.
- Users have reliable network connectivity for initial contract loading (offline mode is for subsequent access).
- Soroban RPC endpoints remain publicly accessible for fetching contract specs.
- The unified ContractSchema format from the Builder UI app is suitable for Role Manager's needs without modification.
- The `@openzeppelin/ui-builder-renderer` package will be added as a dependency for dynamic form rendering.
- Local development scripts require updates:
  - `scripts/setup-local-dev.cjs`: Add `'@openzeppelin/ui-builder-renderer'` to the `UI_BUILDER_PACKAGES` array
  - `scripts/pack-ui-builder.sh`: No changes needed (auto-packs all packages in `packages/` directory)

## Clarifications

### Session 2025-12-03

- Q: What determines if two contract records are the same (preventing duplicates)? → A: Contract ID + Network ID (composite key)
- Q: When refreshing a contract that was loaded with a manual definition, what should happen? → A: Skip refresh for manual contracts (only `source === 'fetched'` contracts are eligible for refresh, preserving user-provided definitions)
- Q: When Soroban RPC fails to load a contract, should the system automatically retry? → A: No auto-retry; show error immediately with manual retry option. Use circuit breaker pattern (after 3 failures in 30 seconds, block further attempts temporarily) to prevent API abuse.
- Q: How should dynamic form inputs from `getContractDefinitionInputs()` be rendered? → A: Use `@openzeppelin/ui-builder-renderer` package for dynamic form rendering. Update `scripts/setup-local-dev.cjs` and related scripts for local development setup.
