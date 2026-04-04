/**
 * useAccessManagerSync hook
 * Feature: 018-access-manager
 *
 * Data fetching strategy:
 * 1. GraphQL subgraph (primary) — instant, complete data
 * 2. Event scanning (fallback) — slow, used when subgraph unavailable
 * 3. IndexedDB cache — loaded on mount for instant display
 * 4. 15s polling for live updates
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import {
  buildEventHistoryFromRoles,
  fetchEventsFromSubgraph,
  fetchOperationsFromSubgraph,
  fetchRolesFromSubgraph,
  fetchTargetsFromSubgraph,
  isSubgraphAvailable,
} from '../core/ecosystems/evm/accessManagerGraphql';
import {
  accessManagerSyncStorage,
  type AccessManagerEventLog,
} from '../core/storage/AccessManagerSyncStorage';
import type {
  AccessManagerRole,
  AccessManagerService,
  ScheduledOperation,
  SyncProgress,
  TargetConfig,
} from '../types/access-manager';

export interface UseAccessManagerSyncReturn {
  roles: AccessManagerRole[];
  targets: TargetConfig[];
  operations: ScheduledOperation[];
  eventHistory: AccessManagerEventLog[];
  /** Operation expiration window in seconds (default 1 week) */
  expiration: number | null;
  /** Minimum setback for delay changes in seconds (default 5 days) */
  minSetback: number | null;
  isLoading: boolean;
  isSyncing: boolean;
  syncProgress: SyncProgress | null;
  lastSyncedAt: number | null;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useAccessManagerSync(
  service: AccessManagerService | null,
  contractAddress: string,
  chainId: number = 0,
  networkId: string,
  enabled: boolean = true
): UseAccessManagerSyncReturn {
  const [roles, setRoles] = useState<AccessManagerRole[]>([]);
  const [targets, setTargets] = useState<TargetConfig[]>([]);
  const [operations, setOperations] = useState<ScheduledOperation[]>([]);
  const [eventHistory, setEventHistory] = useState<AccessManagerEventLog[]>([]);
  const [expiration, setExpiration] = useState<number | null>(null);
  const [minSetback, setMinSetback] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState<SyncProgress | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const syncRef = useRef(0);
  const hasCacheRef = useRef(false);
  const [syncTrigger, setSyncTrigger] = useState(0);

  // Load from cache on mount / contract change
  const prevContractRef = useRef('');
  useEffect(() => {
    const key = `${contractAddress}:${networkId}`;
    if (!contractAddress || !networkId) return;
    if (prevContractRef.current === key) return;
    prevContractRef.current = key;

    // Clear stale data immediately to prevent cross-contract leaks
    setRoles([]);
    setTargets([]);
    setOperations([]);
    setEventHistory([]);
    setExpiration(null);
    setMinSetback(null);
    setLastSyncedAt(null);
    setError(null);

    let cancelled = false;

    (async () => {
      const cached = await accessManagerSyncStorage.get(networkId, contractAddress);
      if (cancelled) return;

      if (cached) {
        hasCacheRef.current = true;
        setRoles(cached.roles);
        setTargets(cached.targets);
        setOperations(cached.operations);
        setEventHistory(cached.eventHistory ?? []);
        setLastSyncedAt(cached.syncedAt);
        setIsLoading(false);
      } else {
        hasCacheRef.current = false;
        setIsLoading(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [contractAddress, networkId]);

  // Sync: GraphQL primary, event scanning fallback, 15s poll
  useEffect(() => {
    if (!enabled || !service || !contractAddress || !networkId) return;

    const syncId = ++syncRef.current;
    let cancelled = false;
    let pollTimer: ReturnType<typeof setTimeout> | null = null;

    const runSync = async (isInitial: boolean) => {
      if (cancelled || syncId !== syncRef.current) return;

      if (isInitial) {
        setIsSyncing(true);
        setError(null);
      }

      try {
        // ── Strategy 1: GraphQL subgraph (primary) ──
        // Queries filter by both chainId AND manager address, so data is
        // scoped to the specific AM contract (no cross-contract mixing).
        if (chainId > 0) {
          const result = await syncViaSubgraph(
            chainId,
            contractAddress,
            isInitial,
            syncId,
            cancelled
          );
          if (result) {
            applyResult(result);
            return;
          }
        }

        // ── Strategy 2: Event scanning (fallback) ──
        if (isInitial) setSyncProgress({ phase: 'deployment-block' });
        const result = await syncViaEvents(
          service,
          contractAddress,
          networkId,
          isInitial,
          syncId,
          cancelled
        );
        if (result) {
          applyResult(result);
        }
      } catch (err) {
        if (cancelled || syncId !== syncRef.current) return;
        if (isInitial) {
          setError(err instanceof Error ? err : new Error(String(err)));
          setIsLoading(false);
        }
      } finally {
        if (syncId === syncRef.current) {
          setIsSyncing(false);
          setSyncProgress(null);
        }
      }
    };

    function applyResult(result: SyncResult) {
      if (cancelled || syncId !== syncRef.current) return;
      setRoles(result.roles);
      setTargets(result.targets);
      setOperations(result.operations);
      setEventHistory(result.eventHistory);
      setLastSyncedAt(result.syncedAt);
      setIsLoading(false);
      setError(null);

      // Read global config (expiration, minSetback) only once per contract (they rarely change)
      const svc = service as
        | import('../core/ecosystems/evm/EvmAccessManagerService').EvmAccessManagerService
        | null;
      if (svc?.publicClient && contractAddress && expiration === null) {
        const abi = [
          {
            type: 'function',
            name: 'expiration',
            inputs: [],
            outputs: [{ type: 'uint32' }],
            stateMutability: 'view',
          },
          {
            type: 'function',
            name: 'minSetback',
            inputs: [],
            outputs: [{ type: 'uint32' }],
            stateMutability: 'view',
          },
        ] as const;
        const addr = contractAddress as `0x${string}`;
        Promise.all([
          svc.publicClient.readContract({ address: addr, abi, functionName: 'expiration' }),
          svc.publicClient.readContract({ address: addr, abi, functionName: 'minSetback' }),
        ])
          .then(([exp, msb]) => {
            if (syncId === syncRef.current) {
              setExpiration(Number(exp));
              setMinSetback(Number(msb));
            }
          })
          .catch(() => {
            /* non-fatal */
          });
      }
    }

    async function syncViaSubgraph(
      cid: number,
      addr: string,
      isInitial: boolean,
      sid: number,
      canc: boolean
    ): Promise<SyncResult | null> {
      try {
        const available = await isSubgraphAvailable(cid, addr, networkId);
        if (!available || canc || sid !== syncRef.current) return null;

        if (isInitial) setSyncProgress({ phase: 'fetching-metadata' });

        const [gqlRoles, gqlTargets, gqlOps] = await Promise.all([
          fetchRolesFromSubgraph(cid, addr, networkId),
          fetchTargetsFromSubgraph(cid, addr, networkId),
          fetchOperationsFromSubgraph(cid, addr, networkId),
        ]);

        if (!gqlRoles || canc || sid !== syncRef.current) return null;

        // Fetch events with tx hashes from subgraph
        let evtHistory = await fetchEventsFromSubgraph(cid, addr, networkId);

        // Fallback: synthesize from member data (no tx hashes)
        if (!evtHistory || evtHistory.length === 0) {
          evtHistory = buildEventHistoryFromRoles(gqlRoles);
        }

        if (canc || sid !== syncRef.current) return null;

        const now = Date.now();

        if (isInitial) setSyncProgress({ phase: 'complete', rolesFound: gqlRoles.length });

        // Cache for offline access
        await accessManagerSyncStorage.save({
          networkId,
          address: contractAddress,
          lastSyncedBlock: 0,
          deploymentBlock: 0,
          roles: gqlRoles,
          targets: gqlTargets ?? [],
          operations: gqlOps ?? [],
          eventHistory: evtHistory,
          syncedAt: now,
        });

        return {
          roles: gqlRoles,
          targets: gqlTargets ?? [],
          operations: gqlOps ?? [],
          eventHistory: evtHistory,
          syncedAt: now,
        };
      } catch {
        return null; // Subgraph failed — fall through to event scanning
      }
    }

    async function syncViaEvents(
      svc: AccessManagerService,
      addr: string,
      netId: string,
      isInitial: boolean,
      sid: number,
      canc: boolean
    ): Promise<SyncResult | null> {
      const cached = await accessManagerSyncStorage.get(netId, addr);
      if (canc || sid !== syncRef.current) return null;

      let deploymentBlock: bigint;
      if (cached?.deploymentBlock) {
        deploymentBlock = BigInt(cached.deploymentBlock);
      } else {
        if (isInitial) setSyncProgress({ phase: 'deployment-block' });
        deploymentBlock = await svc.getDeploymentBlock(addr);
      }

      if (canc || sid !== syncRef.current) return null;

      const fromBlock = cached?.lastSyncedBlock
        ? BigInt(cached.lastSyncedBlock) + 1n
        : deploymentBlock;

      const syncedRoles = await svc.getRoles(addr, {
        fromBlock,
        onProgress: isInitial
          ? (p) => {
              if (sid === syncRef.current) setSyncProgress(p);
            }
          : undefined,
      });

      if (canc || sid !== syncRef.current) return null;

      const [syncedTargets, syncedOperations, syncedEvents] = await Promise.all([
        svc.getTargets(addr, { fromBlock }),
        svc.getScheduledOperations(addr, { fromBlock }),
        svc.getEventHistory?.(addr, { fromBlock }) ?? Promise.resolve([]),
      ]);

      if (canc || sid !== syncRef.current) return null;

      const newEventLogs: AccessManagerEventLog[] = syncedEvents.map((e) => ({
        type: e.type as AccessManagerEventLog['type'],
        blockNumber: e.blockNumber,
        transactionHash: e.transactionHash,
        timestamp: e.timestamp,
        roleId: e.roleId,
        account: e.account,
        target: e.target,
        selector: (e as { selector?: string }).selector,
        label: e.label,
      }));

      let finalRoles = syncedRoles;
      let finalTargets = syncedTargets;
      let finalOperations = syncedOperations;
      let finalEventHistory = newEventLogs;

      if (cached && cached.lastSyncedBlock > 0) {
        finalRoles = mergeRoles(cached.roles, syncedRoles);
        finalTargets = mergeTargets(cached.targets, syncedTargets);
        finalOperations = mergeOperations(cached.operations, syncedOperations);
        finalEventHistory = mergeEventHistory(cached.eventHistory ?? [], newEventLogs);
      }

      let latestBlock = 0n;
      try {
        const svcAny = svc as unknown as {
          publicClient: { getBlockNumber: () => Promise<bigint> };
        };
        if (svcAny.publicClient?.getBlockNumber)
          latestBlock = await svcAny.publicClient.getBlockNumber();
      } catch {
        /* ignore */
      }

      const now = Date.now();
      await accessManagerSyncStorage.save({
        networkId: netId,
        address: addr,
        lastSyncedBlock: Number(latestBlock),
        deploymentBlock: Number(deploymentBlock),
        roles: finalRoles,
        targets: finalTargets,
        operations: finalOperations,
        eventHistory: finalEventHistory,
        syncedAt: now,
      });

      return {
        roles: finalRoles,
        targets: finalTargets,
        operations: finalOperations,
        eventHistory: finalEventHistory,
        syncedAt: now,
      };
    }

    // Initial sync then poll
    runSync(true).then(() => {
      if (cancelled || syncId !== syncRef.current) return;
      const poll = () => {
        if (cancelled || syncId !== syncRef.current) return;
        pollTimer = setTimeout(async () => {
          await runSync(false);
          poll();
        }, 15_000);
      };
      poll();
    });

    return () => {
      cancelled = true;
      if (pollTimer) clearTimeout(pollTimer);
    };
  }, [enabled, service, contractAddress, chainId, networkId, syncTrigger]);

  const refetch = useCallback(async () => {
    if (!contractAddress || !networkId) return;
    await accessManagerSyncStorage.clear(networkId, contractAddress);
    hasCacheRef.current = false;
    setIsLoading(true);
    setRoles([]);
    setTargets([]);
    setOperations([]);
    setEventHistory([]);
    setLastSyncedAt(null);
    setSyncTrigger((n) => n + 1);
  }, [contractAddress, networkId]);

  return {
    roles,
    targets,
    operations,
    eventHistory,
    expiration,
    minSetback,
    isLoading,
    isSyncing,
    syncProgress,
    lastSyncedAt,
    error,
    refetch,
  };
}

// =============================================================================
// Types & Helpers
// =============================================================================

interface SyncResult {
  roles: AccessManagerRole[];
  targets: TargetConfig[];
  operations: ScheduledOperation[];
  eventHistory: AccessManagerEventLog[];
  syncedAt: number;
}

function mergeRoles(cached: AccessManagerRole[], fresh: AccessManagerRole[]): AccessManagerRole[] {
  const map = new Map<string, AccessManagerRole>();
  for (const role of cached) map.set(role.roleId, role);
  for (const role of fresh) {
    const existing = map.get(role.roleId);
    if (!existing) {
      map.set(role.roleId, role);
    } else if (role.members.length > 0) {
      const memberMap = new Map<string, (typeof role.members)[0]>();
      for (const m of existing.members) memberMap.set(m.address.toLowerCase(), m);
      for (const m of role.members) memberMap.set(m.address.toLowerCase(), m);
      map.set(role.roleId, { ...role, members: Array.from(memberMap.values()) });
    } else {
      map.set(role.roleId, { ...role, members: existing.members });
    }
  }
  return Array.from(map.values());
}

function mergeTargets(cached: TargetConfig[], fresh: TargetConfig[]): TargetConfig[] {
  const map = new Map<string, TargetConfig>();
  for (const t of cached) map.set(t.target, t);
  for (const t of fresh) map.set(t.target, t);
  return Array.from(map.values());
}

function mergeOperations(
  cached: ScheduledOperation[],
  fresh: ScheduledOperation[]
): ScheduledOperation[] {
  const map = new Map<string, ScheduledOperation>();
  for (const op of cached) map.set(op.operationId, op);
  for (const op of fresh) map.set(op.operationId, op);
  return Array.from(map.values());
}

function mergeEventHistory(
  cached: AccessManagerEventLog[],
  fresh: AccessManagerEventLog[]
): AccessManagerEventLog[] {
  const map = new Map<string, AccessManagerEventLog>();
  for (const e of cached) map.set(`${e.transactionHash}-${e.type}-${e.roleId}-${e.account}`, e);
  for (const e of fresh) map.set(`${e.transactionHash}-${e.type}-${e.roleId}-${e.account}`, e);
  return Array.from(map.values()).sort((a, b) => b.blockNumber - a.blockNumber);
}
