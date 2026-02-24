# Quickstart: EVM Access Control Integration

**Branch**: `017-evm-access-control` | **Date**: 2026-02-11

## Prerequisites

Before implementation:

1. **Upstream packages released**: Updated versions of `@openzeppelin/ui-types`, `@openzeppelin/ui-builder-adapter-evm`, and `@openzeppelin/ui-builder-adapter-stellar` must be published with:
   - New optional methods on `AccessControlService` (renounce, cancel, delay)
   - New capability flags on `AccessControlCapabilities`
   - Chain-agnostic `ExpirationMetadata` type
   - Both adapters updated to implement the extended interface

2. **Developer setup**:
   - WalletConnect project ID (get from [cloud.walletconnect.com](https://cloud.walletconnect.com))
   - Etherscan V2 API key (get from [etherscan.io](https://etherscan.io/apis))

## Setup Steps

### 1. Update Dependencies

```bash
cd apps/role-manager
pnpm update @openzeppelin/ui-types @openzeppelin/ui-builder-adapter-evm @openzeppelin/ui-builder-adapter-stellar
```

### 2. Configure Credentials

Add to `.env.local` (create if not exists):

```env
VITE_APP_CFG_SERVICE_ETHERSCANV2_API_KEY=your-etherscan-v2-api-key
```

Update `public/app.config.json` — add WalletConnect project ID:

```json
{
  "globalServiceConfigs": {
    "walletconnect": {
      "projectId": "your-walletconnect-project-id"
    },
    "walletui": {
      "stellar": { "kitName": "custom", "kitConfig": { "appName": "Role Manager" } },
      "evm": {
        "kitName": "custom",
        "kitConfig": { "components": { "exclude": ["NetworkSwitcher"] } }
      },
      "default": { "kitName": "custom", "kitConfig": {} }
    }
  }
}
```

### 3. Enable EVM Ecosystem

In `src/core/ecosystems/registry.ts`, change the EVM entry:

```typescript
// Before
[EcosystemId.EVM]: {
  defaultFeatureConfig: {
    enabled: false,
    disabledLabel: 'Coming Soon',
  },
  // ...
}

// After
[EcosystemId.EVM]: {
  defaultFeatureConfig: {
    enabled: true,
  },
  // ...
}
```

### 4. Verify Basic Integration

```bash
pnpm dev
```

1. Open the app in browser
2. Click "Add Contract" button
3. Verify EVM is selectable in the ecosystem selector
4. Select EVM, pick Sepolia network
5. Enter a verified contract address (e.g., an OpenZeppelin AccessControl contract on Sepolia)
6. Verify ABI is auto-fetched and capabilities are displayed
7. Connect MetaMask and verify wallet address shows in header

## Implementation Order

Follow this order to build incrementally with working checkpoints:

### Phase 1: Enable EVM (Checkpoint: EVM selectable, wallet connects)

**Files to modify**:

- `src/core/ecosystems/registry.ts` — enable EVM
- `public/app.config.json` — add walletconnect projectId
- `.env.example` — document Etherscan API key

**Test**: EVM appears in Add Contract dialog. Selecting it shows EVM networks. Wallet connects.

### Phase 2: Contract Loading (Checkpoint: verified contracts load)

**Files to modify**:

- `src/hooks/useContractSchemaLoader.ts` — integrate `adapter.loadContract(address)` for EVM
- `src/hooks/useContractForm.ts` — handle verification error states
- `src/components/Contracts/AddContractForm.tsx` — display verification errors

**Key integration point**: The existing `useContractSchemaLoader` already calls `adapter.loadContractWithMetadata(address)` which works for EVM. It returns `{ schema, source, metadata?, proxyInfo? }`. No ecosystem-specific branching needed.

```typescript
// useContractSchemaLoader already does this:
const result = await adapter.loadContractWithMetadata(artifacts);
// result.schema contains the ContractSchema (ABI) ready for registerContract()
// result.proxyInfo is populated when a proxy is detected
```

**Test**: Enter verified Sepolia address → ABI loads → capabilities shown. Enter unverified → clear error.

### Phase 3: Role Labels (Checkpoint: EVM roles show labels)

**Files to create**:

- `src/components/Shared/RoleHashDisplay.tsx` — truncated hash + copy

**Files to modify**:

- `src/components/Roles/RoleCard.tsx` — display `label` when present
- `src/utils/role-name.ts` — handle label/hash display

**Pattern**: The adapter returns `RoleIdentifier.label` pre-resolved. The UI simply checks:

```typescript
// In role display:
const displayName = role.label ?? truncateHash(role.id);
```

**Test**: EVM AccessControl contract → roles show "Minter", "Pauser", etc. Unknown roles show `0x9f2d...` with copy button.

### Phase 4: Chain-Agnostic Expiration (Checkpoint: transfer dialogs adapt to ecosystem)

**Files to create**:

- `src/utils/expiration.ts` — formatting utilities

**Files to modify**:

- `src/hooks/useOwnershipTransferDialog.ts` — conditional expiration
- `src/hooks/useAdminTransferDialog.ts` — conditional expiration
- `src/components/Ownership/TransferOwnershipDialog.tsx` — conditional UI
- `src/components/Admin/TransferAdminDialog.tsx` — conditional UI
- `src/components/Roles/PendingTransferInfo.tsx` — adapter labels
- `src/components/Dashboard/PendingTransferRow.tsx` — adapter labels
- `src/hooks/useCurrentBlock.ts` — adapt polling
- `src/hooks/usePendingTransfers.ts` — include metadata

**Pattern**: Query `service.getExpirationMetadata(address, 'ownership')` to decide UI behavior:

```typescript
const metadata = await service.getExpirationMetadata?.(address, 'ownership');

switch (metadata?.mode) {
  case 'required':
    // Show expiration input with metadata.label
    break;
  case 'none':
    // No expiration input
    break;
  case 'contract-managed':
    // Show info-only display with metadata.currentValue
    break;
}
```

**Hardcoded string removal**: Search for these patterns and replace with adapter-driven labels:

- `"expiration ledger"` → `metadata.label ?? "Expiration"`
- `"Expiration Ledger"` → `metadata.label ?? "Expiration"`
- `"expirationBlock"` in display strings → use metadata

**Test**: Stellar transfer shows "Expiration Ledger" input. EVM Ownable2Step shows no expiration. EVM admin shows accept schedule info.

### Phase 5: Renounce Operations (Checkpoint: renounce works)

**Files to create**:

- `src/components/Shared/TypeToConfirmDialog.tsx`
- `src/hooks/useRenounceDialog.ts`

**Files to modify**:

- `src/hooks/useAccessControlMutations.ts` — add `useRenounceOwnership`, `useRenounceRole`
- `src/components/Roles/RoleDetails.tsx` — add "Renounce Ownership" button
- `src/components/Roles/AccountRow.tsx` — add "Renounce Role" button

**TypeToConfirmDialog pattern**:

```typescript
interface TypeToConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  warningMessage: string;
  confirmKeyword: string;   // e.g., "RENOUNCE"
  confirmButtonLabel: string;
  isLoading: boolean;
}

// Usage:
<TypeToConfirmDialog
  open={isOpen}
  title="Renounce Ownership"
  description="This action permanently removes the owner from the contract."
  warningMessage="This is irreversible. The contract will have no owner."
  confirmKeyword="RENOUNCE"
  confirmButtonLabel="Renounce Ownership"
  isLoading={isPending}
  onConfirm={handleRenounce}
  onClose={handleClose}
/>
```

**Capability-driven rendering**:

```typescript
// In RoleDetails, for owner role:
const { data: capabilities } = useContractCapabilities(address);

{capabilities?.hasRenounceOwnership && isOwner && (
  <Button variant="destructive" onClick={openRenounceDialog}>
    Renounce Ownership
  </Button>
)}
```

**Test**: EVM Ownable contract → "Renounce Ownership" appears for owner → type "RENOUNCE" → tx executes → owner becomes null.

### Phase 6: Cancel & Delay (Checkpoint: admin management works)

**Files to create**:

- `src/components/Admin/AdminDelayPanel.tsx`
- `src/hooks/useCancelAdminTransferDialog.ts`
- `src/hooks/useAdminDelayDialog.ts`
- `src/types/admin.ts`

**Files to modify**:

- `src/hooks/useAccessControlMutations.ts` — add cancel/delay mutations
- `src/components/Roles/RoleDetails.tsx` — wire admin actions

**Test**: AccessControlDefaultAdminRules contract → initiate admin transfer → cancel → pending cleared. Change delay → pending delay shown → rollback.

### Phase 7: History (Checkpoint: new events display)

**Files to modify**:

- `src/types/role-changes.ts` — add new action types and mappings
- `src/components/RoleChanges/ChangeRow.tsx` — render new event labels
- `src/constants/roles.ts` — (if event labels needed here)

**Test**: Role Changes page shows renounce/cancel/delay events with correct labels and styling.

### Phase 8: Testing

**New test files**:

- `src/hooks/__tests__/useRenounceDialog.test.tsx`
- `src/hooks/__tests__/useCancelAdminTransferDialog.test.tsx`
- `src/hooks/__tests__/useAdminDelayDialog.test.tsx`
- `src/components/Shared/__tests__/TypeToConfirmDialog.test.tsx`
- `src/components/Shared/__tests__/RoleHashDisplay.test.tsx`

**Existing test updates**:

- `src/hooks/__tests__/useAccessControlMutations.test.tsx` — add new mutation tests
- `src/hooks/__tests__/useOwnershipTransferDialog.test.tsx` — expiration conditional tests
- `src/hooks/__tests__/usePendingTransfers.test.tsx` — metadata tests

```bash
pnpm test
```

## Key Patterns to Follow

### Capability-Driven Rendering

Always check capabilities before showing UI actions:

```typescript
// ✅ Correct
{capabilities?.hasRenounceOwnership && <RenounceButton />}

// ❌ Wrong — never check ecosystem
{ecosystem === 'evm' && <RenounceButton />}
```

### Mutation Hook Pattern

Follow the existing pattern in `useAccessControlMutations.ts`:

```typescript
export function useRenounceOwnership() {
  const { service } = useAccessControlService();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      contractAddress,
      executionConfig,
      onStatusChange,
    }: RenounceOwnershipParams) => {
      if (!service?.renounceOwnership) {
        throw new Error('Renounce ownership not supported');
      }
      return service.renounceOwnership(contractAddress, executionConfig, onStatusChange);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['contractOwnership', variables.contractAddress],
      });
    },
  });
}
```

### Dialog State Hook Pattern

Follow existing patterns (e.g., `useOwnershipTransferDialog`):

```typescript
export function useRenounceDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const renounceOwnership = useRenounceOwnership();

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => {
    setIsOpen(false);
    renounceOwnership.reset();
  }, [renounceOwnership]);

  const confirm = useCallback(
    async (contractAddress: string, executionConfig: ExecutionConfig) => {
      // ... execute mutation with onStatusChange callback
    },
    [renounceOwnership]
  );

  return { isOpen, open, close, confirm, isPending: renounceOwnership.isPending };
}
```

### Error Classification

Use existing error utilities in `utils/errors.ts`:

```typescript
// Wallet rejected → preserve form state, show retry
// Network error → show retry with network check message
// Contract revert → show specific error from adapter
```

## Common Pitfalls

1. **Don't import chain-specific types** — everything goes through `AccessControlService`
2. **Don't hardcode expiration labels** — always use adapter metadata
3. **Don't check ecosystem identity for feature toggling** — use capability flags
4. **Don't forget to invalidate queries after mutations** — every write operation must invalidate affected queries
5. **Don't skip the `?` check on optional methods** — `service.renounceOwnership?.()` or guard with `if (!service.renounceOwnership) { ... }`
6. **Don't forget existing Stellar regression** — every UI change must be tested with both ecosystems
