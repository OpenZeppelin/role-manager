# Quickstart: Access Control Hooks

How to use the Access Control service and hooks in components.

## 1. Feature Detection

```tsx
import { useContractCapabilities } from '@/hooks/useContractCapabilities';

function MyComponent({ address }) {
  const { capabilities, isLoading } = useContractCapabilities(address);

  if (isLoading) return <Spinner />;

  return (
    <div>
      {capabilities.hasAccessControl && <RolesTab />}
      {capabilities.hasOwnable && <OwnershipTab />}
    </div>
  );
}
```

## 2. Reading Data

```tsx
import { useContractOwnership, useContractRoles } from '@/hooks/useContractData';

function RolesList({ address }) {
  const { roles } = useContractRoles(address);

  return (
    <ul>
      {roles.map((r) => (
        <li key={r.role.id}>
          {r.role.label}: {r.members.length} members
        </li>
      ))}
    </ul>
  );
}
```

## 3. Mutations

```tsx
import { useGrantRole } from '@/hooks/useAccessControlMutations';

function GrantButton({ address, roleId }) {
  const { mutate, isPending } = useGrantRole();

  const handleGrant = () => {
    mutate({
      contractAddress: address,
      roleId,
      account: '0x...',
      executionConfig: { method: 'eoa' }, // or from context
    });
  };

  return (
    <Button onClick={handleGrant} disabled={isPending}>
      Grant Role
    </Button>
  );
}
```
