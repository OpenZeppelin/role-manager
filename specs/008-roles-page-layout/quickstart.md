# Quickstart: Roles Page Layout Skeleton

**Feature**: 008-roles-page-layout  
**Time to implement**: ~2-3 hours

## Prerequisites

- Node.js 18+
- pnpm installed
- UI Builder packages packed (see main README)

## Setup

```bash
# From repo root
cd /Users/ghost/dev/repos/OpenZeppelin/role-manager

# Ensure on feature branch
git checkout 008-roles-page-layout

# Install dependencies
pnpm install

# Start dev server
pnpm --filter @openzeppelin/role-manager-app dev
```

## Implementation Order

### Step 1: Create Types (5 min)

Create `apps/role-manager/src/types/roles.ts`:

```typescript
// Copy interfaces from contracts/components.ts:
// - Role
// - RoleAccount
// - RoleIdentifier
```

### Step 2: Create Mock Data (10 min)

Create `apps/role-manager/src/components/Roles/mockData.ts`:

```typescript
import { Role, RoleAccount, RoleIdentifier } from '../../types/roles';

export const MOCK_CURRENT_USER = '0x742d35Cc8A30E9f4C4B4d8b6E9B6E3A5C4b4d8b6';

export const mockRoles: Role[] = [
  {
    id: 'OWNER_ROLE',
    name: 'Owner',
    description: 'Full administrative access to contract (single account only)',
    memberCount: 1,
    isOwnerRole: true,
  },
  // ... add remaining roles
];

export const mockRoleAccounts: Record<string, RoleAccount[]> = {
  OWNER_ROLE: [{ address: MOCK_CURRENT_USER, assignedAt: '', isCurrentUser: true }],
  // ... add remaining accounts
};

export const mockRoleIdentifiers: RoleIdentifier[] = [
  { identifier: 'OWNER_ROLE', name: 'Owner', description: '...' },
  // ... add remaining identifiers
];
```

### Step 3: Create Components (60-90 min)

Create in order (each depends on previous):

1. **SecurityNotice.tsx** - Static warning banner
2. **RoleIdentifiersTable.tsx** - Read-only table
3. **AccountRow.tsx** - Uses AddressDisplay from UI Builder
4. **RoleCard.tsx** - Uses Card from UI Builder
5. **RoleDetails.tsx** - Composes AccountRow
6. **RolesList.tsx** - Composes RoleCard
7. **index.ts** - Barrel export

### Step 4: Update Roles Page (15 min)

Update `apps/role-manager/src/pages/Roles.tsx`:

```typescript
import { useState } from 'react';
import { PageHeader } from '../components/Shared/PageHeader';
import {
  RolesList,
  RoleDetails,
  RoleIdentifiersTable,
  SecurityNotice,
} from '../components/Roles';
import { mockRoles, mockRoleAccounts, mockRoleIdentifiers } from '../components/Roles/mockData';

export function Roles() {
  const [selectedRoleId, setSelectedRoleId] = useState('OWNER_ROLE');

  const selectedRole = mockRoles.find(r => r.id === selectedRoleId)!;
  const accounts = mockRoleAccounts[selectedRoleId] || [];

  return (
    <div className="p-6 space-y-6">
      <PageHeader title="Roles" subtitle={...} />

      <div className="flex gap-6">
        <RolesList ... />
        <RoleDetails ... />
      </div>

      <RoleIdentifiersTable identifiers={mockRoleIdentifiers} />
      <SecurityNotice />
    </div>
  );
}
```

## Verification

After implementation, verify:

- [ ] All 8 role cards render in left panel
- [ ] Clicking a role card updates right panel
- [ ] Owner role selected by default
- [ ] Owner role shows Crown icon (others show Shield), "Connected" badge when applicable
- [ ] Owner role shows "Transfer Ownership" button
- [ ] Non-owner roles show "+ Assign" and "Revoke" buttons
- [ ] Address copy button works
- [ ] "You" badge appears for current user address
- [ ] Role identifiers table shows all 8 roles
- [ ] Security notice displays at bottom

## Key Files Reference

| File                      | Purpose                   |
| ------------------------- | ------------------------- |
| `contracts/components.ts` | Component prop interfaces |
| `data-model.md`           | Type definitions          |
| `research.md`             | Technical decisions       |
| `plan.md`                 | Full implementation plan  |

## Troubleshooting

### UI Builder components not found

Ensure packages are packed and installed:

```bash
cd ../contracts-ui-builder
pnpm pack:all
cd ../role-manager
pnpm install
```

### Styles not applying

Verify Tailwind is processing the component files—check `tailwind.config.cjs` includes the Roles folder in content paths.
