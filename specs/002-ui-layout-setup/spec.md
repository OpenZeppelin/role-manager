# Feature Specification: Setup UI Layout with UI Builder Packages

**Feature Branch**: `002-ui-layout-setup`  
**Created**: 2025-11-27  
**Status**: Draft  
**Input**: User description: "import ui and styles packages from the ui builder so that we can start using the components and tailwind styling from it. this will allow us to implement a layout base: sidebar, header, main content container (empty for now). Do not attempt to replicate the style from the screenshot in detail. The components and the styles package should take care of most styling. The goal is not to have a pixel perfect copy, but a base consistent with the UI Builder app which will be expanded with the features required by the Role Manager (the screenshot is a preview of what's coming). And don't forget to use the local UI Builder monorepo packages via @role-manager/scripts/pack-ui-builder.sh that we have established in the @001-role-manager-setup spec"

## Clarifications

### Session 2025-11-27

- Q: What specific placeholder content should be in the Sidebar and Header for this initial setup? → A: **Minimal Layout Content**: Sidebar contains a logo in its header and a single "Home" link; Header displays the app name "Role Manager" (no wallet connect button yet).
- Q: How should the local UI Builder packages be linked/consumed by the Role Manager? → A: **Tarball Install**: The process will use the `pack-ui-builder.sh` script to create a local `.tgz` tarball and install it via a `file:` reference in `package.json`.
- Q: What should act as the logo in the Sidebar? → A: **UI Builder Default**: Import and use the default logo/icon component provided by the UI Builder package to avoid external asset dependencies.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View Application Base Layout (Priority: P1)

As a user, I want to see a consistent application layout with navigation and header so that I can orient myself within the application.

**Why this priority**: This establishes the visual foundation and navigation structure for the entire application.

**Independent Test**: Launch the application and visually verify the presence and placement of the Sidebar and Header components.

**Acceptance Scenarios**:

1. **Given** the application is running, **When** the user loads the landing page, **Then** the Sidebar is visible on the left side with the default UI Builder logo and "Home" link.
2. **Given** the application is running, **When** the user loads the landing page, **Then** the Header is visible at the top displaying "Role Manager".
3. **Given** the layout is rendered, **When** the user observes the styling, **Then** it matches the design system provided by the UI Builder package (colors, spacing, typography).

---

### User Story 2 - Developer Setup with Local Packages (Priority: P1)

As a developer, I want to use the local UI Builder packages so that I can develop the Role Manager with the latest shared UI components.

**Why this priority**: Critical for maintaining consistency between the Role Manager and UI Builder repositories and enabling local development.

**Independent Test**: Run the build process using the pack script and verify successful compilation.

**Acceptance Scenarios**:

1. **Given** a local development environment, **When** the `pack-ui-builder.sh` script is executed, **Then** the UI Builder packages are available for the Role Manager to consume.
2. **Given** the packages are packed, **When** the Role Manager is started, **Then** it successfully imports and uses components from the UI Builder package (installed via local `.tgz`).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST import and utilize the UI component package from the UI Builder monorepo.
- **FR-002**: System MUST import and apply the Tailwind CSS configuration/theme from the UI Builder to ensure visual consistency.
- **FR-003**: System MUST implement a persistent Sidebar component for navigation containing:
    - The default logo component imported from the UI Builder package.
    - A single navigation item labeled "Home".
- **FR-004**: System MUST implement a persistent Header component displaying the application name "Role Manager".
- **FR-005**: System MUST include a Main Content container that renders the active route's content (initially empty or placeholder).
- **FR-006**: System MUST utilize the `@role-manager/scripts/pack-ui-builder.sh` script to create and install local package tarballs (`.tgz`) for UI Builder dependencies.

### Key Entities *(include if feature involves data)*

- **N/A**: This feature is purely presentational and structural.

### Edge Cases

- **EC-001**: **Mobile Viewport**: How does the layout handle small screens?
  - *Requirement*: The Sidebar should collapse or become a drawer on mobile breakpoints to avoid obscuring content.
- **EC-002**: **Missing Packages**: What happens if the local package script hasn't run?
  - *Requirement*: The build should fail with a clear error message indicating the dependency is missing, or the setup instructions should cover this.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Application compiles and runs successfully with 0 import errors related to UI Builder packages.
- **SC-002**: The application layout renders the Sidebar (with default logo/Home link), Header (with App Name), and Main Content area correctly across standard viewport sizes.
- **SC-003**: UI styling (colors, fonts) visually matches the UI Builder's design system as defined in the imported package.
