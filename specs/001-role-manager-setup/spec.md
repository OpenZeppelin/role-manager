# Feature Specification: Monorepo Setup

**Feature**: 001-role-manager-setup
**Created**: 2025-11-26
**Status**: Draft

## 1. Context

The Role Manager is a standalone application that complements the OpenZeppelin UI Builder. It requires a robust monorepo foundation to manage the main application (`apps/role-manager`) alongside reusable packages (`packages/components`, `packages/hooks`) that will be shared with future tools. This setup must mirror the UI Builder's architecture, tooling, and quality standards to ensure seamless developer experience and integration.

## 2. User Scenarios

### Developer Setup

1.  **Developer** clones the repository.
2.  Runs `pnpm install` to fetch dependencies (including potentially local tarballs if configured).
3.  Runs `pnpm build` to verify the workspace compiles.
4.  Runs `pnpm test` to execute unit tests.
5.  Runs `pnpm lint` to verify code quality.
6.  Commits changes and sees `commitlint` and `husky` hooks enforce conventions.

### CI Pipeline

1.  **GitHub Actions** trigger on push/PR.
2.  Workflow installs dependencies.
3.  Workflow runs linting, type-checking, and tests.
4.  Workflow verifies build success.

## 3. Functional Requirements

### 3.1 Repository Structure

- **Workspace Root**: Configure as a PNPM workspace.
- **Apps Directory** (`apps/`): Container for the main application.
  - Initial placeholder for `apps/role-manager` (scaffolded later, but folder structure exists).
- **Packages Directory** (`packages/`): Container for shared libraries.
  - Initial placeholders for `packages/hooks` and `packages/components`.
- **Config Files**:
  - `pnpm-workspace.yaml` defining `apps/*` and `packages/*`.
  - `.gitignore` matching UI Builder's exclusions.
  - `.npmrc` enforcing strict hosting/hoisting settings similar to UI Builder.
  - Root `package.json` with dev scripts (`dev`, `build`, `test`, `lint`, `format`).

### 3.2 Tooling & Configuration (Mirroring UI Builder)

- **Language**: TypeScript (latest stable).
- **Package Manager**: `pnpm` (version matching UI Builder).
- **Bundler**: `tsup` for packages; `vite` for apps (config stubs).
- **Testing**: `vitest` workspace configuration.
- **Linting/Formatting**:
  - `eslint` (flat config) with OpenZeppelin presets if available or matching rules.
  - `prettier` configuration.
- **Versioning**: `changesets` for version management and changelog generation.
- **Styling**: `tailwind` v4 configuration and `postcss` setup (shared config stub).

### 3.3 Governance & Quality Hooks

- **Husky**: Git hooks for pre-commit (lint-staged) and commit-msg.
- **Commitlint**: Conventional commits enforcement (`@commitlint/config-conventional`).
- **Lint-Staged**: Run lint/format on changed files.

### 3.4 GitHub Actions

- **CI Workflow**:
  - `ci.yml`: Runs on push/PR to main.
  - Steps: Checkout, Install (pnpm), Build, Lint, Test.
- **Compliance**: Ensure no broken links or dependencies.

### 3.5 Local Development Helpers

- **Scripts**:
  - `scripts/pack-ui-builder.sh`: Helper (from Tech Doc) to pack upstream UI Builder tarballs.
  - `scripts/setup-local-dev.sh`: Helper to switch dependency modes (registry vs. local tarball).

## 4. Success Criteria

1.  **Repo builds cleanly**: `pnpm build` runs without error in a fresh clone.
2.  **Linting works**: `pnpm lint` checks files and reports errors.
3.  **Hooks active**: Attempting a non-conventional commit message fails.
4.  **Structure verification**: `apps/` and `packages/` exist and are recognized by `pnpm-workspace.yaml`.
5.  **CI simulation**: A simulated CI run (e.g., running the CI script locally) passes.
6.  **Tech Stack Match**: Configuration files (`tsconfig.json`, `eslintrc`, etc.) match UI Builder's standards.

## 5. Assumptions

- We are setting up the _scaffolding_ and _tooling_. Actual application code (React components, adapters logic) comes in subsequent feature implementation steps.
- "Copy structure almost entirely" implies adopting the same versions of build tools and config patterns.
- Access to UI Builder repo is available for reference (via workspace paths).

## 6. Questions & Clarifications

- _None needed at this stage; requirements are clearly derived from the Constitution and Technical Document._
