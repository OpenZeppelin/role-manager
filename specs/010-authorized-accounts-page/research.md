# Research: Authorized Accounts Page Layout

**Feature**: 010-authorized-accounts-page  
**Date**: 2025-12-07

## Overview

Research findings for the Authorized Accounts page UI skeleton. Since this is a presentation-only feature with mock data, research focuses on component patterns, design consistency, and reuse opportunities.

## Research Tasks

### 1. Existing Component Patterns

**Task**: Analyze Roles page components for reusable patterns

**Findings**:

- **RolesLoadingSkeleton**: Uses `Skeleton` component with shimmer animation, wraps in Card, provides aria attributes for accessibility
- **AccountRow** (in Roles): Simple presentational component with address, badge, action button
- **Pattern**: Feature components live in dedicated folder with barrel export via `index.ts`
- **State management**: Page holds selection state, passes handlers to components

**Decision**: Follow identical structure - create `components/AuthorizedAccounts/` with index.ts barrel export

**Rationale**: Consistency with existing codebase, familiar patterns for contributors

**Alternatives considered**:

- Inline components in page file: Rejected - reduces reusability
- Generic table component: Rejected - over-engineering for this scope

---

### 2. UI Builder Package Components

**Task**: Verify available components from `@openzeppelin/ui-builder-ui`

**Findings**:

**UI Primitives** (from `components/ui/`):

- ✅ `Button` - Primary and outline variants
- ✅ `Card`, `CardContent` - Table container
- ✅ `Checkbox` - Row selection (Radix-based with accessibility)
- ✅ `Input` - Raw input element
- ✅ `Select` family - Raw select primitives (Radix-based)
- ✅ `DropdownMenu` family - Actions menu (Radix-based)

**Field Components** (from `components/fields/`):

- `TextField` - Form-integrated text input with label, validation, error handling
- `SelectField` - Form-integrated select with label, validation, error handling
- **Note**: These require React Hook Form's `control` prop and are designed for form submission scenarios

**For Filter Bar**:

- Use raw `Input` primitive (not `TextField`) - no form submission, no validation needed
- Use raw `Select` primitives (not `SelectField`) - simple state-driven filtering

Components NOT available (need local implementation):

- ❌ Table primitives - Need custom implementation
- ❌ Badge component - Need local StatusBadge/RoleBadge

**Decision**:

- Use raw UI primitives (`Input`, `Select`) for filter bar - appropriate for non-form UI
- Use Field components (`TextField`, `SelectField`) only when React Hook Form integration is needed
- Create minimal local components for Table and Badges

**Rationale**:

- Raw primitives are simpler for stateful UI without form submission
- Field components add unnecessary complexity (labels, validation, error states) for a filter bar
- Maximizes reuse per constitution principle II while choosing appropriate abstraction level

---

### 3. Badge Styling Patterns

**Task**: Determine styling for status and role badges

**Findings**:

- Existing `FeatureBadge` in Shared uses rounded-full pill style
- Status colors from spec clarifications: Active (green), Expired (red), Pending (yellow)
- Role badges should be neutral/gray to distinguish from status

**Decision**:

- StatusBadge: Colored background with white text (green-500, red-500, yellow-500)
- RoleBadge: Gray outline style (`border border-gray-300 text-gray-700`)

**Rationale**: Visual distinction between status (actionable state) and roles (informational)

**Alternatives considered**:

- All badges same style with icons: Rejected - harder to scan at glance
- Custom colors per role: Rejected - over-engineering, roles are dynamic

---

### 4. Table Layout Approach

**Task**: Determine table implementation strategy

**Findings**:

- HTML table semantics provide best accessibility for tabular data
- Tailwind's `@apply` not needed - inline classes work well
- Need sticky header for scrolling (future enhancement)

**Decision**: Use native `<table>` elements with Tailwind classes for styling

**Rationale**:

- Semantic HTML for screen readers
- Simple, maintainable implementation
- Matches expectation from spec (data table)

**Alternatives considered**:

- Div-based grid layout: Rejected - loses table semantics/accessibility
- Third-party table library (TanStack): Rejected - overkill for mock data skeleton

---

### 5. Selection State Management

**Task**: Determine how to handle checkbox selection

**Findings**:

- Need local state for selected row IDs
- Master checkbox needs "indeterminate" state when partial selection
- No business logic needed - just visual state

**Decision**:

- `useState<Set<string>>` for selected IDs in page component
- Pass `isSelected` and `onToggle` to AccountRow
- Derive master checkbox state from set size vs total

**Rationale**: Simple React state sufficient for UI skeleton; easy to wire to real logic later

---

### 6. Filter State Management

**Task**: Determine filter state approach

**Findings**:

- Three filter values: searchQuery, statusFilter, roleFilter
- Filters should be controlled components
- No actual filtering needed (mock data always shown)

**Decision**: Single filter state object in page, logger.info on changes

**Rationale**: Demonstrates component wiring without business logic complexity

---

## Summary of Decisions

| Area                 | Decision                                                            |
| -------------------- | ------------------------------------------------------------------- |
| Component structure  | Feature folder with barrel export                                   |
| UI package usage     | Maximum reuse (Button, Card, Checkbox, Input, Select, DropdownMenu) |
| Table implementation | Native HTML table with Tailwind                                     |
| Badge styling        | StatusBadge (colored), RoleBadge (gray outline)                     |
| Selection state      | useState with Set<string>                                           |
| Filter state         | Single state object, logger.info handlers                           |

## Unresolved Items

None - all clarifications addressed in spec, all technical decisions made.
