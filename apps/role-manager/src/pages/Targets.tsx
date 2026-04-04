/**
 * Targets Page
 * Feature: 018-access-manager
 *
 * Shows target-function-role mappings for AccessManager contracts.
 * Supports CRUD: change role assignments for function selectors,
 * toggle target open/closed status.
 */

import { Lock, Plus, RefreshCw, Shield, Unlock, X } from 'lucide-react';
import { toast } from 'sonner';
import { useCallback, useMemo, useState } from 'react';

import {
  AddressDisplay,
  Button,
  Card,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@openzeppelin/ui-components';
import { useDerivedAccountStatus } from '@openzeppelin/ui-react';
import { cn, formatSecondsToReadable, truncateMiddle } from '@openzeppelin/ui-utils';

import { AccessManagerPageGuard } from '../components/Shared/AccessManagerPageGuard';
import { PageEmptyState } from '../components/Shared/PageEmptyState';
import { PageHeader } from '../components/Shared/PageHeader';
import { StatusBadge } from '../components/Shared/StatusBadge';
import { DEFAULT_EXECUTION_CONFIG } from '../constants';
import { useSharedAccessManagerSync } from '../context/AccessManagerSyncContext';
import { useContractDisplayName } from '../hooks';
import {
  useAMSetTargetClosed,
  useAMSetTargetFunctionRole,
} from '../hooks/useAccessManagerMutations';
import { getShortFunctionName, useFunctionSignatures } from '../hooks/useFunctionSignatures';
import { useKnownContracts } from '../hooks/useKnownContracts';
import { useSelectedContract } from '../hooks/useSelectedContract';
import { buildRoleNameMap } from '../utils/am-role-names';
import { createGetAccountUrl } from '../utils/explorer-urls';

/**
 * Targets page — shows target-function-role mappings for AccessManager contracts.
 */
export function Targets() {
  const { selectedContract, runtime } = useSelectedContract();
  const contractLabel = useContractDisplayName(selectedContract);
  const contractAddress = selectedContract?.address ?? '';
  const { targets, roles, isAccessManager, isLoading, isSyncing, refetch } =
    useSharedAccessManagerSync();
  const { address: connectedAddress } = useDerivedAccountStatus();

  // Mutations
  const setTargetFunctionRole = useAMSetTargetFunctionRole(runtime, contractAddress);
  const setTargetClosed = useAMSetTargetClosed(runtime, contractAddress);

  // Track which function mapping is being edited: "targetAddr:selector"
  const [editingKey, setEditingKey] = useState<string | null>(null);

  // Explorer URL generator
  const getAccountUrl = useMemo(() => createGetAccountUrl(runtime), [runtime]);

  // Build role name lookup (shared utility handles known names + fallbacks)
  const roleNameMap = useMemo(() => buildRoleNameMap(roles), [roles]);

  // Build role options for the dropdown from the name map
  const roleOptions = useMemo(
    () => Array.from(roleNameMap, ([value, label]) => ({ value, label })),
    [roleNameMap]
  );

  // Function signature resolution
  const unresolvedSelectors = useMemo(() => {
    const selectors: string[] = [];
    for (const target of targets) {
      for (const fr of target.functionRoles) {
        if (!fr.functionName && fr.selector) selectors.push(fr.selector);
      }
    }
    return selectors;
  }, [targets]);
  const signatureMap = useFunctionSignatures(unresolvedSelectors);

  // Handle role change for a function selector
  const handleRoleChange = useCallback(
    async (targetAddr: string, selector: string, newRoleId: string) => {
      setEditingKey(null);
      try {
        await setTargetFunctionRole.mutateAsync({
          target: targetAddr,
          selectors: [selector],
          roleId: newRoleId,
          executionConfig: DEFAULT_EXECUTION_CONFIG,
        });
        toast.success('Function role updated');
        await refetch();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to update function role');
      }
    },
    [setTargetFunctionRole, refetch]
  );

  // Handle toggle target closed/open
  const handleToggleClosed = useCallback(
    async (targetAddr: string, currentlyClosed: boolean) => {
      try {
        await setTargetClosed.mutateAsync({
          target: targetAddr,
          closed: !currentlyClosed,
          executionConfig: DEFAULT_EXECUTION_CONFIG,
        });
        toast.success(`Target ${currentlyClosed ? 'opened' : 'closed'}`);
        await refetch();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to toggle target status');
      }
    },
    [setTargetClosed, refetch]
  );

  // Known contracts with ABI-resolved functions
  const { contracts: knownContracts, loadFunctionsFor } = useKnownContracts();

  // Add new mapping form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTarget, setNewTarget] = useState('');
  const [newSelector, setNewSelector] = useState('');
  const [newRoleId, setNewRoleId] = useState('');

  // Get functions for selected target from known contracts
  const selectedTargetFunctions = useMemo(() => {
    if (!newTarget) return [];
    const contract = knownContracts.find(
      (c) => c.address.toLowerCase() === newTarget.toLowerCase()
    );
    return contract?.functions?.filter((f) => !f.isView) ?? [];
  }, [knownContracts, newTarget]);

  // When target changes, load its functions
  const handleTargetChange = useCallback(
    (addr: string) => {
      setNewTarget(addr);
      setNewSelector('');
      if (addr) loadFunctionsFor(addr);
    },
    [loadFunctionsFor]
  );

  const handleAddMapping = useCallback(async () => {
    if (!newTarget || !newSelector || !newRoleId) {
      toast.error('All fields are required');
      return;
    }
    // Normalize selector to bytes4
    const selector = newSelector.startsWith('0x') ? newSelector : `0x${newSelector}`;
    if (selector.length !== 10) {
      toast.error('Selector must be 4 bytes (e.g., 0x12345678)');
      return;
    }
    try {
      await setTargetFunctionRole.mutateAsync({
        target: newTarget,
        selectors: [selector],
        roleId: newRoleId,
        executionConfig: DEFAULT_EXECUTION_CONFIG,
      });
      toast.success('Function role mapping added');
      setShowAddForm(false);
      setNewTarget('');
      setNewSelector('');
      setNewRoleId('');
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add mapping');
    }
  }, [newTarget, newSelector, newRoleId, setTargetFunctionRole, refetch]);

  const isConnected = !!connectedAddress;

  return (
    <AccessManagerPageGuard
      title="Targets"
      contractLabel={contractLabel}
      hasContract={!!selectedContract}
      isAccessManager={isAccessManager}
      isLoading={isLoading}
      notAmDescription="Target management is only available for OpenZeppelin AccessManager contracts."
      loadingMessage="Loading target configurations..."
      notAmIcon={Shield}
    >
      <div className="p-6 space-y-6">
        <PageHeader
          title="Targets"
          subtitle={
            <span>
              Managed target contracts for{' '}
              <span className="font-bold text-foreground">{contractLabel}</span>
            </span>
          }
          actions={
            <div className="flex items-center gap-2">
              {isConnected && (
                <Button size="sm" onClick={() => setShowAddForm(!showAddForm)} className="gap-1">
                  {showAddForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                  {showAddForm ? 'Cancel' : 'Add Mapping'}
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                disabled={isSyncing}
                className="gap-2"
              >
                <RefreshCw className={cn('h-4 w-4', isSyncing && 'animate-spin')} />
                {isSyncing ? 'Syncing...' : 'Refresh'}
              </Button>
            </div>
          }
        />

        {/* Add Mapping Form */}
        {showAddForm && (
          <Card className="p-4 shadow-none space-y-3">
            <h3 className="text-sm font-semibold">Add Function Role Mapping</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-muted-foreground">Target Contract</label>
                {knownContracts.length > 0 ? (
                  <Select value={newTarget} onValueChange={handleTargetChange}>
                    <SelectTrigger className="h-9 text-sm font-mono">
                      <SelectValue placeholder="Select target" />
                    </SelectTrigger>
                    <SelectContent>
                      {knownContracts.map((c) => (
                        <SelectItem key={c.address} value={c.address}>
                          {truncateMiddle(c.address, 6, 4)}
                        </SelectItem>
                      ))}
                      <SelectItem value="__custom__">Custom address...</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <input
                    type="text"
                    value={newTarget}
                    onChange={(e) => handleTargetChange(e.target.value)}
                    placeholder="0x..."
                    className="px-3 py-1.5 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring font-mono"
                  />
                )}
                {newTarget === '__custom__' && (
                  <input
                    type="text"
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v.length === 42) handleTargetChange(v);
                    }}
                    placeholder="Paste address 0x..."
                    className="mt-1 px-3 py-1.5 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring font-mono"
                  />
                )}
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-muted-foreground">Function</label>
                {selectedTargetFunctions.length > 0 ? (
                  <Select value={newSelector} onValueChange={setNewSelector}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Select function" />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedTargetFunctions.map((fn) => (
                        <SelectItem key={fn.selector || fn.name} value={fn.selector || fn.name}>
                          <span className="font-mono text-xs">{fn.name}</span>
                          {fn.selector && (
                            <span className="ml-1 text-muted-foreground text-xs">
                              ({fn.selector})
                            </span>
                          )}
                        </SelectItem>
                      ))}
                      <SelectItem value="__custom_sel__">Custom selector...</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <input
                    type="text"
                    value={newSelector}
                    onChange={(e) => setNewSelector(e.target.value)}
                    placeholder="0x12345678"
                    className="px-3 py-1.5 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring font-mono"
                  />
                )}
                {newSelector === '__custom_sel__' && (
                  <input
                    type="text"
                    onChange={(e) => setNewSelector(e.target.value)}
                    placeholder="0x12345678"
                    className="mt-1 px-3 py-1.5 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring font-mono"
                  />
                )}
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-muted-foreground">Role</label>
                <Select value={newRoleId} onValueChange={setNewRoleId}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {roleOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end">
              <Button
                size="sm"
                onClick={handleAddMapping}
                disabled={
                  !newTarget || !newSelector || !newRoleId || setTargetFunctionRole.isPending
                }
              >
                {setTargetFunctionRole.isPending ? (
                  <RefreshCw className="h-3 w-3 animate-spin mr-1" />
                ) : (
                  <Plus className="h-3 w-3 mr-1" />
                )}
                Add
              </Button>
            </div>
          </Card>
        )}

        {targets.length === 0 && !showAddForm ? (
          <PageEmptyState
            title="No Targets"
            description="No managed target contracts found for this AccessManager."
            icon={Shield}
          />
        ) : (
          <Card className="p-0 shadow-none overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-[280px]">
                      Target
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-[100px]">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-[140px]">
                      Admin Delay
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Function Mappings
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {targets.map((target) => (
                    <tr key={target.target} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <AddressDisplay
                          address={target.target}
                          truncate
                          showCopyButton
                          explorerUrl={getAccountUrl(target.target) ?? undefined}
                        />
                      </td>
                      <td className="px-4 py-3">
                        {isConnected ? (
                          <button
                            onClick={() => handleToggleClosed(target.target, target.isClosed)}
                            disabled={setTargetClosed.isPending}
                            className="flex items-center gap-1.5 cursor-pointer hover:opacity-80 transition-opacity"
                            title={`Click to ${target.isClosed ? 'open' : 'close'} target`}
                          >
                            {target.isClosed ? (
                              <>
                                <Lock className="h-3 w-3 text-red-500" />
                                <StatusBadge variant="error">Closed</StatusBadge>
                              </>
                            ) : (
                              <>
                                <Unlock className="h-3 w-3 text-green-500" />
                                <StatusBadge variant="success">Open</StatusBadge>
                              </>
                            )}
                          </button>
                        ) : target.isClosed ? (
                          <StatusBadge variant="error">Closed</StatusBadge>
                        ) : (
                          <StatusBadge variant="success">Open</StatusBadge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {target.adminDelay > 0
                          ? formatSecondsToReadable(target.adminDelay)
                          : 'None'}
                        {target.pendingAdminDelay && (
                          <div className="text-xs text-amber-600 mt-0.5">
                            Pending: {formatSecondsToReadable(target.pendingAdminDelay.newDelay)}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {target.functionRoles.length === 0 ? (
                          <span className="text-sm text-muted-foreground">No mappings</span>
                        ) : (
                          <div className="flex flex-col gap-1.5">
                            {target.functionRoles.map((fr) => {
                              const resolvedSig = signatureMap.get(fr.selector.toLowerCase());
                              const displayName =
                                fr.functionName ??
                                (resolvedSig ? getShortFunctionName(resolvedSig) : null);
                              const fullSig = fr.functionName ?? resolvedSig;
                              const key = `${target.target}:${fr.selector}`;
                              const isEditing = editingKey === key;

                              return (
                                <div key={fr.selector} className="flex items-center gap-2 text-sm">
                                  <code
                                    className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono min-w-[100px]"
                                    title={fullSig ?? fr.selector}
                                  >
                                    {displayName ?? fr.selector}
                                  </code>
                                  <span className="text-muted-foreground">→</span>
                                  {isEditing ? (
                                    <Select
                                      value={fr.roleId}
                                      onValueChange={(val) =>
                                        handleRoleChange(target.target, fr.selector, val)
                                      }
                                      onOpenChange={(open) => {
                                        if (!open) setEditingKey(null);
                                      }}
                                      defaultOpen
                                    >
                                      <SelectTrigger className="h-7 w-[160px] text-xs">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {roleOptions.map((opt) => (
                                          <SelectItem key={opt.value} value={opt.value}>
                                            {opt.label}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  ) : (
                                    <button
                                      className={cn(
                                        'text-xs font-medium px-2 py-0.5 rounded',
                                        isConnected
                                          ? 'text-foreground bg-muted hover:bg-muted/80 cursor-pointer transition-colors'
                                          : 'text-foreground'
                                      )}
                                      onClick={() => isConnected && setEditingKey(key)}
                                      disabled={!isConnected}
                                      title={
                                        isConnected
                                          ? 'Click to change role'
                                          : 'Connect wallet to edit'
                                      }
                                    >
                                      {roleNameMap.get(fr.roleId) ?? `Role #${fr.roleId}`}
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </AccessManagerPageGuard>
  );
}
