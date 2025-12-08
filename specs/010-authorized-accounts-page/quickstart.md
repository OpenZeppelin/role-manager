# Quickstart: Authorized Accounts Page Layout

**Feature**: 010-authorized-accounts-page  
**Date**: 2025-12-07

## Prerequisites

- Node.js 18+
- pnpm 8+
- Role Manager development environment set up

## Getting Started

### 1. Branch Setup

```bash
cd /path/to/role-manager
git checkout 010-authorized-accounts-page
pnpm install
```

### 2. Start Development Server

```bash
pnpm dev
```

Navigate to `http://localhost:5173` and select "Authorized Accounts" from the sidebar.

## File Locations

### New Files to Create

```
apps/role-manager/src/
├── components/AuthorizedAccounts/
│   ├── index.ts                    # Barrel exports
│   ├── AccountsTable.tsx           # Main table component
│   ├── AccountRow.tsx              # Table row component
│   ├── AccountsFilterBar.tsx       # Search and filter bar
│   ├── AccountsEmptyState.tsx      # Empty state component
│   ├── AccountsLoadingSkeleton.tsx # Loading skeleton
│   ├── StatusBadge.tsx             # Status indicator
│   ├── RoleBadge.tsx               # Role badge
│   ├── AccountActionsMenu.tsx      # Row actions dropdown
│   └── mockData.ts                 # Mock data and types
├── pages/AuthorizedAccounts.tsx    # UPDATE existing page
└── types/authorized-accounts.ts    # Type definitions
```

### Existing Files to Reference

```
apps/role-manager/src/
├── components/Roles/               # Reference patterns
│   ├── RolesLoadingSkeleton.tsx    # Loading skeleton pattern
│   ├── AccountRow.tsx              # Row component pattern
│   └── index.ts                    # Barrel export pattern
├── components/Shared/
│   ├── PageHeader.tsx              # Reuse directly
│   ├── EmptyState.tsx              # Reuse directly
│   ├── PageEmptyState.tsx          # Reuse directly
│   └── Skeleton.tsx                # Reuse directly
└── pages/Roles.tsx                 # Page integration pattern
```

## Component Implementation Order

### Phase 1: Foundation (Start Here)

1. **Types** (`types/authorized-accounts.ts`)
   - Define `AuthorizedAccount`, `AccountStatus`, `AccountsFilterState`
   - Export type configurations

2. **Mock Data** (`components/AuthorizedAccounts/mockData.ts`)
   - Create `MOCK_ACCOUNTS` array
   - Create `MOCK_AVAILABLE_ROLES` array

3. **AccountsEmptyState** (`components/AuthorizedAccounts/AccountsEmptyState.tsx`)
   - Wrap shared `EmptyState` component
   - Use `Users` icon from lucide-react
   - Props: `onGrantAuthorization` callback

4. **AccountsLoadingSkeleton** (`components/AuthorizedAccounts/AccountsLoadingSkeleton.tsx`)
   - Follow `RolesLoadingSkeleton` pattern
   - Include header, filter bar, and table skeletons

5. **Wire to Page** (`pages/AuthorizedAccounts.tsx`)
   - Add loading state toggle for demo
   - Show skeleton or empty state

### Phase 2: Table

6. **StatusBadge** (`components/AuthorizedAccounts/StatusBadge.tsx`)
   - Props: `status: AccountStatus`
   - Colors: active=green, expired=red, pending=yellow

7. **RoleBadge** (`components/AuthorizedAccounts/RoleBadge.tsx`)
   - Props: `role: string`
   - Gray outline style

8. **AccountActionsMenu** (`components/AuthorizedAccounts/AccountActionsMenu.tsx`)
   - Use `DropdownMenu` from UI package
   - Items: Edit Roles, Revoke Access, View Details

9. **AccountRow** (`components/AuthorizedAccounts/AccountRow.tsx`)
   - Checkbox, address, status badge, dates, role badges, actions
   - Address truncation: `0x1234...5678`

10. **AccountsTable** (`components/AuthorizedAccounts/AccountsTable.tsx`)
    - HTML table with header row
    - Master checkbox with indeterminate state
    - Map rows from accounts array

### Phase 3: Filters

11. **AccountsFilterBar** (`components/AuthorizedAccounts/AccountsFilterBar.tsx`)
    - Search input with magnifying glass icon
    - Status dropdown (All Status, Active, Expired, Pending)
    - Roles dropdown (All Roles + available roles)

12. **Final Integration**
    - Wire filter state to page
    - Console.log filter changes
    - Toggle between empty/populated views

## Key Patterns

### Importing UI Package Components

```typescript
// UI Primitives - use for filter bar (no form submission needed)
import {
  Button,
  Card,
  Checkbox,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Input, // Raw primitive, not TextField (which requires React Hook Form)
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue, // Raw primitives, not SelectField (which requires React Hook Form)
} from '@openzeppelin/ui-builder-ui';

// NOTE: TextField, SelectField from components/fields/ are for form submission
// scenarios with validation. For simple filter UI, use raw primitives above.
```

### Using Shared Components

```typescript
import { EmptyState, PageHeader, Skeleton } from '../Shared';
```

### Address Truncation

```typescript
function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
```

### Date Formatting

```typescript
function formatDate(date: Date | undefined): string {
  if (!date) return 'Never';
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
```

## Testing the Implementation

### Visual States to Verify

1. **Empty State**: No accounts, shows empty state with CTA
2. **Loading State**: Shows skeleton placeholders
3. **Populated State**: Shows table with mock data
4. **Selection**: Checkboxes toggle, master checkbox works
5. **Filters**: Dropdowns open/close, search accepts input
6. **Actions**: Dropdown menu shows 3 actions

### Logger Output Expected

Uses `logger.info` from `@openzeppelin/ui-builder-utils` (Constitution III compliant):

```
[INFO] [AuthorizedAccounts] Add Account or Role clicked
[INFO] [AuthorizedAccounts] Grant First Authorization clicked
[INFO] [AuthorizedAccounts] Filter changed: { searchQuery: "0x", statusFilter: "all", roleFilter: "all" }
[INFO] [AuthorizedAccounts] Action triggered: { accountId: "1", action: "edit-roles" }
[INFO] [AuthorizedAccounts] Selection changed: Set(2) { "1", "3" }
```

## Common Issues

### UI Package Not Found

Ensure local tarball is built and linked:

```bash
cd ../contracts-ui-builder
pnpm build:packages
cd ../role-manager
pnpm install
```

### Styles Not Applied

Check that Tailwind config includes the new component paths.

### Type Errors

Ensure all component props interfaces are exported from index.ts.
