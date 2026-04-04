/**
 * Contract Interaction Page
 * Feature: 018-access-manager
 *
 * Generic contract function interaction UI. Loads the contract's ABI
 * and renders each function with auto-generated form fields.
 * Read functions are queried on-chain; write functions send transactions.
 */

import { ChevronDown, ChevronRight, Code, FileSearch, Play, RefreshCw, Search } from 'lucide-react';
import { toast } from 'sonner';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { Button, Card, CardContent } from '@openzeppelin/ui-components';
import { useDerivedAccountStatus } from '@openzeppelin/ui-react';
import type { ContractFunction, ContractSchema, ExecutionConfig } from '@openzeppelin/ui-types';
import { cn, logger } from '@openzeppelin/ui-utils';

import { PageEmptyState } from '../components/Shared/PageEmptyState';
import { PageHeader } from '../components/Shared/PageHeader';
import { useContractDisplayName } from '../hooks';
import { useSelectedContract } from '../hooks/useSelectedContract';

// =============================================================================
// FunctionCard — renders a single contract function with inputs and execute
// =============================================================================

function FunctionCard({
  fn,
  runtime,
  contractAddress,
  contractSchema,
  isConnected,
}: {
  fn: ContractFunction;
  runtime: NonNullable<ReturnType<typeof useSelectedContract>['runtime']>;
  contractAddress: string;
  contractSchema: ContractSchema;
  isConnected: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const isView = runtime.schema.isViewFunction(fn);
  const params = fn.inputs ?? [];

  const handleInputChange = (paramName: string, value: string) => {
    setInputs((prev) => ({ ...prev, [paramName]: value }));
  };

  const handleExecute = async () => {
    setError(null);
    setResult(null);
    setIsPending(true);

    try {
      if (isView) {
        // Read call
        const args = params.map((p) => inputs[p.name] ?? '');
        const res = await runtime.query.queryViewFunction(
          contractAddress,
          fn.id,
          args,
          contractSchema
        );
        const formattedResult = runtime.query.formatFunctionResult(res, fn);
        setResult(
          typeof formattedResult === 'string'
            ? formattedResult
            : JSON.stringify(formattedResult, null, 2)
        );
      } else {
        // Write call — use runtime signAndBroadcast
        const submittedInputs: Record<string, unknown> = {};
        for (const p of params) {
          submittedInputs[p.name] = inputs[p.name] ?? '';
        }
        // Build minimal FormFieldType array for formatTransactionData
        const fields = params.map((p) => ({
          id: p.name,
          name: p.name,
          label: p.name,
          type: runtime.typeMapping.mapParameterTypeToFieldType(
            p.type
          ) as import('@openzeppelin/ui-types').FieldType,
          validation: {},
        }));

        const txData = runtime.execution.formatTransactionData(
          contractSchema,
          fn.id,
          submittedInputs,
          fields
        );
        const executionConfig: ExecutionConfig = { method: 'eoa', allowAny: true };

        const { txHash } = await runtime.execution.signAndBroadcast(
          txData,
          executionConfig,
          (status, details) => {
            logger.info('ContractInteraction', `Tx status: ${status}`, details);
          }
        );

        setResult(`Transaction: ${txHash}`);
        toast.success(`Transaction sent: ${txHash?.slice(0, 10)}...`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      if (!isView) toast.error(msg);
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/50 transition-colors text-left"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          <code className="text-sm font-mono font-medium">{fn.name}</code>
          <span
            className={cn(
              'text-xs px-1.5 py-0.5 rounded',
              isView
                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                : 'bg-amber-50 text-amber-700 border border-amber-200'
            )}
          >
            {isView ? 'read' : 'write'}
          </span>
        </div>
        {params.length > 0 && (
          <span className="text-xs text-muted-foreground">
            {params.length} param{params.length > 1 ? 's' : ''}
          </span>
        )}
      </button>

      {expanded && (
        <div className="px-4 pb-4 pt-2 border-t bg-muted/20 space-y-3">
          {/* Input fields */}
          {params.map((p) => (
            <div key={p.name} className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">
                {p.name} <span className="text-muted-foreground/60">({p.type})</span>
              </label>
              <input
                type="text"
                value={inputs[p.name] ?? ''}
                onChange={(e) => handleInputChange(p.name, e.target.value)}
                placeholder={p.type}
                className="px-3 py-1.5 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring font-mono"
              />
            </div>
          ))}

          {/* Execute button */}
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={isView ? 'outline' : 'default'}
              onClick={handleExecute}
              disabled={isPending || (!isView && !isConnected)}
              className="gap-1"
            >
              {isPending ? (
                <RefreshCw className="h-3 w-3 animate-spin" />
              ) : isView ? (
                <Search className="h-3 w-3" />
              ) : (
                <Play className="h-3 w-3" />
              )}
              {isView ? 'Query' : 'Execute'}
            </Button>
            {!isView && !isConnected && (
              <span className="text-xs text-muted-foreground">Connect wallet to execute</span>
            )}
          </div>

          {/* Result */}
          {result && (
            <div className="p-2 bg-green-50 border border-green-200 rounded text-sm font-mono text-green-800 break-all">
              {result}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700 break-all">
              {error}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Main Page
// =============================================================================

export function ContractInteraction() {
  const { selectedContract, runtime } = useSelectedContract();
  const contractLabel = useContractDisplayName(selectedContract);
  const contractAddress = selectedContract?.address ?? '';
  const { address: connectedAddress } = useDerivedAccountStatus();

  const [schema, setSchema] = useState<ContractSchema | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [needsAbi, setNeedsAbi] = useState(false);
  const [manualAbi, setManualAbi] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const loadSchema = useCallback(async () => {
    if (!runtime || !contractAddress) return;
    setIsLoading(true);
    setError(null);
    try {
      const loaded = await runtime.contractLoading.loadContract(contractAddress);
      setSchema(loaded);
    } catch {
      // Fallback: try loading with the known AccessManager ABI
      try {
        const { ACCESS_MANAGER_ABI } = await import('../core/ecosystems/evm/accessManagerAbi');
        const fallback = await runtime.contractLoading.loadContract({
          contractAddress,
          contractDefinition: JSON.stringify(ACCESS_MANAGER_ABI),
        } as unknown as string);
        setSchema(fallback);
      } catch {
        // Both auto-detection and AM fallback failed — prompt for manual ABI
        setNeedsAbi(true);
      }
    } finally {
      setIsLoading(false);
    }
  }, [runtime, contractAddress]);

  const loadFromManualAbi = useCallback(async () => {
    if (!runtime || !contractAddress || !manualAbi.trim()) return;
    setError(null);
    setIsLoading(true);
    try {
      // Validate JSON
      JSON.parse(manualAbi.trim());
      const loaded = await runtime.contractLoading.loadContract({
        contractAddress,
        contractDefinition: manualAbi.trim(),
      } as unknown as string);
      setSchema(loaded);
      setNeedsAbi(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid ABI JSON');
    } finally {
      setIsLoading(false);
    }
  }, [runtime, contractAddress, manualAbi]);

  useEffect(() => {
    setSchema(null);
    setError(null);
    setNeedsAbi(false);
    setManualAbi('');
    setSearchQuery('');
    if (runtime && contractAddress) loadSchema();
  }, [runtime, contractAddress, loadSchema]);

  // Separate read and write functions
  const { readFunctions, writeFunctions } = useMemo(() => {
    if (!schema?.functions || !runtime) return { readFunctions: [], writeFunctions: [] };
    const reads: ContractFunction[] = [];
    const writes: ContractFunction[] = [];
    for (const fn of schema.functions) {
      if (runtime.schema.isViewFunction(fn)) reads.push(fn);
      else writes.push(fn);
    }
    return { readFunctions: reads, writeFunctions: writes };
  }, [schema, runtime]);

  // Filter by search
  const filteredReads = useMemo(() => {
    if (!searchQuery) return readFunctions;
    const q = searchQuery.toLowerCase();
    return readFunctions.filter((fn) => fn.name.toLowerCase().includes(q));
  }, [readFunctions, searchQuery]);

  const filteredWrites = useMemo(() => {
    if (!searchQuery) return writeFunctions;
    const q = searchQuery.toLowerCase();
    return writeFunctions.filter((fn) => fn.name.toLowerCase().includes(q));
  }, [writeFunctions, searchQuery]);

  if (!selectedContract) {
    return (
      <div className="p-6 space-y-6">
        <PageHeader title="Contract" subtitle="Select a contract to interact with" />
        <PageEmptyState
          title="No Contract Selected"
          description="Select a contract from the dropdown above to view and call its functions."
          icon={FileSearch}
        />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <PageHeader
          title="Contract"
          subtitle={
            <span>
              Loading ABI for <span className="font-bold text-foreground">{contractLabel}</span>
            </span>
          }
        />
        <Card className="shadow-none">
          <CardContent className="p-8 text-center text-muted-foreground">
            Loading contract schema...
          </CardContent>
        </Card>
      </div>
    );
  }

  if (needsAbi || error) {
    return (
      <div className="p-6 space-y-6">
        <PageHeader
          title="Contract"
          subtitle={
            <span>
              Interact with <span className="font-bold text-foreground">{contractLabel}</span>
            </span>
          }
        />
        <Card className="shadow-none">
          <CardContent className="p-6 space-y-4">
            <div>
              <p className="text-sm font-medium">Contract ABI not found on block explorer</p>
              <p className="text-xs text-muted-foreground mt-1">
                This contract is not verified on Sourcify or the block explorer. Paste the ABI JSON
                below to interact with it.
              </p>
            </div>
            {error && <p className="text-xs text-red-600">{error}</p>}
            <textarea
              value={manualAbi}
              onChange={(e) => setManualAbi(e.target.value)}
              placeholder='[{"inputs":[],"name":"myFunction","outputs":[],"stateMutability":"nonpayable","type":"function"}]'
              rows={8}
              className="w-full px-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring font-mono resize-y"
            />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={loadSchema}>
                <RefreshCw className="h-4 w-4 mr-1" />
                Retry Auto-Detect
              </Button>
              <Button
                size="sm"
                onClick={loadFromManualAbi}
                disabled={!manualAbi.trim() || isLoading}
              >
                Load ABI
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalFunctions = readFunctions.length + writeFunctions.length;

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Contract"
        subtitle={
          <span>
            Interact with <span className="font-bold text-foreground">{contractLabel}</span>
            {totalFunctions > 0 && (
              <span className="text-muted-foreground"> — {totalFunctions} functions</span>
            )}
          </span>
        }
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={loadSchema}
            disabled={isLoading}
            className="gap-2"
          >
            <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
            Reload ABI
          </Button>
        }
      />

      {totalFunctions === 0 ? (
        <PageEmptyState
          title="No Functions"
          description="Contract ABI has no callable functions. Try reloading or adding the contract with a manual ABI."
          icon={Code}
        />
      ) : (
        <>
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search functions..."
              className="w-full pl-10 pr-4 py-2 text-sm border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Read functions */}
          {filteredReads.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Read Functions ({filteredReads.length})
              </h2>
              <div className="space-y-1.5">
                {filteredReads.map((fn) => (
                  <FunctionCard
                    key={fn.id}
                    fn={fn}
                    runtime={runtime!}
                    contractAddress={contractAddress}
                    contractSchema={schema!}
                    isConnected={!!connectedAddress}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Write functions */}
          {filteredWrites.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Write Functions ({filteredWrites.length})
              </h2>
              <div className="space-y-1.5">
                {filteredWrites.map((fn) => (
                  <FunctionCard
                    key={fn.id}
                    fn={fn}
                    runtime={runtime!}
                    contractAddress={contractAddress}
                    contractSchema={schema!}
                    isConnected={!!connectedAddress}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
