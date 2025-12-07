# Quickstart: Roles Page Real Data Integration

**Branch**: `009-roles-page-data` | **Date**: 2025-12-07

## Prerequisites

- Node.js 20+
- pnpm 8+
- Access to `contracts-ui-builder` monorepo (for local development)
- A Stellar testnet contract with AccessControl/Ownable capabilities (for testing)

## Setup

### 1. Clone and Install

```bash
git clone <repo-url>
cd role-manager
git checkout 009-roles-page-data
pnpm install
```

### 2. Local UI Builder Development (Optional)

If making changes to UI Builder packages:

```bash
# In contracts-ui-builder repo
pnpm install
pnpm build

# Pack tarballs for local development
./scripts/pack-ui-builder.sh

# In role-manager repo
./scripts/setup-local-dev.cjs
pnpm install
```

### 3. Start Development Server

```bash
pnpm dev
```

Open http://localhost:5173 in your browser.

## Development Workflow

### Running Tests

```bash
# All tests
pnpm test

# Watch mode (recommended during development)
pnpm test:watch

# Specific test file
pnpm test src/hooks/__tests__/useCustomRoleDescriptions.test.tsx
```

### Type Checking

```bash
pnpm typecheck
```

### Linting

```bash
pnpm lint
```

## Key Files to Modify

### Storage Layer (Phase 1)

```
apps/role-manager/src/
├── types/storage.ts              # Add CustomRoleDescriptions type
└── core/storage/
    ├── RecentContractsStorage.ts # Add description methods
    └── __tests__/
        └── RecentContractsStorage.test.ts # Add tests
```

### Hooks (Phases 2-3)

```
apps/role-manager/src/hooks/
├── useCustomRoleDescriptions.ts  # NEW: Custom descriptions CRUD
├── useRolesPageData.ts           # NEW: Data orchestration
└── __tests__/
    ├── useCustomRoleDescriptions.test.tsx
    └── useRolesPageData.test.tsx
```

### Components (Phases 4-6)

```
apps/role-manager/src/components/Roles/
├── EditableDescription.tsx       # NEW: Inline editing
├── RolesLoadingSkeleton.tsx      # NEW: Loading state
├── RolesErrorState.tsx           # NEW: Error state
├── RolesEmptyState.tsx           # NEW: Empty state
├── RoleCard.tsx                  # UPDATE: Real data props
├── RolesList.tsx                 # UPDATE: Real data props
├── RoleDetails.tsx               # UPDATE: Add description editing
├── AccountRow.tsx                # UPDATE: Real member data
├── RoleIdentifiersTable.tsx      # UPDATE: Real identifiers
└── index.ts                      # UPDATE: Export new components
```

### Page Integration (Phase 7)

```
apps/role-manager/src/pages/
└── Roles.tsx                     # UPDATE: Wire to useRolesPageData
```

## TDD Approach

For hooks and storage methods, follow TDD:

```bash
# 1. Create test file with failing tests
vim src/hooks/__tests__/useCustomRoleDescriptions.test.tsx

# 2. Run tests (should fail)
pnpm test src/hooks/__tests__/useCustomRoleDescriptions.test.tsx

# 3. Implement hook
vim src/hooks/useCustomRoleDescriptions.ts

# 4. Run tests (should pass)
pnpm test src/hooks/__tests__/useCustomRoleDescriptions.test.tsx
```

## Testing with Real Data

### 1. Add a Contract

1. Open the app at http://localhost:5173
2. Click "Add Contract" in the sidebar
3. Select Stellar ecosystem
4. Enter a contract ID with AccessControl (e.g., from testnet)
5. Wait for schema loading and capability detection

### 2. Navigate to Roles Page

1. Select the contract from the sidebar
2. Click "Roles" in the navigation
3. Verify roles load from the adapter
4. Test description editing by clicking on a role description

### Test Contract Examples

For Stellar testnet contracts with OpenZeppelin AccessControl:

- See UI Builder test contracts or deploy your own using Stellar CLI

## Common Issues

### "Access control service not available"

- Ensure the adapter is loaded (check network selection)
- Verify the contract has AccessControl or Ownable interfaces
- Check console for adapter loading errors

### Description not persisting

- Check IndexedDB in browser DevTools (Application tab)
- Verify contract record ID is correct
- Check for storage quota errors

### Type errors after updating props

- Run `pnpm typecheck` to see full error list
- Ensure all component usages are updated
- Check that adapter types are imported correctly

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      Roles.tsx (Page)                       │
└─────────────────────────────┬───────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   useRolesPageData (Hook)                   │
│  Orchestrates all data fetching and state management        │
└───────┬──────────┬──────────┬──────────┬────────────────────┘
        │          │          │          │
        ▼          ▼          ▼          ▼
┌───────────┐ ┌───────────┐ ┌───────────┐ ┌────────────────────┐
│ useCaps   │ │ useRoles  │ │useOwner   │ │useCustomDescs      │
│ (spec006) │ │ (spec006) │ │ (spec006) │ │(spec009 - NEW)     │
└─────┬─────┘ └─────┬─────┘ └─────┬─────┘ └──────────┬─────────┘
      │             │             │                  │
      └─────────────┴─────────────┴──────────────────┤
                              │                      │
                              ▼                      ▼
              ┌──────────────────────────┐  ┌───────────────────┐
              │  AccessControlService    │  │ IndexedDB Storage │
              │  (from Adapter)          │  │ (Dexie)           │
              └──────────────────────────┘  └───────────────────┘
```

## Next Steps

After completing this feature:

1. Run full test suite: `pnpm test`
2. Run type check: `pnpm typecheck`
3. Run linter: `pnpm lint`
4. Create PR using conventional commit format
