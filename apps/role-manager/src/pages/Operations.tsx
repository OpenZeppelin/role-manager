/**
 * Operations Page
 * Feature: 018-access-manager
 *
 * Full CRUD for AccessManager scheduled operations:
 * - Schedule new operations (target + calldata + optional when)
 * - View all scheduled operations with status
 * - Execute ready operations
 * - Cancel operations (by caller, admin, or guardian)
 *
 * Also displays global AM config: expiration window and min setback.
 */

import { Ban, Calendar, Clock, Play, Plus, RefreshCw, X, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { useCallback, useEffect, useMemo, useState } from 'react';

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
import { StatusBadge, type StatusBadgeVariant } from '../components/Shared/StatusBadge';
import { DEFAULT_EXECUTION_CONFIG } from '../constants';
import { useSharedAccessManagerSync } from '../context/AccessManagerSyncContext';
import { useContractDisplayName } from '../hooks';
import { useAMCancel, useAMExecute, useAMSchedule } from '../hooks/useAccessManagerMutations';
import { useKnownContracts } from '../hooks/useKnownContracts';
import { useSelectedContract } from '../hooks/useSelectedContract';
import {
  isValidAccessManagerAddress,
  isValidAccessManagerCalldata,
} from '../utils/access-manager-form';
import { formatEffectAtDate } from '../utils/delay-format';
import { createGetAccountUrl } from '../utils/explorer-urls';

function formatScheduleDate(timestamp: number): string {
  if (timestamp === 0) return 'Immediate';
  return formatEffectAtDate(timestamp);
}

function getOperationStatus(op: { isReady: boolean; isExpired: boolean; schedule: number }): {
  label: string;
  variant: StatusBadgeVariant;
} {
  if (op.isExpired) return { label: 'Expired', variant: 'error' };
  if (op.isReady) return { label: 'Ready', variant: 'success' };
  if (op.schedule > 0) return { label: 'Scheduled', variant: 'warning' };
  return { label: 'Pending', variant: 'info' };
}

export function Operations() {
  const { selectedContract, runtime } = useSelectedContract();
  const contractLabel = useContractDisplayName(selectedContract);
  const contractAddress = selectedContract?.address ?? '';
  const { operations, expiration, minSetback, isAccessManager, isLoading, isSyncing, refetch } =
    useSharedAccessManagerSync();
  const { address: connectedAddress } = useDerivedAccountStatus();

  // Mutations
  const executeOp = useAMExecute(runtime, contractAddress);
  const cancelOp = useAMCancel(runtime, contractAddress);
  const scheduleOp = useAMSchedule(runtime, contractAddress);

  const getAccountUrl = useMemo(() => createGetAccountUrl(runtime), [runtime]);

  // Known contracts for target dropdown
  const { contracts: knownContracts, loadFunctionsFor } = useKnownContracts();

  // Form mode: 'schedule' | 'execute' | null
  const [formMode, setFormMode] = useState<'schedule' | 'execute' | null>(null);

  // Shared form state — only one form is visible at a time
  const [formTarget, setFormTarget] = useState('');
  const [formFunctionId, setFormFunctionId] = useState('');
  const [formFunctionArgs, setFormFunctionArgs] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState('');
  const [formWhen, setFormWhen] = useState('');
  const [formUseRawCalldata, setFormUseRawCalldata] = useState(false);

  // Get functions for selected target (shared by both Schedule and Execute forms)
  const formTargetContract = useMemo(
    () => knownContracts.find((c) => c.address.toLowerCase() === formTarget.toLowerCase()),
    [knownContracts, formTarget]
  );
  const formWriteFunctions = useMemo(
    () => formTargetContract?.functions?.filter((f) => !f.isView) ?? [],
    [formTargetContract]
  );
  const formSelectedFunction = useMemo(
    () =>
      formWriteFunctions.find((f) => f.selector === formFunctionId || f.name === formFunctionId),
    [formWriteFunctions, formFunctionId]
  );

  const handleFormTargetChange = useCallback(
    (addr: string) => {
      setFormTarget(addr);
      setFormFunctionId('');
      setFormFunctionArgs({});
      setFormData('');
      if (addr && addr !== '__custom__') loadFunctionsFor(addr);
    },
    [loadFunctionsFor]
  );

  // Encode calldata when function + args change
  useEffect(() => {
    if (formUseRawCalldata || !runtime || !formTarget || !formSelectedFunction) return;
    const encodeFn = async () => {
      try {
        const schema = await runtime.contractLoading.loadContract(formTarget);
        const fn = schema.functions.find(
          (f: import('@openzeppelin/ui-types').ContractFunction) =>
            f.name === formSelectedFunction.name
        );
        if (!fn) return;
        const fields = (fn.inputs ?? []).map((p: { name: string; type: string }) => ({
          id: p.name,
          name: p.name,
          label: p.name,
          type: runtime.typeMapping.mapParameterTypeToFieldType(
            p.type
          ) as import('@openzeppelin/ui-types').FieldType,
          validation: {},
        }));
        const txData = runtime.execution.formatTransactionData(
          schema,
          fn.id,
          formFunctionArgs as Record<string, unknown>,
          fields
        );
        const encoded = (txData as { data?: string }).data ?? '';
        if (encoded) setFormData(encoded);
      } catch {
        // encoding failed — user can still paste raw calldata
      }
    };
    void encodeFn();
  }, [runtime, formTarget, formSelectedFunction, formFunctionArgs, formUseRawCalldata]);

  const sortedOperations = useMemo(() => {
    return [...operations].sort((a, b) => {
      if (a.isReady && !b.isReady) return -1;
      if (!a.isReady && b.isReady) return 1;
      if (a.isExpired && !b.isExpired) return 1;
      if (!a.isExpired && b.isExpired) return -1;
      return b.schedule - a.schedule;
    });
  }, [operations]);

  const handleExecute = useCallback(
    async (target: string, data: string) => {
      try {
        await executeOp.mutateAsync({
          target,
          data,
          executionConfig: DEFAULT_EXECUTION_CONFIG,
        });
        toast.success('Operation executed');
        await refetch();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to execute operation');
      }
    },
    [executeOp, refetch]
  );

  const handleCancel = useCallback(
    async (caller: string, target: string, data: string) => {
      try {
        await cancelOp.mutateAsync({
          caller,
          target,
          data,
          executionConfig: DEFAULT_EXECUTION_CONFIG,
        });
        toast.success('Operation cancelled');
        await refetch();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to cancel operation');
      }
    },
    [cancelOp, refetch]
  );

  const handleImmediateExecute = useCallback(async () => {
    if (!formTarget || !formData) {
      toast.error('Target and calldata are required');
      return;
    }
    if (!isValidAccessManagerAddress(formTarget)) {
      toast.error('Target must be a valid address');
      return;
    }
    if (!isValidAccessManagerCalldata(formData)) {
      toast.error('Calldata must be valid hex bytes');
      return;
    }
    try {
      await executeOp.mutateAsync({
        target: formTarget,
        data: formData,
        executionConfig: DEFAULT_EXECUTION_CONFIG,
      });
      toast.success('Operation executed');
      setFormMode(null);
      setFormTarget('');
      setFormData('');
      setFormFunctionId('');
      setFormFunctionArgs({});
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to execute operation');
    }
  }, [formTarget, formData, executeOp, refetch]);

  const handleSchedule = useCallback(async () => {
    if (!formTarget || !formData) {
      toast.error('Target and calldata are required');
      return;
    }
    if (!isValidAccessManagerAddress(formTarget)) {
      toast.error('Target must be a valid address');
      return;
    }
    if (!isValidAccessManagerCalldata(formData)) {
      toast.error('Calldata must be valid hex bytes');
      return;
    }
    // Convert datetime to unix timestamp, or 0 for "as soon as possible"
    let when = 0;
    if (formWhen) {
      const ts = Math.floor(new Date(formWhen).getTime() / 1000);
      if (isNaN(ts) || ts <= 0) {
        toast.error('Invalid schedule time');
        return;
      }
      when = ts;
    }
    try {
      await scheduleOp.mutateAsync({
        target: formTarget,
        data: formData,
        when,
        executionConfig: DEFAULT_EXECUTION_CONFIG,
      });
      toast.success('Operation scheduled');
      setFormMode(null);

      setFormTarget('');
      setFormData('');
      setFormWhen('');
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to schedule operation');
    }
  }, [formTarget, formData, formWhen, scheduleOp, refetch]);

  const isConnected = !!connectedAddress;
  const isMutating = executeOp.isPending || cancelOp.isPending || scheduleOp.isPending;

  return (
    <AccessManagerPageGuard
      title="Operations"
      contractLabel={contractLabel}
      hasContract={!!selectedContract}
      isAccessManager={isAccessManager}
      isLoading={isLoading}
      notAmDescription="Operation scheduling is only available for OpenZeppelin AccessManager contracts."
      loadingMessage="Loading scheduled operations..."
      notAmIcon={Clock}
    >
      <div className="p-6 space-y-6">
        <PageHeader
          title="Operations"
          subtitle={
            <span>
              Scheduled operations for{' '}
              <span className="font-bold text-foreground">{contractLabel}</span>
            </span>
          }
          actions={
            <div className="flex items-center gap-2">
              {isConnected && formMode !== null && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setFormMode(null);
                  }}
                  className="gap-1"
                >
                  <X className="h-4 w-4" />
                  Cancel
                </Button>
              )}
              {isConnected && formMode === null && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setFormMode('execute');
                    }}
                    className="gap-1"
                  >
                    <Zap className="h-4 w-4" />
                    Execute
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      setFormMode('schedule');
                    }}
                    className="gap-1"
                  >
                    <Plus className="h-4 w-4" />
                    Schedule
                  </Button>
                </>
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

        {/* Global AM Config */}
        {(expiration !== null || minSetback !== null) && (
          <div className="flex items-center gap-6 text-sm text-muted-foreground px-1">
            {expiration !== null && (
              <div className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                <span>
                  Expiration:{' '}
                  <span className="font-medium text-foreground">
                    {formatSecondsToReadable(expiration)}
                  </span>
                </span>
              </div>
            )}
            {minSetback !== null && (
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                <span>
                  Min Setback:{' '}
                  <span className="font-medium text-foreground">
                    {formatSecondsToReadable(minSetback)}
                  </span>
                </span>
              </div>
            )}
          </div>
        )}

        {/* Execute Immediately Form */}
        {formMode === 'execute' && (
          <Card className="p-4 shadow-none space-y-3">
            <h3 className="text-sm font-semibold">Execute Immediately</h3>
            <p className="text-xs text-muted-foreground">
              Execute a function call directly through the AccessManager. The caller must have a
              role that allows immediate execution (no delay) for the target function.
            </p>
            <div className="grid grid-cols-1 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-muted-foreground">Target Contract</label>
                {knownContracts.length > 0 ? (
                  <>
                    <Select value={formTarget} onValueChange={handleFormTargetChange}>
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
                    {formTarget === '__custom__' && (
                      <input
                        type="text"
                        onChange={(e) => {
                          const v = e.target.value;
                          if (v.length === 42) handleFormTargetChange(v);
                        }}
                        placeholder="Paste address 0x..."
                        className="mt-1 px-3 py-1.5 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring font-mono"
                      />
                    )}
                  </>
                ) : (
                  <input
                    type="text"
                    value={formTarget}
                    onChange={(e) => handleFormTargetChange(e.target.value)}
                    placeholder="0x..."
                    className="px-3 py-1.5 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring font-mono"
                  />
                )}
              </div>
              {/* Function picker or raw calldata */}
              {formWriteFunctions.length > 0 && !formUseRawCalldata ? (
                <>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-muted-foreground">Function</label>
                    <Select
                      value={formFunctionId}
                      onValueChange={(v) => {
                        setFormFunctionId(v);
                        setFormFunctionArgs({});
                      }}
                    >
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue placeholder="Select function" />
                      </SelectTrigger>
                      <SelectContent>
                        {formWriteFunctions.map((fn) => (
                          <SelectItem key={fn.selector || fn.name} value={fn.selector || fn.name}>
                            <span className="font-mono text-xs">{fn.name}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {formSelectedFunction && (
                    <div className="flex flex-col gap-2 border rounded-md p-3 bg-muted/30">
                      <span className="text-xs font-medium text-muted-foreground">
                        Arguments for{' '}
                        <code className="font-mono">{formSelectedFunction.signature}</code>
                      </span>
                      {formSelectedFunction.signature
                        .slice(
                          formSelectedFunction.signature.indexOf('(') + 1,
                          formSelectedFunction.signature.indexOf(')')
                        )
                        .split(',')
                        .filter(Boolean)
                        .map((paramType, i) => (
                          <div key={i} className="flex flex-col gap-0.5">
                            <label className="text-xs text-muted-foreground">
                              arg{i} <span className="opacity-60">({paramType.trim()})</span>
                            </label>
                            <input
                              type="text"
                              value={formFunctionArgs[`arg${i}`] ?? ''}
                              onChange={(e) =>
                                setFormFunctionArgs((prev) => ({
                                  ...prev,
                                  [`arg${i}`]: e.target.value,
                                }))
                              }
                              placeholder={paramType.trim()}
                              className="px-3 py-1.5 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring font-mono"
                            />
                          </div>
                        ))}
                    </div>
                  )}
                  {formData && (
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs text-muted-foreground">Encoded calldata</span>
                      <code className="text-xs bg-muted p-2 rounded font-mono break-all">
                        {formData.slice(0, 66)}
                        {formData.length > 66 ? '...' : ''}
                      </code>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => setFormUseRawCalldata(true)}
                    className="text-xs text-muted-foreground underline self-start"
                  >
                    Paste raw calldata instead
                  </button>
                </>
              ) : (
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-muted-foreground">
                    Calldata (ABI-encoded)
                  </label>
                  <input
                    type="text"
                    value={formData}
                    onChange={(e) => setFormData(e.target.value)}
                    placeholder="0x..."
                    className="px-3 py-1.5 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring font-mono"
                  />
                  {formWriteFunctions.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setFormUseRawCalldata(false)}
                      className="text-xs text-muted-foreground underline self-start"
                    >
                      Use function picker instead
                    </button>
                  )}
                  <span className="text-xs text-muted-foreground">
                    Encoded function call (selector + args).
                  </span>
                </div>
              )}
            </div>
            <div className="flex justify-end">
              <Button
                size="sm"
                onClick={handleImmediateExecute}
                disabled={!formTarget || !formData || executeOp.isPending}
              >
                {executeOp.isPending ? (
                  <RefreshCw className="h-3 w-3 animate-spin mr-1" />
                ) : (
                  <Zap className="h-3 w-3 mr-1" />
                )}
                Execute
              </Button>
            </div>
          </Card>
        )}

        {/* Schedule Form */}
        {formMode === 'schedule' && (
          <Card className="p-4 shadow-none space-y-3">
            <h3 className="text-sm font-semibold">Schedule Operation</h3>
            <p className="text-xs text-muted-foreground">
              Schedule a delayed call through the AccessManager. The caller must have a role with an
              execution delay for the target function.
            </p>
            <div className="grid grid-cols-1 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-muted-foreground">Target Contract</label>
                {knownContracts.length > 0 ? (
                  <>
                    <Select value={formTarget} onValueChange={handleFormTargetChange}>
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
                    {formTarget === '__custom__' && (
                      <input
                        type="text"
                        onChange={(e) => {
                          const v = e.target.value;
                          if (v.length === 42) handleFormTargetChange(v);
                        }}
                        placeholder="Paste address 0x..."
                        className="mt-1 px-3 py-1.5 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring font-mono"
                      />
                    )}
                  </>
                ) : (
                  <input
                    type="text"
                    value={formTarget}
                    onChange={(e) => handleFormTargetChange(e.target.value)}
                    placeholder="0x..."
                    className="px-3 py-1.5 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring font-mono"
                  />
                )}
              </div>
              {/* Function picker or raw calldata */}
              {formWriteFunctions.length > 0 && !formUseRawCalldata ? (
                <>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-muted-foreground">Function</label>
                    <Select
                      value={formFunctionId}
                      onValueChange={(v) => {
                        setFormFunctionId(v);
                        setFormFunctionArgs({});
                      }}
                    >
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue placeholder="Select function" />
                      </SelectTrigger>
                      <SelectContent>
                        {formWriteFunctions.map((fn) => (
                          <SelectItem key={fn.selector || fn.name} value={fn.selector || fn.name}>
                            <span className="font-mono text-xs">{fn.name}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {/* Function args */}
                  {formSelectedFunction && (
                    <div className="flex flex-col gap-2 border rounded-md p-3 bg-muted/30">
                      <span className="text-xs font-medium text-muted-foreground">
                        Arguments for{' '}
                        <code className="font-mono">{formSelectedFunction.signature}</code>
                      </span>
                      {formSelectedFunction.signature
                        .slice(
                          formSelectedFunction.signature.indexOf('(') + 1,
                          formSelectedFunction.signature.indexOf(')')
                        )
                        .split(',')
                        .filter(Boolean)
                        .map((paramType, i) => (
                          <div key={i} className="flex flex-col gap-0.5">
                            <label className="text-xs text-muted-foreground">
                              arg{i} <span className="opacity-60">({paramType.trim()})</span>
                            </label>
                            <input
                              type="text"
                              value={formFunctionArgs[`arg${i}`] ?? ''}
                              onChange={(e) =>
                                setFormFunctionArgs((prev) => ({
                                  ...prev,
                                  [`arg${i}`]: e.target.value,
                                }))
                              }
                              placeholder={paramType.trim()}
                              className="px-3 py-1.5 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring font-mono"
                            />
                          </div>
                        ))}
                    </div>
                  )}
                  {formData && (
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs text-muted-foreground">Encoded calldata</span>
                      <code className="text-xs bg-muted p-2 rounded font-mono break-all">
                        {formData.slice(0, 66)}
                        {formData.length > 66 ? '...' : ''}
                      </code>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => setFormUseRawCalldata(true)}
                    className="text-xs text-muted-foreground underline self-start"
                  >
                    Paste raw calldata instead
                  </button>
                </>
              ) : (
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-muted-foreground">
                    Calldata (ABI-encoded)
                  </label>
                  <input
                    type="text"
                    value={formData}
                    onChange={(e) => setFormData(e.target.value)}
                    placeholder="0x..."
                    className="px-3 py-1.5 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring font-mono"
                  />
                  {formWriteFunctions.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setFormUseRawCalldata(false)}
                      className="text-xs text-muted-foreground underline self-start"
                    >
                      Use function picker instead
                    </button>
                  )}
                  <span className="text-xs text-muted-foreground">
                    Encoded function call (selector + args).
                  </span>
                </div>
              )}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-muted-foreground">
                  Execute After (optional)
                </label>
                <input
                  type="datetime-local"
                  value={formWhen}
                  onChange={(e) => setFormWhen(e.target.value)}
                  className="px-3 py-1.5 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <span className="text-xs text-muted-foreground">
                  Leave empty for earliest possible time (current time + execution delay).
                </span>
              </div>
            </div>
            <div className="flex justify-end">
              <Button
                size="sm"
                onClick={handleSchedule}
                disabled={!formTarget || !formData || scheduleOp.isPending}
              >
                {scheduleOp.isPending ? (
                  <RefreshCw className="h-3 w-3 animate-spin mr-1" />
                ) : (
                  <Calendar className="h-3 w-3 mr-1" />
                )}
                Schedule
              </Button>
            </div>
          </Card>
        )}

        {sortedOperations.length === 0 && formMode === null ? (
          <PageEmptyState
            title="No Operations"
            description="No scheduled operations found for this AccessManager."
            icon={Clock}
          />
        ) : (
          <Card className="p-0 shadow-none overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-[180px]">
                      Operation ID
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-[180px]">
                      Caller
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-[180px]">
                      Target
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-[160px]">
                      Schedule
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-[90px]">
                      Status
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider w-[160px]">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {sortedOperations.map((op) => {
                    const status = getOperationStatus(op);
                    const canExecute = isConnected && op.isReady && !op.isExpired;
                    const canCancel = isConnected && !op.isExpired;

                    return (
                      <tr key={op.operationId} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3">
                          <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">
                            {op.operationId.slice(0, 10)}...{op.operationId.slice(-8)}
                          </code>
                        </td>
                        <td className="px-4 py-3">
                          <AddressDisplay
                            address={op.caller}
                            truncate
                            showCopyButton
                            explorerUrl={getAccountUrl(op.caller) ?? undefined}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <AddressDisplay
                            address={op.target}
                            truncate
                            showCopyButton
                            explorerUrl={getAccountUrl(op.target) ?? undefined}
                          />
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {formatScheduleDate(op.schedule)}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge variant={status.variant}>{status.label}</StatusBadge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1.5">
                            {canExecute && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleExecute(op.target, op.data)}
                                disabled={isMutating}
                                className="h-7 px-2 text-xs gap-1"
                              >
                                <Play className="h-3 w-3" />
                                Execute
                              </Button>
                            )}
                            {canCancel && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleCancel(op.caller, op.target, op.data)}
                                disabled={isMutating}
                                className="h-7 px-2 text-xs text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 gap-1"
                              >
                                <Ban className="h-3 w-3" />
                                Cancel
                              </Button>
                            )}
                            {!isConnected && (
                              <span className="text-xs text-muted-foreground">Connect wallet</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </AccessManagerPageGuard>
  );
}
