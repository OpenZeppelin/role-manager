<!--
Sync Impact Report
Version: 0.0.0 → 1.0.0
Modified Principles: Established new constitution based on UI Builder v1.2.2
Added sections: All principles (I-VI), Additional Constraints, Development Workflow
Removed sections: Template placeholders
Templates:
- ✅ .specify/templates/plan-template.md
Follow-up TODOs: none
-->

# Role Manager Constitution

## Core Principles

### I. Adapter-Led, Chain-Agnostic Architecture (NON-NEGOTIABLE)

- The Role Manager app MUST remain chain-agnostic; all blockchain interactions and business logic reside exclusively in chain-specific adapters (e.g., `@openzeppelin/ui-builder-adapter-stellar`).
- The UI MUST NOT contain chain-specific parsing, formatting, or transaction logic; it consumes the generic `AccessControlService` interface provided by adapters.
- Feature detection drives the UI: the app MUST query adapter capabilities (e.g., `hasOwnable`, `hasAccessControl`) to enable/disable features dynamically.
- Adapters are instantiated via `NetworkConfig`; the app supports multi-chain operations by switching adapters based on user selection.
- Rationale: Ensures the frontend is scalable to new chains (EVM, etc.) without code changes and strictly separates presentation from protocol logic.

### II. Reuse-First & Monorepo Integration (NON-NEGOTIABLE)

- The application MUST reuse `@openzeppelin/ui-builder-*` packages (types, utils, renderer, storage, ui) rather than re-implementing core functionality.
- Local development against the UI Builder monorepo MUST follow the "Local Tarball Workflow" (packing `.tgz` files and installing via `file:` protocol); symlinks are prohibited to ensure production-accurate dependency resolution.
- New shared utilities or types required by Role Manager should ideally be contributed upstream to UI Builder packages first, then consumed here.
- Rationale: Guarantees consistency with the broader OpenZeppelin tool ecosystem and validates the standalone usability of UI Builder packages.

### III. Type Safety, Linting, and Code Quality (NON-NEGOTIABLE)

- TypeScript strictness, shared linting, and formatting rules apply throughout the repository.
- `console` usage in source code is prohibited; use `logger` from `@openzeppelin/ui-builder-utils` (exceptions only in tests/scripts).
- `any` types are disallowed without explicit justification.
- React components MUST be typed with `React.FC` or explicit props interfaces; hooks must have explicit return types.
- Rationale: Enforces consistent quality gates and prevents regressions in the client-side logic.

### IV. UI/Design System Consistency (NON-NEGOTIABLE)

- The UI MUST implement the OpenZeppelin design system using `@openzeppelin/ui-builder-ui` components and `@openzeppelin/ui-builder-styles`.
- Styling leverages Tailwind CSS v4; use the `cn` utility for class composition.
- Layouts and patterns (forms, dialogs, lists) MUST match the UI Builder application's UX to provide a unified user experience.
- Rationale: Reduces cognitive load for users switching between tools and minimizes distinct maintenance of UI primitives.

### V. Testing and TDD for Business Logic (NON-NEGOTIABLE)

- All application-specific business logic (e.g., storage management, hook state logic, data transformers) MUST follow TDD: write failing tests first.
- UI components (layouts, pages, presentational components) do NOT require unit tests unless they contain complex internal logic. Focus testing efforts on hooks, services, and utility functions.
- Vitest is the standard for unit/integration tests; Storybook is required for new reusable UI components.
- The app MUST be testable with mock adapters; UI components should not tightly couple to live network sockets during tests.
- Rationale: Preserves confidence in the application shell and persistence layer independent of blockchain availability, while avoiding brittle tests for visual components.

### VI. Tooling, Persistence, and Autonomy (NON-NEGOTIABLE)

- The application MUST function as a standalone client-side SPA (Single Page Application) with no mandatory backend dependencies.
- Local persistence MUST use `@openzeppelin/ui-builder-storage` (Dexie/IndexedDB) for user data (snapshots, recent contracts, preferences).
- Build outputs utilize Vite; releases are managed via Changesets.
- Rationale: Ensures the tool is privacy-preserving, works offline (for cached data), and is easy to host.

## Additional Constraints

- **Storage**: Do not use `localStorage` for complex data; use the typed IndexedDB layer.
- **Security**: Do not hardcode chain secrets; rely on wallet connections or user input.
- **Forms**: Use `@openzeppelin/ui-builder-renderer` for transaction forms to inherit validation and schema logic from adapters.

## Development Workflow and Review Process

- Use `pnpm` for all tasks.
- Commit messages MUST follow Conventional Commits. Check available scopes and limits before committing.
- PRs MUST verify that changes to UI Builder dependencies are correctly versioned/packed.
- Code review enforces strict separation of concerns: rejection if UI contains chain-specific logic and is not adapter-led.

## Governance

- This constitution supersedes other practices; non-negotiable rules MUST be enforced during development and review.
- Amendments require a documented proposal and PR review.
- Breaking changes to upstream UI Builder interfaces require coordination with the UI Builder repository maintainers.

**Version**: 1.0.0 | **Ratified**: 2025-11-26 | **Last Amended**: 2025-11-26
