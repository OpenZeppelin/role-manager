# Tasks: Setup UI Layout with UI Builder Packages

**Feature**: Setup UI Layout with UI Builder Packages
**Status**: Pending
**Feature Branch**: `002-ui-layout-setup`

## Phase 1: Setup & Package Integration

**Goal**: Establish the local package workflow and integrate dependencies from the UI Builder monorepo.

- [ ] T001 Run `pack-ui-builder.sh` to generate local tarballs for UI and Styles packages (scripts/pack-ui-builder.sh)
- [ ] T002 Install generated `.tgz` packages into Role Manager via `package.json` (apps/role-manager/package.json)
- [ ] T003 Configure `tailwind.config.js` to extend UI Builder preset (apps/role-manager/tailwind.config.cjs)
- [ ] T004 Configure `postcss.config.js` if needed for proper processing (apps/role-manager/postcss.config.cjs)
- [ ] T005 Update `index.css` to import base Tailwind directives and styles (apps/role-manager/src/index.css)
- [ ] T006 [US2] Verify local package integration by running a build check (apps/role-manager/package.json)

## Phase 2: Foundational Components

**Goal**: Create the shared layout structures required by all user stories.

- [ ] T007 Create `MainLayout` component structure (wrapper for Sidebar + Content) (apps/role-manager/src/components/Layout/MainLayout.tsx)
- [ ] T008 Create placeholder `Home` page component (apps/role-manager/src/pages/Home.tsx)
- [ ] T009 Setup React Router and define root routes in `App.tsx` (apps/role-manager/src/App.tsx)

## Phase 3: User Story 1 - View Application Base Layout (P1)

**Goal**: Users can see a consistent application layout with navigation and header.
**Independent Test**: Launch the app and visually verify Sidebar (with logo/Home) and Header (with app name).

- [ ] T010 [US1] Implement Sidebar component using UI Builder imports (apps/role-manager/src/components/Layout/Sidebar.tsx)
- [ ] T011 [US1] Configure Sidebar with Logo and "Home" navigation link (apps/role-manager/src/components/Layout/Sidebar.tsx)
- [ ] T012 [US1] Implement Header component using UI Builder imports with "Role Manager" title (apps/role-manager/src/components/Layout/Header.tsx)
- [ ] T013 [US1] Integrate Sidebar and Header into `MainLayout` (apps/role-manager/src/components/Layout/MainLayout.tsx)
- [ ] T014 [US1] Configure Sidebar responsive behavior to match UI Builder component defaults (apps/role-manager/src/components/Layout/MainLayout.tsx)
- [ ] T015 [US1] Write unit test for `MainLayout` rendering children (apps/role-manager/src/components/Layout/**tests**/MainLayout.test.tsx)

## Phase 4: Polish & Cross-Cutting Concerns

**Goal**: Ensure responsiveness, clean code, and final verification.

- [ ] T016 Verify and fix any mobile layout issues (Sidebar/Header overlap) (apps/role-manager/src/components/Layout/MainLayout.tsx)
- [ ] T017 Ensure no console warnings regarding missing keys or prop types (apps/role-manager/src/App.tsx)
- [ ] T018 Final build and start verification (apps/role-manager/package.json)

## Dependencies

- **US1 (View Layout)** depends on **Setup** and **Foundational Components**.
- **US2 (Dev Setup)** is primarily covered by **Phase 1** tasks but validated throughout.

## Parallel Execution Opportunities

- **T008 (Home Page)** and **T007 (MainLayout Structure)** can be done in parallel with **T003-T005 (CSS Setup)**.
- **T015 (Unit Tests)** can be written while **T013 (Integration)** is being implemented.

## Implementation Strategy

1. **MVP**: Complete Phase 1 & 2 to get the build working with local packages.
2. **Feature**: Implement Phase 3 to render the visible layout.
3. **Polish**: Finalize Phase 4 for mobile correctness.
