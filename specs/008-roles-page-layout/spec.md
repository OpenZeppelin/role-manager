# Feature Specification: Roles Page Layout Skeleton

**Feature Branch**: `008-roles-page-layout`  
**Created**: 2025-12-05  
**Status**: Draft  
**Input**: User description: "Roles Page layout skeleton. No real business logic, only components with mock data. Make sure components are re-usable, where possible import from UI package from the UI Builder monorepo."

## Overview

This specification defines a static UI skeleton for the Roles page in the Open Role Manager application. The page displays a list of roles and their assigned accounts, allowing users to visually browse role information. This implementation focuses on reusable components with mock data—no real blockchain interactions or business logic.

## Clarifications

### Session 2025-12-05

- Q: Where should new reusable components created for this feature be placed? → A: Local to role-manager app (`apps/role-manager/src/components/Roles/`)

## User Scenarios & Testing _(mandatory)_

### User Story 1 - View Available Roles (Priority: P1)

A contract administrator navigates to the Roles page to see all roles defined for the selected contract. They can browse the list of roles (Owner, Operator, Minter, Viewer, Burner, Pauser, Transfer) and see basic information like member count and description for each role.

**Why this priority**: The primary purpose of the page is to display roles. Without this, the page has no value.

**Independent Test**: Can be fully tested by navigating to the Roles page and verifying all role cards render with correct mock data (name, member count, description).

**Acceptance Scenarios**:

1. **Given** the user is on the Roles page, **When** the page loads, **Then** a scrollable list of role cards is displayed on the left side of the page
2. **Given** the page has loaded, **When** the user views the role cards, **Then** each card shows the role name, member count, and description
3. **Given** multiple roles exist, **When** the user scrolls the roles list, **Then** all roles are accessible via scrolling

---

### User Story 2 - Select and View Role Details (Priority: P1)

A contract administrator clicks on a role card to view detailed information about that role in the right panel, including the list of assigned accounts with their addresses.

**Why this priority**: Equally critical to P1 as viewing role details is the core interaction pattern of the page.

**Independent Test**: Can be tested by clicking on different role cards and verifying the details panel updates to show the selected role's name, description, and assigned accounts.

**Acceptance Scenarios**:

1. **Given** the Roles page is displayed, **When** the user clicks on a role card, **Then** the right panel updates to show that role's details
2. **Given** a role is selected, **When** viewing the details panel, **Then** the role name, description, and assigned accounts list are displayed
3. **Given** the Owner role is selected, **When** viewing the details, **Then** a "Transfer Ownership" action button is shown for the assigned account
4. **Given** a non-Owner role is selected, **When** viewing the details, **Then** "Revoke" action buttons and an "+ Assign" button are shown

---

### User Story 3 - View Role Identifiers Reference (Priority: P2)

A contract administrator scrolls down to view the "Available Role Identifiers" reference table to understand all available role identifiers in the system with their names and descriptions.

**Why this priority**: This is supplementary information that helps users understand the system but is not required for the core role management workflow.

**Independent Test**: Can be tested by scrolling to the bottom section and verifying the role identifiers table displays all roles with their identifier, name, and description columns.

**Acceptance Scenarios**:

1. **Given** the user is on the Roles page, **When** they scroll to the bottom, **Then** an "Available Role Identifiers" section is visible
2. **Given** the role identifiers section is visible, **When** the user views the table, **Then** columns for Role Identifier, Name, and Description are shown
3. **Given** the table is displayed, **When** viewing the content, **Then** all standard role identifiers (OWNER_ROLE, OPERATOR_ROLE, MINTER_ROLE, etc.) are listed

---

### User Story 4 - Copy Account Address (Priority: P2)

A user viewing the assigned accounts for a role wants to copy an account address to their clipboard for use elsewhere.

**Why this priority**: Useful utility feature but not essential for the core layout skeleton.

**Independent Test**: Can be tested by clicking the copy button next to any account address and verifying the copy interaction is triggered.

**Acceptance Scenarios**:

1. **Given** a role with assigned accounts is selected, **When** the user clicks the copy icon next to an address, **Then** a copy-to-clipboard action is triggered (mock implementation)

---

### User Story 5 - View Security Notice (Priority: P3)

A user scrolls to the bottom of the page to read important security information about role assignments.

**Why this priority**: Important for production but static content that doesn't require complex UI logic.

**Independent Test**: Can be tested by scrolling to the bottom and verifying the security notice is displayed with the correct warning message.

**Acceptance Scenarios**:

1. **Given** the user is on the Roles page, **When** they scroll to the bottom, **Then** a Security Notice banner is displayed
2. **Given** the Security Notice is visible, **When** the user reads it, **Then** important warnings about role assignments and the Owner role are shown

---

### Edge Cases

- What happens when a role has no assigned accounts? Display "0 members" in the card and an empty state in the details panel showing "No accounts assigned to this role" (text-muted-foreground, centered, py-8)
- What happens when the connected user is an assigned account? Display a "You" badge next to their address
- What happens when the Owner role is selected? Display "Transfer Ownership" button instead of "Revoke" buttons
- What happens when a role card is in selected state? Display a highlighted border (border-primary, 2px) to indicate selection

## Requirements _(mandatory)_

### Functional Requirements

#### Page Layout

- **FR-001**: Page MUST display a page title "Roles" with a dynamic subtitle showing the contract name and network
- **FR-002**: Page MUST use a two-panel layout with a roles list on the left (~40% width, max 480px) and role details on the right (~60% width, flexible)
- **FR-002a**: Panels MUST be separated by a 24px (1.5rem) gap
- **FR-003**: Page MUST display the "Available Role Identifiers" reference section below the two-panel layout
- **FR-004**: Page MUST display a Security Notice banner at the bottom of the page
- **FR-004a**: Page sections MUST be separated by 24px (1.5rem) vertical spacing

#### Roles List (Left Panel)

- **FR-005**: Roles list MUST display scrollable role cards in a vertical list with max-height of `calc(100vh - 300px)` and overflow-y auto
- **FR-005a**: Role cards MUST be separated by 8px (0.5rem) vertical gap
- **FR-006**: Each role card MUST display: role name (font-semibold), member count (text-sm text-muted), and description (text-sm text-muted)
- **FR-007**: The Owner role card MUST display a crown icon (`Crown` from lucide-react) and a "Connected" badge when the user is the owner
- **FR-007a**: Role icons MUST use lucide-react: Owner=`Crown` (from Ownable interface), all other roles=`Shield` (generic icon since roles are developer-defined)
- **FR-008**: The selected role card MUST display a highlighted border (`border-primary`, 2px, blue-600) to indicate selection
- **FR-009**: The first role (Owner) MUST be selected by default when the page loads

#### Role Details (Right Panel)

- **FR-010**: Role details panel MUST display the selected role's name with appropriate icon (Crown for Owner, Shield for others per FR-007a)
- **FR-011**: Role details panel MUST display the role description
- **FR-012**: Role details panel MUST display an "Assigned Accounts" section with a count header (e.g., "Assigned Accounts (3)")
- **FR-013**: For Owner role: MUST display a "Transfer Ownership" action button for the assigned account
- **FR-014**: For non-Owner roles: MUST display an "+ Assign" button in the header area
- **FR-015**: For non-Owner roles: MUST display "Revoke" action buttons for each assigned account

#### Account Row

- **FR-016**: Each account row MUST display a truncated address using `AddressDisplay` with startChars=10, endChars=7 (e.g., "0x742d35Cc...C4b4d8b6")
- **FR-017**: Each account row MUST include a copy-to-clipboard button via `AddressDisplay` with `showCopyButton={true}`
- **FR-017a**: Copy action MUST show inline visual feedback (checkmark icon for 2 seconds) provided by `AddressDisplay` component
- **FR-018**: Account rows for the current user MUST display a "You" badge (bg-primary/10, text-primary, rounded-full, px-2, text-xs)
- **FR-019**: Account rows for non-Owner roles MUST display the assignment date (text-sm, text-muted-foreground, format: M/D/YYYY)
- **FR-020**: Account rows MUST display role-appropriate action buttons (Transfer Ownership or Revoke)

#### Role Identifiers Table

- **FR-021**: Table MUST display columns: Role Identifier, Name, Description
- **FR-022**: Table MUST include rows for all 8 standard role identifiers: OWNER_ROLE (Owner), OPERATOR_ROLE (Operator), MINTER_ROLE (Minter), BURNER_ROLE (Burner), PAUSER_ROLE (Pauser), VIEWER_ROLE (Viewer), TRANSFER_ROLE (Transfer), APPROVE_ROLE (Approver)
- **FR-023**: Table MUST be read-only (no interactive elements)

#### Security Notice

- **FR-024**: Security Notice MUST display with a warning icon (`AlertTriangle` from lucide-react) and amber styling (bg-amber-50, border-amber-200, text-amber-800)
- **FR-025**: Security Notice MUST include text about transaction confirmation requirements and Owner role privileges

#### Reusability & Integration

- **FR-026**: Components MUST be designed for reusability across the application
- **FR-027**: Shared UI components MUST be imported from the UI Builder monorepo packages where available
- **FR-028**: New components created for this feature MUST be placed in `apps/role-manager/src/components/Roles/`
- **FR-028a**: Components MUST be exported via barrel file `components/Roles/index.ts`
- **FR-029**: All data displayed MUST use mock/static data (no real blockchain calls)
- **FR-029a**: Since mock data is static, no loading states are required; components render immediately
- **FR-030**: Interactive buttons (Assign, Revoke, Transfer Ownership) MUST be rendered but non-functional (visual only)
- **FR-030a**: Action buttons MUST accept optional callback props (`onAssign?: () => void`, `onRevoke?: (address: string) => void`, `onTransferOwnership?: () => void`) for future integration
- **FR-030b**: Component prop interfaces MUST be documented in `contracts/components.ts` with TypeScript types

### Key Entities

- **Role**: Represents a permission role with identifier, name, description, and member count
- **Account**: Represents a blockchain account with address, assignment date, and relationship to current user
- **RoleIdentifier**: Reference data mapping role identifiers to human-readable names and descriptions

## Assumptions

- Mock data will be hardcoded directly in components or imported from a local mock data file
- The existing layout structure (sidebar, header, network selector) from the application will be reused
- Components will follow the existing design system and Tailwind styling conventions used in the project
- The connected wallet address display in the header is handled by existing components
- Role icons are assumed to be from an existing icon library or can be simple placeholder icons

## Design Reference

Design screenshots for implementation validation:

- **Owner Role Selected**: `assets/screencapture-oz-oss-apps-access-manager-vercel-app-2025-12-05-20_51_11-*.png`
- **Operator Role Selected**: `assets/screencapture-oz-oss-apps-access-manager-vercel-app-2025-12-05-20_52_54-*.png`

These screenshots show the target visual design including layout proportions, typography, spacing, and color scheme.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: All 8 role cards render correctly with mock data when the page loads
- **SC-002**: Users can click any role card and the details panel updates within 100ms (local state change)
- **SC-003**: The page layout matches the provided design screenshots (see Design Reference section) with correct spacing, typography, and colors
- **SC-004**: All reusable components can be imported and used independently in other pages
- **SC-005**: The page renders correctly on standard desktop viewport sizes (1280px and above)
- **SC-006**: 100% of the required UI elements from the design are present and positioned correctly
