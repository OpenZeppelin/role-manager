# Feature Specification: Authorized Accounts Page Layout

**Feature Branch**: `010-authorized-accounts-page`  
**Created**: 2025-12-07  
**Status**: Draft  
**Input**: User description: "Authorized Accounts page layout skeleton. No real business logic, only components with mock data. Make sure components are re-usable, where possible import from UI package from the UI Builder monorepo."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - View Empty Authorized Accounts Page (Priority: P1)

A user navigates to the Authorized Accounts page for a contract that has no authorized accounts yet. They see an informative empty state with a clear call-to-action to grant their first authorization.

**Why this priority**: This is the default state for new contracts and establishes the baseline page structure with header, filters, table layout, and empty state.

**Independent Test**: Can be fully tested by loading the page with no accounts data and verifying all structural elements render correctly - delivers immediate value by establishing page layout foundation.

**Acceptance Scenarios**:

1. **Given** the user is on the Authorized Accounts page, **When** no accounts exist for the selected contract, **Then** they see the page header with title "Authorized Accounts", subtitle showing contract name and network, and an "Add Account or Role" action button
2. **Given** the empty state is displayed, **When** the user views the page, **Then** they see a centered empty state with an icon, "No accounts found" title, descriptive text, and a "Grant First Authorization" button
3. **Given** the page is displayed, **When** the user views the filter section, **Then** they see a search input and dropdown filters for Status and Roles (UI shell only - functionality wired in US3)

---

### User Story 2 - View Populated Accounts Table (Priority: P2)

A user navigates to the Authorized Accounts page and sees a list of authorized accounts displayed in a table format with relevant information for each account.

**Why this priority**: Displays the core functionality of viewing authorized accounts in a tabular format with all data columns.

**Independent Test**: Can be tested by loading the page with mock account data and verifying the table renders all columns with correct mock data - demonstrates the complete table layout.

**Acceptance Scenarios**:

1. **Given** authorized accounts exist (mock data), **When** the user views the page, **Then** they see a table with columns: checkbox, Address, Status, Date Added, Expires, Roles, and Actions
2. **Given** the table contains accounts, **When** the user views an account row, **Then** they see the account address (truncated format), status badge, date added, expiration date (if applicable), assigned roles as badges, and action menu
3. **Given** the table is displayed, **When** the user views the table header, **Then** they see a master checkbox for bulk selection

---

### User Story 3 - Filter and Search Accounts (Priority: P3)

A user wants to filter the accounts list by searching for an address or filtering by status/role. The UI components are in place and ready for future business logic.

**Why this priority**: Establishes filter UI components that will be wired to business logic in a future spec.

**Independent Test**: Can be tested by verifying filter components render correctly and emit appropriate events when interacted with (mock handlers log interactions).

**Acceptance Scenarios**:

1. **Given** the filter bar is displayed, **When** the user types in the search input, **Then** the input accepts text and placeholder shows "Search by address or ENS..."
2. **Given** the filter bar is displayed, **When** the user clicks the Status dropdown, **Then** they see filter options (All Status, Active, Expired, Pending)
3. **Given** the filter bar is displayed, **When** the user clicks the Roles dropdown, **Then** they see filter options (All Roles, plus role names from mock data)

---

### Edge Cases

- What happens when the address is very long? Display truncated format (0x1234...5678)
- How does the system handle accounts with multiple roles? Display as multiple role badges
- What happens when expiration date is not set? Display "Never"
- How are status badges styled for different states? Active (green-500 bg), Expired (red-500 bg), Pending (yellow-500 bg) with white text
- What happens while data is loading? Display loading skeleton with shimmer placeholders matching table structure
- How is master checkbox behavior when partial selection? Display indeterminate state (dash icon)

### Visual Design Requirements

**Layout Hierarchy** (top to bottom):

1. **Page Header**: Title (h1, 2xl font), subtitle (sm, muted), action button (right-aligned)
2. **Filter Bar**: Card container with search input (left) + dropdowns (right), horizontal layout
3. **Data Table**: Card container, full-width, header row with master checkbox, body rows with data

**Badge Styling**:

- **StatusBadge**: Colored background (green-500/red-500/yellow-500) with white text, rounded-full, px-2 py-0.5, text-xs
- **RoleBadge**: Gray outline (`border border-gray-300 text-gray-700`), rounded-full, px-2 py-0.5, text-xs

**Empty State Layout**:

- Centered vertically and horizontally within Card
- Icon: `Users` from lucide-react, 48x48, muted color, in rounded bg-muted container
- Title: "No accounts found", font-semibold, text-sm
- Description: "No accounts have been authorized yet.", text-muted-foreground, text-sm
- CTA Button: Primary variant, includes Plus icon

**Loading Skeleton**:

- Matches table structure: header row + 4 data row skeletons
- Each row skeleton includes: checkbox placeholder, address (w-48), status badge (w-16), dates (w-24 each), roles (w-32), actions (w-8)
- Uses shimmer animation via `animate-pulse` class

**Interaction States**:

- Hover: Interactive elements show `hover:bg-accent` background transition
- Focus: Visible focus ring (`focus-visible:ring-2 ring-ring`) on all interactive elements
- Active: Buttons show `active:scale-95` subtle press effect
- Checkbox: Follows Radix UI Checkbox states (checked, unchecked, indeterminate)
- Dropdown triggers: Show chevron rotation on open state

**Responsive Breakpoints**:

- Desktop (lg: ≥1024px): Full table layout, all columns visible
- Tablet (md: 768-1023px): Table with horizontal scroll if needed, all columns visible
- Below tablet: Out of scope for this skeleton (future enhancement)

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: Page MUST display a header with title "Authorized Accounts", dynamic subtitle showing contract name and network, and an action button
- **FR-002**: Page MUST display a filter bar with search input and two dropdown filters (Status, Roles)
- **FR-003**: Page MUST display a data table with columns: Checkbox, Address, Status, Date Added, Expires, Roles, Actions
- **FR-004**: Page MUST display an empty state when no accounts are present, with icon, title, description, and CTA button
- **FR-005**: Table rows MUST be selectable via checkbox for bulk operations (UI only, no business logic); master checkbox MUST show indeterminate state when partial selection
- **FR-006**: Address column MUST display addresses in truncated format (0x1234...5678)
- **FR-007**: Status column MUST display a badge component with appropriate styling per status
- **FR-008**: Roles column MUST support displaying multiple role badges per account
- **FR-009**: Actions column MUST contain a dropdown menu with: Edit Roles, Revoke Access, View Details (placeholder actions that log via `logger` from `@openzeppelin/ui-builder-utils`)
- **FR-010**: Components MUST be re-usable and where possible imported from the UI Builder UI package
- **FR-011**: Page MUST display a loading skeleton with shimmer placeholders for table rows while data is loading
- **FR-012**: All interactive elements MUST have visible hover, focus, and active states per Visual Design Requirements
- **FR-013**: Components MUST use Tailwind CSS classes and the `cn` utility for class composition

### Key Entities _(include if feature involves data)_

- **AuthorizedAccount**: Represents an account with address, status, dateAdded, expiresAt (optional), roles (array), and selection state
- **AccountStatus**: Enum representing possible statuses - Active, Expired, Pending
- **FilterState**: Represents current filter values - searchQuery, statusFilter, roleFilter

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: All page structural elements (header, filters, table, empty state) render correctly within 2 seconds of page load
- **SC-002**: Page maintains consistent visual appearance with the Roles page and Dashboard
- **SC-003**: Components follow established design patterns and re-use existing UI components where available
- **SC-004**: Mock data demonstrates all visual states (multiple statuses, multiple roles, various address lengths)
- **SC-005**: Page is responsive and maintains usability on desktop (≥1024px) and tablet (768-1023px) per Visual Design Requirements breakpoints

## Clarifications

### Session 2025-12-07

- Q: What should users see while data is loading? → A: Show a loading skeleton (shimmer placeholders for table rows)
- Q: What actions should appear in the Actions dropdown menu? → A: Edit Roles, Revoke Access, View Details (3 actions)
- Q: What should display when an account has no expiration date? → A: Display "Never"

## Assumptions

- This is a UI skeleton spec; no real data fetching or business logic is implemented
- Mock data will be provided to demonstrate all visual states
- Components will follow existing patterns from the Roles page (008-roles-page-layout)
- The existing PageHeader, EmptyState, and PageEmptyState components will be re-used
- Filter interactions will log via `logger` (from `@openzeppelin/ui-builder-utils`) but not actually filter data (placeholder behavior)
- The "Add Account or Role" and "Grant First Authorization" buttons will log actions via `logger` but not open dialogs
