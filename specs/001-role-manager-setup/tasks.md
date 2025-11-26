# Tasks: Monorepo Setup

## Phase 1 — Setup (Blocking)

- [ ] T001 Initialize Git repository and standard files (.gitignore, .editorconfig, LICENSE) in /
- [ ] T002 Initialize PNPM workspace (pnpm-workspace.yaml, package.json, .npmrc) in /
- [ ] T003 Create directory structure (apps/role-manager, packages/components, packages/hooks, scripts/) in /
- [ ] T004 Install root build dependencies (typescript, vite, tsup, vitest, pnpm) in package.json
- [ ] T005 [P] Create base tsconfig files (tsconfig.json, tsconfig.base.json, tsconfig.node.json) mirroring UI Builder in /
- [ ] T006 [P] Initialize ESLint flat config and Prettier setup (eslint.config.js, .prettierrc) in /
- [ ] T007 Initialize Changesets configuration (.changeset/config.json) in .changeset/

## Phase 2 — Foundational (Infrastructure)

- [ ] T008 [P] Configure Husky and lint-staged (.husky/, package.json) for pre-commit hooks in /
- [ ] T009 [P] Configure Commitlint (commitlint.config.js) matching UI Builder conventions in /
- [ ] T010 [P] Create GitHub Actions CI workflow (.github/workflows/ci.yml) for build/lint/test in .github/
- [ ] T011 [P] Create local development helper script (scripts/pack-ui-builder.sh) for packing upstream tarballs in scripts/
- [ ] T012 [P] Create dependency mode switcher script (scripts/setup-local-dev.sh) for registry vs local in scripts/
- [ ] T013 Verify Setup: Run pnpm install, build, and lint to ensure clean workspace state

## Phase 3 — US1: Developer Setup

*Goal: Enable developers to clone, install, and contribute immediately.*

- [ ] T014 [US1] Create placeholder package.json for apps/role-manager with build/test/lint scripts in apps/role-manager/
- [ ] T015 [US1] Create placeholder package.json for packages/components with tsup config in packages/components/
- [ ] T016 [US1] Create placeholder package.json for packages/hooks with tsup config in packages/hooks/
- [ ] T017 [US1] Update root package.json with workspace shortcuts (dev, build, test:all) in /
- [ ] T018 [US1] Documentation: Add README.md with setup instructions and local development guide in /

## Dependencies & Order

- Phase 1 (T001-T007) must be completed before Phase 2.
- Phase 2 (Infrastructure) validates the workspace health.
- Phase 3 (US1) relies on the workspace configuration being active.

## Parallel Opportunities

- T005, T006, T007 (Config files) can be done in parallel.
- T008, T009, T010, T011, T012 (Infrastructure tools) are largely independent.
- T014, T015, T016 (Package stubs) can be done in parallel.

## MVP Scope

- All phases are required for the initial "Setup" MVP as this is a foundational feature.

