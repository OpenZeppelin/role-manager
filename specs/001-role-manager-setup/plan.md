# Implementation Plan: Monorepo Setup

**Branch**: `001-role-manager-setup` | **Date**: 2025-11-26 | **Spec**: [Link](spec.md)
**Input**: Feature specification from `/specs/001-role-manager-setup/spec.md`

## Summary

This plan establishes the foundational monorepo structure for the Role Manager application. It configures the workspace to mirror the UI Builder architecture (`apps/` + `packages/`), installs the required build toolchain (`pnpm`, `tsup`, `vitest`), and enforces quality standards through Git hooks and CI workflows. This setup is a prerequisite for any application code development.

## Technical Context

**Language/Version**: TypeScript 5.x (latest stable matching UI Builder)
**Primary Dependencies**:

- **Build**: `pnpm` (latest), `tsup` (packages), `vite` (apps)
- **Test**: `vitest` (workspace mode)
- **Lint**: `eslint` (flat config), `prettier`, `commitlint`, `husky`
- **Version**: `changesets`
  **Storage**: N/A for scaffolding
  **Testing**: Unit tests (scaffolded configuration verification)
  **Target Platform**: Web (SPA) + Node (Tooling)
  **Project Type**: Monorepo (PNPM Workspace)
  **Constraints**: Must match UI Builder versions exactly; Strict linting; Local tarball support.
  **Scale/Scope**: 1 App, ~2 Packages initially.

## Constitution Check

_GATE: Must pass before Phase 0 research._

1.  **Adapter-Led Architecture**: N/A for setup, but workspace structure supports it (`packages/`).
2.  **Reuse-First**: Tooling mirrors UI Builder to enable reuse of its packages. Local tarball workflow explicitly supported.
3.  **Type Safety**: `tsconfig` settings will enforce strictness.
4.  **UI/Design System**: N/A for setup, but `tailwind` config scaffolded.
5.  **Testing/TDD**: `vitest` configured as the standard runner.
6.  **Tooling**: `pnpm` + `vite` + `changesets` explicitly selected.

**Result**: ✅ Compliant.

## Project Structure

### Documentation (this feature)

```text
specs/001-role-manager-setup/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # N/A (Scaffolding)
├── quickstart.md        # Phase 1 output (Setup Guide)
├── contracts/           # N/A (Scaffolding)
└── tasks.md             # Phase 2 output
```

### Source Code (repository root)

```text
/
├── apps/
│   └── role-manager/    # Placeholder
├── packages/
│   ├── components/      # Placeholder
│   └── hooks/           # Placeholder
├── .changeset/          # Versioning config
├── .github/
│   └── workflows/       # CI
├── .husky/              # Git hooks
├── scripts/             # Local dev helpers
├── package.json         # Root scripts
├── pnpm-workspace.yaml  # Workspace config
├── .npmrc               # Dependency strictness
├── tsconfig.json        # Base config
└── eslint.config.js     # Root linting
```

**Structure Decision**: Standard PNPM Monorepo matching UI Builder layout.

## Complexity Tracking

| Violation          | Why Needed                              | Simpler Alternative Rejected Because                                |
| ------------------ | --------------------------------------- | ------------------------------------------------------------------- |
| Monorepo Structure | Required by Constitution (Principle II) | Single repo would prevent effective code sharing with future tools. |
