# Research: Access Control Service & Hooks

**Status**: Complete
**Date**: 2024-12-04

## Unknowns & Clarifications

### 1. Adapter Interface

**Question**: What is the exact shape of `AccessControlService`?
**Finding**: The interface is fully defined in `@openzeppelin/ui-builder-types` (read from `ui-builder` repo).
**Details**:

- `getCapabilities(address)` -> `AccessControlCapabilities`
- `getCurrentRoles(address)` -> `RoleAssignment[]`
- `getOwnership(address)` -> `OwnershipInfo`
- `grantRole(...)`, `revokeRole(...)`, `transferOwnership(...)` take `ExecutionConfig` and `onStatusChange`.

### 2. Storage Extension

**Question**: How to persist capabilities?
**Finding**: `RecentContractRecord` in `apps/role-manager/src/types/storage.ts` needs to be extended.
**Decision**: Add optional `capabilities?: AccessControlCapabilities` field to `RecentContractRecord`.

## Technology Decisions

### 1. State Management

**Decision**: Use `@tanstack/react-query` for all read operations (`getCapabilities`, `getCurrentRoles`, `getOwnership`).
**Rationale**: Handles caching, loading states, and refetching out of the box. Essential for async adapter calls.
**Alternatives**: `useEffect` + `useState` (rejected due to complexity of race conditions and lack of caching).

### 2. Mutation Management

**Decision**: Use `@tanstack/react-query` `useMutation` for writes (`grantRole`, etc.).
**Rationale**: Standard pattern in the codebase, easy integration with `onStatusChange` callbacks.

### 3. Service Access

**Decision**: Create a `useAccessControlService` hook that unwraps the service from the current adapter.
**Rationale**: The adapter object contains the service factory (`getAccessControlService()`). We need a stable reference to the service instance.

## Implementation Patterns

### Hook Architecture

- **`useAccessControlService`**: Low-level accessor.
- **`useContractCapabilities`**: Query hook for feature detection.
- **`useContractRoles` / `useContractOwnership`**: Query hooks for data.
- **`useGrantRole` / `useRevokeRole` / `useTransferOwnership`**: Mutation hooks.
