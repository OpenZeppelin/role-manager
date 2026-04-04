/**
 * EVM AccessManager Service Implementation
 * Feature: 018-access-manager
 *
 * Implements AccessManagerService using viem public/wallet clients
 * to interact with OpenZeppelin AccessManager contracts on EVM chains.
 *
 * Role and target discovery relies on event logs (RoleGranted, TargetFunctionRoleUpdated, etc.)
 * since AccessManager doesn't provide enumeration functions on-chain.
 */

import type { Address, Hex, PublicClient } from 'viem';

import type { ExecutionConfig, OperationResult } from '@openzeppelin/ui-types';

import type {
  AccessManagerMember,
  AccessManagerRole,
  AccessManagerService,
  AccessManagerStatusCallback,
  CanCallResult,
  FunctionRoleMapping,
  ScheduledOperation,
  SyncReadOptions,
  TargetConfig,
} from '../../../types/access-manager';
import { ACCESS_MANAGER_ABI } from './accessManagerAbi';

// ============================================================================
// Implementation
// ============================================================================

/**
 * Provider function that returns a viem WalletClient on demand.
 * Called at transaction time so the wallet is only accessed when needed.
 * When using wagmi (the default), this returns the wagmi-managed client
 * which supports Safe, MetaMask, WalletConnect, and all wagmi connectors.
 */
export type WalletClientProvider = () => Promise<import('viem').WalletClient | null>;
export type AccessManagerTransactionExecutor = (
  transactionData: unknown,
  executionConfig: ExecutionConfig,
  onStatusChange: AccessManagerStatusCallback
) => Promise<OperationResult>;

export class EvmAccessManagerService implements AccessManagerService {
  private static readonly EXTERNAL_API_TIMEOUT_MS = 10_000;
  private deploymentBlockCache = new Map<string, bigint>();
  private walletClientProvider: WalletClientProvider | null = null;
  private transactionExecutor: AccessManagerTransactionExecutor | null = null;

  constructor(
    public readonly publicClient: PublicClient,
    _walletClient: unknown, // Kept for API compat
    private readonly chainId?: number,
    private readonly etherscanApiKey?: string
  ) {}

  /**
   * Set the wallet client provider. Called by useAccessManagerService
   * to inject the wagmi-managed wallet client from the adapter.
   */
  setWalletClientProvider(provider: WalletClientProvider): void {
    this.walletClientProvider = provider;
  }

  /**
   * Set the transaction executor. When available, write operations delegate to
   * the runtime execution capability so Safe/multisig flows behave the same as
   * the app's built-in access-control mutations.
   */
  setTransactionExecutor(executor: AccessManagerTransactionExecutor): void {
    this.transactionExecutor = executor;
  }

  /**
   * Get the deployment block of a contract.
   * Strategy: Sourcify (free, no rate limit) → Etherscan (with retry).
   * Caches the result per address.
   */
  async getDeploymentBlock(contractAddress: string): Promise<bigint> {
    const cached = this.deploymentBlockCache.get(contractAddress.toLowerCase());
    if (cached !== undefined) return cached;

    // Strategy 1: Sourcify — free, no API key, no rate limit
    const sourcifyBlock = await this.getDeploymentBlockFromSourcify(contractAddress);
    if (sourcifyBlock !== null) {
      this.deploymentBlockCache.set(contractAddress.toLowerCase(), sourcifyBlock);
      return sourcifyBlock;
    }

    // Strategy 2: Etherscan with retry
    if (this.chainId && this.etherscanApiKey) {
      const delays = [0, 2000, 5000];
      for (const delay of delays) {
        if (delay > 0) await new Promise((r) => setTimeout(r, delay));
        const block = await this.getDeploymentBlockFromEtherscan(contractAddress as Address);
        if (block !== null) {
          this.deploymentBlockCache.set(contractAddress.toLowerCase(), block);
          return block;
        }
      }
    }

    throw new Error(
      'Could not determine deployment block. Please verify the contract is deployed and verified on Sourcify or Etherscan.'
    );
  }

  /**
   * Fetch deployment block from Sourcify V2 API.
   * Free, no API key, no rate limit. Returns blockNumber directly.
   */
  /** Cache of deployer addresses from Sourcify */
  private deployerCache = new Map<string, string>();

  private async getDeploymentBlockFromSourcify(contractAddress: string): Promise<bigint | null> {
    try {
      const chainId = this.chainId ?? 1;
      const url = `https://sourcify.dev/server/v2/contract/${chainId}/${contractAddress}?fields=deployment`;
      const response = await fetch(url, {
        signal: AbortSignal.timeout(EvmAccessManagerService.EXTERNAL_API_TIMEOUT_MS),
      });
      if (!response.ok) return null;

      const data = (await response.json()) as {
        deployment?: { blockNumber: string; transactionHash: string; deployer?: string };
      };

      if (!data.deployment?.blockNumber) return null;

      // Cache the deployer address for ADMIN_ROLE seed checking
      if (data.deployment.deployer) {
        this.deployerCache.set(
          contractAddress.toLowerCase(),
          data.deployment.deployer.toLowerCase()
        );
      }

      return BigInt(data.deployment.blockNumber);
    } catch {
      return null;
    }
  }

  /** Get the deployer address (if known from Sourcify) */
  getDeployer(contractAddress: string): string | null {
    return this.deployerCache.get(contractAddress.toLowerCase()) ?? null;
  }

  /**
   * Fetch deployment tx from Etherscan V2 API (fallback).
   */
  private async getDeploymentBlockFromEtherscan(contractAddress: Address): Promise<bigint | null> {
    try {
      const url = `https://api.etherscan.io/v2/api?chainid=${this.chainId}&module=contract&action=getcontractcreation&contractaddresses=${contractAddress}&apikey=${this.etherscanApiKey}`;
      const response = await fetch(url, {
        signal: AbortSignal.timeout(EvmAccessManagerService.EXTERNAL_API_TIMEOUT_MS),
      });
      if (!response.ok) return null;

      const data = (await response.json()) as {
        status: string;
        result?: Array<{ txHash: string }>;
      };

      if (data.status !== '1' || !data.result?.[0]?.txHash) return null;

      const txReceipt = await this.publicClient.getTransactionReceipt({
        hash: data.result[0].txHash as Hex,
      });

      return txReceipt.blockNumber;
    } catch {
      return null;
    }
  }

  /** Max block range per getLogs call (most RPCs limit to 10k) */
  /** Max block range per getLogs call — kept low for public RPC compatibility (some limit to 1500) */
  private static readonly LOG_CHUNK_SIZE = 1_000n;

  /**
   * Fetch logs in chunks to respect RPC block range limits.
   * Returns untyped array — callers cast as needed.
   */

  private async getLogsChunked(params: {
    address: Address;
    event: any; // eslint-disable-line @typescript-eslint/no-explicit-any
    fromBlock: bigint;
    toBlock: bigint;
    onChunkComplete?: (scanned: bigint, total: bigint) => void;
  }): // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Promise<any[]> {
    const allLogs: unknown[] = [];
    let current = params.fromBlock;
    const total = params.toBlock - params.fromBlock + 1n;

    while (current <= params.toBlock) {
      const chunkEnd = current + EvmAccessManagerService.LOG_CHUNK_SIZE - 1n;
      const end = chunkEnd > params.toBlock ? params.toBlock : chunkEnd;

      const logs = await this.publicClient.getLogs({
        address: params.address,
        event: params.event,
        fromBlock: current,
        toBlock: end,
      });

      allLogs.push(...logs);
      current = end + 1n;

      params.onChunkComplete?.(end - params.fromBlock + 1n, total);

      // Small delay between chunks to avoid rate-limiting on public RPCs
      if (current <= params.toBlock) {
        await new Promise((r) => setTimeout(r, 100));
      }
    }

    return allLogs;
  }

  private async getLogsChunkedMulti(params: {
    address: Address;
    events: any[]; // eslint-disable-line @typescript-eslint/no-explicit-any
    fromBlock: bigint;
    toBlock: bigint;
    onChunkComplete?: (scanned: bigint, total: bigint) => void;
  }): // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Promise<any[]> {
    const allLogs: unknown[] = [];
    let current = params.fromBlock;
    const total = params.toBlock - params.fromBlock + 1n;

    while (current <= params.toBlock) {
      const chunkEnd = current + EvmAccessManagerService.LOG_CHUNK_SIZE - 1n;
      const end = chunkEnd > params.toBlock ? params.toBlock : chunkEnd;

      const logs = await this.publicClient.getLogs({
        address: params.address,
        events: params.events,
        fromBlock: current,
        toBlock: end,
      });

      allLogs.push(...logs);
      current = end + 1n;

      params.onChunkComplete?.(end - params.fromBlock + 1n, total);

      if (current <= params.toBlock) {
        await new Promise((r) => setTimeout(r, 100));
      }
    }

    return allLogs;
  }

  // ── Read Operations ──

  async getRoles(managerAddress: string, options?: SyncReadOptions): Promise<AccessManagerRole[]> {
    const address = managerAddress as Address;
    options?.onProgress?.({ phase: 'deployment-block' });
    const fromBlock = options?.fromBlock ?? (await this.getDeploymentBlock(address));
    const latestBlock = await this.publicClient.getBlockNumber();
    const blocksTotal = Number(latestBlock - fromBlock);

    options?.onProgress?.({ phase: 'scanning-events', blocksScanned: 0, blocksTotal });

    const toBlock = latestBlock;

    const roleLogs = await this.getLogsChunkedMulti({
      address,
      fromBlock,
      toBlock,
      onChunkComplete: (scanned, total) => {
        options?.onProgress?.({
          phase: 'scanning-events',
          blocksScanned: Number(scanned),
          blocksTotal: Number(total),
        });
      },
      events: [
        {
          type: 'event',
          name: 'RoleGranted',
          inputs: [
            { name: 'roleId', type: 'uint64', indexed: true },
            { name: 'account', type: 'address', indexed: true },
            { name: 'delay', type: 'uint32', indexed: false },
            { name: 'since', type: 'uint48', indexed: false },
            { name: 'newMember', type: 'bool', indexed: false },
          ],
        },
        {
          type: 'event',
          name: 'RoleRevoked',
          inputs: [
            { name: 'roleId', type: 'uint64', indexed: true },
            { name: 'account', type: 'address', indexed: true },
          ],
        },
        {
          type: 'event',
          name: 'RoleLabel',
          inputs: [
            { name: 'roleId', type: 'uint64', indexed: true },
            { name: 'label', type: 'string', indexed: false },
          ],
        },
      ],
    });
    const grantLogs = roleLogs.filter(
      (log: { eventName?: string }) => log.eventName === 'RoleGranted'
    );
    const revokeLogs = roleLogs.filter(
      (log: { eventName?: string }) => log.eventName === 'RoleRevoked'
    );
    const labelLogs = roleLogs.filter(
      (log: { eventName?: string }) => log.eventName === 'RoleLabel'
    );

    // Build label map (latest label wins)
    type LogEntry<T> = { args: T };
    const labels = new Map<string, string>();
    for (const log of labelLogs as LogEntry<{ roleId: bigint; label: string }>[]) {
      const roleId = String(log.args.roleId);
      labels.set(roleId, log.args.label);
    }

    // Build current membership: track grants and revokes
    const membershipMap = new Map<string, Set<string>>();
    const roleIds = new Set<string>();

    for (const log of grantLogs as LogEntry<{ roleId: bigint; account: string }>[]) {
      const roleId = String(log.args.roleId);
      const account = log.args.account;
      roleIds.add(roleId);
      if (!membershipMap.has(roleId)) membershipMap.set(roleId, new Set());
      membershipMap.get(roleId)!.add(account.toLowerCase());
    }

    for (const log of revokeLogs as LogEntry<{ roleId: bigint; account: string }>[]) {
      const roleId = String(log.args.roleId);
      const account = log.args.account;
      membershipMap.get(roleId)?.delete(account.toLowerCase());
    }

    // Always include ADMIN_ROLE (0)
    roleIds.add('0');

    // Seed ADMIN_ROLE check with deployer address (may have been granted off-event)
    const deployer = this.getDeployer(managerAddress);
    if (deployer) {
      if (!membershipMap.has('0')) membershipMap.set('0', new Set());
      // Check if deployer still has admin role on-chain
      try {
        const [isMember] = (await this.publicClient.readContract({
          address,
          abi: ACCESS_MANAGER_ABI,
          functionName: 'hasRole',
          args: [0n, deployer as Address],
        })) as unknown as [boolean, number];
        if (isMember) membershipMap.get('0')!.add(deployer);
      } catch {
        /* ignore */
      }
    }

    options?.onProgress?.({
      phase: 'fetching-metadata',
      blocksScanned: blocksTotal,
      blocksTotal,
      rolesFound: roleIds.size,
    });

    // Fetch metadata for each role
    const roles: AccessManagerRole[] = [];

    for (const roleId of roleIds) {
      const roleIdBigInt = BigInt(roleId);

      // Fetch metadata with fallbacks — some contracts may not implement all functions
      const safeRead = async <T>(fn: string, args: unknown[], fallback: T): Promise<T> => {
        try {
          return (await this.publicClient.readContract({
            address,
            abi: ACCESS_MANAGER_ABI,
            functionName: fn as 'getRoleAdmin',
            args: args as never,
          })) as T;
        } catch {
          return fallback;
        }
      };

      const [adminRoleId, guardianRoleId, grantDelay] = await Promise.all([
        safeRead<bigint>('getRoleAdmin', [roleIdBigInt], 0n),
        safeRead<bigint>('getRoleGuardian', [roleIdBigInt], 0n),
        safeRead<number>('getRoleGrantDelay', [roleIdBigInt], 0),
      ]);

      // Fetch member details
      const memberAddresses = Array.from(membershipMap.get(roleId) ?? []);
      const members: AccessManagerMember[] = [];

      for (const memberAddr of memberAddresses) {
        let since: bigint, currentDelay: number, pendingDelay: number, effect: bigint;
        try {
          const result = (await this.publicClient.readContract({
            address,
            abi: ACCESS_MANAGER_ABI,
            functionName: 'getAccess',
            args: [roleIdBigInt, memberAddr as Address],
          })) as unknown as [bigint, number, number, bigint];
          [since, currentDelay, pendingDelay, effect] = result;
        } catch {
          // If getAccess fails, exclude the member until a successful sync can confirm it.
          since = 0n;
          currentDelay = 0;
          pendingDelay = 0;
          effect = 0n;
        }

        const sinceNum = Number(since);
        // Only include if membership is active (since > 0 and since <= now)
        if (sinceNum > 0) {
          const member: AccessManagerMember = {
            address: memberAddr,
            since: sinceNum,
            executionDelay: currentDelay,
          };
          if (pendingDelay > 0) {
            member.pendingDelay = {
              newDelay: pendingDelay,
              effect: Number(effect),
            };
          }
          members.push(member);
        }
      }

      roles.push({
        roleId,
        label: labels.get(roleId) ?? null,
        adminRoleId: String(adminRoleId),
        guardianRoleId: String(guardianRoleId),
        grantDelay: Number(grantDelay),
        members,
      });
    }

    options?.onProgress?.({ phase: 'complete', rolesFound: roles.length });
    return roles;
  }

  async getEventHistory(
    managerAddress: string,
    options?: SyncReadOptions
  ): Promise<
    Array<{
      type: 'grant' | 'revoke' | 'target-role' | 'label';
      blockNumber: number;
      transactionHash: string;
      timestamp: number;
      roleId?: string;
      account?: string;
      target?: string;
      selector?: string;
      label?: string;
    }>
  > {
    const address = managerAddress as Address;
    const fromBlock = options?.fromBlock ?? (await this.getDeploymentBlock(address));
    const toBlock = await this.publicClient.getBlockNumber();

    type LogEntry<T> = { args: T; blockNumber: bigint; transactionHash: string };

    const historyLogs = await this.getLogsChunkedMulti({
      address,
      fromBlock,
      toBlock,
      events: [
        {
          type: 'event',
          name: 'RoleGranted',
          inputs: [
            { name: 'roleId', type: 'uint64', indexed: true },
            { name: 'account', type: 'address', indexed: true },
            { name: 'delay', type: 'uint32', indexed: false },
            { name: 'since', type: 'uint48', indexed: false },
            { name: 'newMember', type: 'bool', indexed: false },
          ],
        },
        {
          type: 'event',
          name: 'RoleRevoked',
          inputs: [
            { name: 'roleId', type: 'uint64', indexed: true },
            { name: 'account', type: 'address', indexed: true },
          ],
        },
        {
          type: 'event',
          name: 'TargetFunctionRoleUpdated',
          inputs: [
            { name: 'target', type: 'address', indexed: true },
            { name: 'selector', type: 'bytes4', indexed: false },
            { name: 'roleId', type: 'uint64', indexed: true },
          ],
        },
        {
          type: 'event',
          name: 'RoleLabel',
          inputs: [
            { name: 'roleId', type: 'uint64', indexed: true },
            { name: 'label', type: 'string', indexed: false },
          ],
        },
      ],
    });
    const grantLogs = historyLogs.filter(
      (log: { eventName?: string }) => log.eventName === 'RoleGranted'
    );
    const revokeLogs = historyLogs.filter(
      (log: { eventName?: string }) => log.eventName === 'RoleRevoked'
    );
    const targetRoleLogs = historyLogs.filter(
      (log: { eventName?: string }) => log.eventName === 'TargetFunctionRoleUpdated'
    );
    const labelLogs = historyLogs.filter(
      (log: { eventName?: string }) => log.eventName === 'RoleLabel'
    );

    type EventEntry = {
      type: 'grant' | 'revoke' | 'target-role' | 'label';
      blockNumber: number;
      transactionHash: string;
      timestamp: number;
      roleId?: string;
      account?: string;
      target?: string;
      selector?: string;
      label?: string;
    };

    const events: EventEntry[] = [];

    for (const log of grantLogs as LogEntry<{ roleId: bigint; account: string; since: bigint }>[]) {
      events.push({
        type: 'grant',
        blockNumber: Number(log.blockNumber),
        transactionHash: log.transactionHash,
        timestamp: Number(log.args.since),
        roleId: String(log.args.roleId),
        account: log.args.account,
      });
    }

    for (const log of revokeLogs as LogEntry<{ roleId: bigint; account: string }>[]) {
      events.push({
        type: 'revoke',
        blockNumber: Number(log.blockNumber),
        transactionHash: log.transactionHash,
        timestamp: 0,
        roleId: String(log.args.roleId),
        account: log.args.account,
      });
    }

    for (const log of targetRoleLogs as LogEntry<{
      target: string;
      selector: string;
      roleId: bigint;
    }>[]) {
      events.push({
        type: 'target-role',
        blockNumber: Number(log.blockNumber),
        transactionHash: log.transactionHash,
        timestamp: 0,
        roleId: String(log.args.roleId),
        target: log.args.target,
        selector: log.args.selector,
      });
    }

    for (const log of labelLogs as LogEntry<{ roleId: bigint; label: string }>[]) {
      events.push({
        type: 'label',
        blockNumber: Number(log.blockNumber),
        transactionHash: log.transactionHash,
        timestamp: 0,
        roleId: String(log.args.roleId),
        label: log.args.label,
      });
    }

    events.sort((a, b) => b.blockNumber - a.blockNumber);
    return events;
  }

  async getTargets(managerAddress: string, options?: SyncReadOptions): Promise<TargetConfig[]> {
    const address = managerAddress as Address;
    const fromBlock = options?.fromBlock ?? (await this.getDeploymentBlock(address));
    const toBlock = await this.publicClient.getBlockNumber();

    // Discover targets via TargetFunctionRoleUpdated events (chunked)
    const logs = (await this.getLogsChunked({
      address,
      fromBlock,
      toBlock,
      event: {
        type: 'event',
        name: 'TargetFunctionRoleUpdated',
        inputs: [
          { name: 'target', type: 'address', indexed: true },
          { name: 'selector', type: 'bytes4', indexed: false },
          { name: 'roleId', type: 'uint64', indexed: true },
        ],
      },
    })) as Array<{ args: { target: string; selector: string; roleId: bigint } }>;

    // Build target -> selector -> roleId map (latest event wins)
    const targetMap = new Map<string, Map<string, string>>();
    for (const log of logs) {
      const target = (log.args.target as string).toLowerCase();
      const selector = log.args.selector as string;
      const roleId = String(log.args.roleId);
      if (!targetMap.has(target)) targetMap.set(target, new Map());
      targetMap.get(target)!.set(selector, roleId);
    }

    const targets: TargetConfig[] = [];

    for (const [targetAddr, selectorMap] of targetMap) {
      const [isClosed, adminDelay] = await Promise.all([
        this.publicClient.readContract({
          address,
          abi: ACCESS_MANAGER_ABI,
          functionName: 'isTargetClosed',
          args: [targetAddr as Address],
        }) as Promise<boolean>,
        this.publicClient.readContract({
          address,
          abi: ACCESS_MANAGER_ABI,
          functionName: 'getTargetAdminDelay',
          args: [targetAddr as Address],
        }) as Promise<number>,
      ]);

      const functionRoles: FunctionRoleMapping[] = [];
      for (const [selector, roleId] of selectorMap) {
        functionRoles.push({ selector, roleId });
      }

      targets.push({
        target: targetAddr,
        isClosed,
        adminDelay: Number(adminDelay),
        functionRoles,
      });
    }

    return targets;
  }

  async getScheduledOperations(
    managerAddress: string,
    options?: SyncReadOptions
  ): Promise<ScheduledOperation[]> {
    const address = managerAddress as Address;
    const fromBlock = options?.fromBlock ?? (await this.getDeploymentBlock(address));
    const toBlock = await this.publicClient.getBlockNumber();

    const operationLogs = await this.getLogsChunkedMulti({
      address,
      fromBlock,
      toBlock,
      events: [
        {
          type: 'event',
          name: 'OperationScheduled',
          inputs: [
            { name: 'operationId', type: 'bytes32', indexed: true },
            { name: 'nonce', type: 'uint32', indexed: true },
            { name: 'schedule', type: 'uint48', indexed: false },
            { name: 'caller', type: 'address', indexed: false },
            { name: 'target', type: 'address', indexed: false },
            { name: 'data', type: 'bytes', indexed: false },
          ],
        },
        {
          type: 'event',
          name: 'OperationExecuted',
          inputs: [
            { name: 'operationId', type: 'bytes32', indexed: true },
            { name: 'nonce', type: 'uint32', indexed: true },
          ],
        },
        {
          type: 'event',
          name: 'OperationCanceled',
          inputs: [
            { name: 'operationId', type: 'bytes32', indexed: true },
            { name: 'nonce', type: 'uint32', indexed: true },
          ],
        },
      ],
    });
    const scheduledLogs = operationLogs.filter(
      (log: { eventName?: string }) => log.eventName === 'OperationScheduled'
    );
    const executedLogs = operationLogs.filter(
      (log: { eventName?: string }) => log.eventName === 'OperationExecuted'
    );
    const canceledLogs = operationLogs.filter(
      (log: { eventName?: string }) => log.eventName === 'OperationCanceled'
    );

    type LogWithArgs<T> = { args: T };
    const executedOps = new Set<string>();
    const canceledOps = new Set<string>();

    for (const log of executedLogs as LogWithArgs<{ operationId: string; nonce: bigint }>[]) {
      executedOps.add(`${log.args.operationId}-${log.args.nonce}`);
    }
    for (const log of canceledLogs as LogWithArgs<{ operationId: string; nonce: bigint }>[]) {
      canceledOps.add(`${log.args.operationId}-${log.args.nonce}`);
    }

    const expiration = (await this.publicClient.readContract({
      address,
      abi: ACCESS_MANAGER_ABI,
      functionName: 'expiration',
    })) as number;

    const now = Math.floor(Date.now() / 1000);
    const operations: ScheduledOperation[] = [];

    type ScheduledLog = LogWithArgs<{
      operationId: string;
      nonce: bigint;
      schedule: bigint;
      caller: string;
      target: string;
      data: string;
    }>;
    for (const log of scheduledLogs as ScheduledLog[]) {
      const opKey = `${log.args.operationId}-${log.args.nonce}`;
      if (executedOps.has(opKey) || canceledOps.has(opKey)) continue;

      const scheduleTime = Number(log.args.schedule);
      const isReady = now >= scheduleTime;
      const isExpired = now > scheduleTime + Number(expiration);

      if (isExpired) continue;

      operations.push({
        operationId: log.args.operationId,
        nonce: Number(log.args.nonce),
        schedule: scheduleTime,
        caller: log.args.caller,
        target: log.args.target,
        data: log.args.data,
        isReady,
        isExpired,
      });
    }

    return operations;
  }

  async canCall(
    managerAddress: string,
    caller: string,
    target: string,
    selector: string
  ): Promise<CanCallResult> {
    const [immediate, delay] = (await this.publicClient.readContract({
      address: managerAddress as Address,
      abi: ACCESS_MANAGER_ABI,
      functionName: 'canCall',
      args: [caller as Address, target as Address, selector as Hex],
    })) as [boolean, number];

    return { immediate, delay: Number(delay) };
  }

  async hasRole(
    managerAddress: string,
    roleId: string,
    account: string
  ): Promise<{ isMember: boolean; executionDelay: number }> {
    const [isMember, executionDelay] = (await this.publicClient.readContract({
      address: managerAddress as Address,
      abi: ACCESS_MANAGER_ABI,
      functionName: 'hasRole',
      args: [BigInt(roleId), account as Address],
    })) as [boolean, number];

    return { isMember, executionDelay: Number(executionDelay) };
  }

  // ── Write Operations ──

  /**
   * Get a wallet client for signing transactions.
   *
   * Strategy:
   * 1. Use wagmi-managed wallet client (via walletClientProvider) — supports
   *    Safe, MetaMask, WalletConnect, and all wagmi connectors. Chain switching
   *    is handled by wagmi/WalletSyncProvider.
   * 2. Fallback to window.ethereum (injected provider) — for standalone usage
   *    without wagmi.
   */
  private async getWalletClientLazy(): Promise<import('viem').WalletClient> {
    // Strategy 1: wagmi-managed wallet client (Safe-compatible)
    if (this.walletClientProvider) {
      const client = await this.walletClientProvider();
      if (client) return client;
    }

    // Strategy 2: fallback to injected provider (window.ethereum)
    const { createWalletClient, custom, defineChain } = await import('viem');
    const provider = (window as unknown as { ethereum?: unknown }).ethereum;
    if (!provider) throw new Error('No wallet detected. Please connect a wallet.');

    type EIP1193Provider = {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
    };
    const ethProvider = provider as EIP1193Provider;

    await ethProvider.request({ method: 'eth_requestAccounts' });

    // Switch wallet to target chain if mismatched.
    // Silently skip if the provider doesn't support switching (e.g., Safe).
    if (this.chainId) {
      try {
        const currentChainHex = (await ethProvider.request({ method: 'eth_chainId' })) as string;
        const currentChainId = parseInt(currentChainHex, 16);
        if (currentChainId !== this.chainId) {
          const targetHex = `0x${this.chainId.toString(16)}`;
          try {
            await ethProvider.request({
              method: 'wallet_switchEthereumChain',
              params: [{ chainId: targetHex }],
            });
          } catch (switchError) {
            const code = (switchError as { code?: number }).code;
            if (code === 4902) {
              // Chain not added — try adding it
              await ethProvider.request({
                method: 'wallet_addEthereumChain',
                params: [
                  {
                    chainId: targetHex,
                    chainName: `Chain ${this.chainId}`,
                    rpcUrls: [(this.publicClient.transport as { url?: string }).url ?? ''],
                    nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
                  },
                ],
              });
            } else if (code === 4200 || code === -32601) {
              // Method not supported (Safe, some wallets) — skip silently
            } else {
              throw switchError;
            }
          }
        }
      } catch (err) {
        // If chain detection itself fails (e.g., Safe), skip switching
        if (
          (err as { code?: number }).code !== 4200 &&
          (err as { code?: number }).code !== -32601
        ) {
          throw err;
        }
      }
    }

    const chain = this.chainId
      ? defineChain({
          id: this.chainId,
          name: `Chain ${this.chainId}`,
          nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
          rpcUrls: { default: { http: [] } },
        })
      : undefined;

    const client = createWalletClient({
      chain,
      transport: custom(provider as Parameters<typeof custom>[0]),
    });

    const [account] = await client.getAddresses();
    if (!account) throw new Error('No account connected');

    return createWalletClient({
      account,
      chain,
      transport: custom(provider as Parameters<typeof custom>[0]),
    });
  }

  private isSafeIframe(): boolean {
    return typeof window !== 'undefined' && window.parent !== window;
  }

  private async writeTxViaSafe(
    managerAddress: string,
    functionName: string,
    args: unknown[],
    onStatus: AccessManagerStatusCallback
  ): Promise<OperationResult> {
    const { encodeFunctionData } = await import('viem');
    const data = encodeFunctionData({
      abi: ACCESS_MANAGER_ABI,
      functionName: functionName as 'grantRole',
      args: args as never,
    });

    onStatus('pending' as never, {});

    const SafeAppsSDK = (await import('@safe-global/safe-apps-sdk')).default;
    const sdk = new SafeAppsSDK();
    const { safeTxHash } = await sdk.txs.send({
      txs: [
        {
          to: managerAddress,
          value: '0',
          data,
        },
      ],
    });

    return { id: safeTxHash };
  }

  private async writeTx(
    managerAddress: string,
    functionName: string,
    args: unknown[],
    config: ExecutionConfig,
    onStatus: AccessManagerStatusCallback
  ): Promise<OperationResult> {
    // Safe iframe: use Safe Apps SDK directly to create a proposal
    if (this.isSafeIframe()) {
      return this.writeTxViaSafe(managerAddress, functionName, args, onStatus);
    }

    const transactionData: Record<string, unknown> = {
      address: managerAddress as Address,
      abi: ACCESS_MANAGER_ABI,
      functionName: functionName as 'grantRole',
      args: args as never,
      value: 0n,
    };

    // Include chain so wagmi/viem writeContract doesn't fail with "No chain provided"
    if (this.chainId) {
      const { defineChain } = await import('viem');
      transactionData.chain = defineChain({
        id: this.chainId,
        name: `Chain ${this.chainId}`,
        nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
        rpcUrls: { default: { http: [] } },
      });
    }

    if (this.transactionExecutor) {
      try {
        return await this.transactionExecutor(transactionData, config, onStatus);
      } catch (error) {
        if (!this.shouldFallbackToDirectWalletExecution(error)) {
          throw error;
        }
      }
    }

    onStatus('pendingSignature', {});

    const walletClient = await this.getWalletClientLazy();

    const { encodeFunctionData } = await import('viem');
    const data = encodeFunctionData({
      abi: ACCESS_MANAGER_ABI,
      functionName: functionName as 'grantRole',
      args: args as never,
    });

    if (!walletClient.account) throw new Error('No account connected in wallet');

    const hash = await walletClient.sendTransaction({
      to: managerAddress as Address,
      data,
      chain: walletClient.chain ?? undefined,
      account: walletClient.account,
    });
    return { id: hash };
  }

  private shouldFallbackToDirectWalletExecution(error: unknown): boolean {
    const message = error instanceof Error ? error.message : String(error);
    const normalized = message.toLowerCase();

    return (
      normalized.includes('no chain was provided') ||
      (normalized.includes('walletclient') && normalized.includes('chain')) ||
      normalized.includes('chain argument')
    );
  }

  async grantRole(
    managerAddress: string,
    roleId: string,
    account: string,
    executionDelay: number,
    config: ExecutionConfig,
    onStatus: AccessManagerStatusCallback
  ): Promise<OperationResult> {
    return this.writeTx(
      managerAddress,
      'grantRole',
      [BigInt(roleId), account as Address, executionDelay],
      config,
      onStatus
    );
  }

  async revokeRole(
    managerAddress: string,
    roleId: string,
    account: string,
    config: ExecutionConfig,
    onStatus: AccessManagerStatusCallback
  ): Promise<OperationResult> {
    return this.writeTx(
      managerAddress,
      'revokeRole',
      [BigInt(roleId), account as Address],
      config,
      onStatus
    );
  }

  async renounceRole(
    managerAddress: string,
    roleId: string,
    callerConfirmation: string,
    config: ExecutionConfig,
    onStatus: AccessManagerStatusCallback
  ): Promise<OperationResult> {
    return this.writeTx(
      managerAddress,
      'renounceRole',
      [BigInt(roleId), callerConfirmation as Address],
      config,
      onStatus
    );
  }

  async labelRole(
    managerAddress: string,
    roleId: string,
    label: string,
    config: ExecutionConfig,
    onStatus: AccessManagerStatusCallback
  ): Promise<OperationResult> {
    return this.writeTx(managerAddress, 'labelRole', [BigInt(roleId), label], config, onStatus);
  }

  async setRoleAdmin(
    managerAddress: string,
    roleId: string,
    adminId: string,
    config: ExecutionConfig,
    onStatus: AccessManagerStatusCallback
  ): Promise<OperationResult> {
    return this.writeTx(
      managerAddress,
      'setRoleAdmin',
      [BigInt(roleId), BigInt(adminId)],
      config,
      onStatus
    );
  }

  async setRoleGuardian(
    managerAddress: string,
    roleId: string,
    guardianId: string,
    config: ExecutionConfig,
    onStatus: AccessManagerStatusCallback
  ): Promise<OperationResult> {
    return this.writeTx(
      managerAddress,
      'setRoleGuardian',
      [BigInt(roleId), BigInt(guardianId)],
      config,
      onStatus
    );
  }

  async setGrantDelay(
    managerAddress: string,
    roleId: string,
    delay: number,
    config: ExecutionConfig,
    onStatus: AccessManagerStatusCallback
  ): Promise<OperationResult> {
    return this.writeTx(managerAddress, 'setGrantDelay', [BigInt(roleId), delay], config, onStatus);
  }

  async setTargetFunctionRole(
    managerAddress: string,
    target: string,
    selectors: string[],
    roleId: string,
    config: ExecutionConfig,
    onStatus: AccessManagerStatusCallback
  ): Promise<OperationResult> {
    return this.writeTx(
      managerAddress,
      'setTargetFunctionRole',
      [target as Address, selectors as Hex[], BigInt(roleId)],
      config,
      onStatus
    );
  }

  async setTargetClosed(
    managerAddress: string,
    target: string,
    closed: boolean,
    config: ExecutionConfig,
    onStatus: AccessManagerStatusCallback
  ): Promise<OperationResult> {
    return this.writeTx(
      managerAddress,
      'setTargetClosed',
      [target as Address, closed],
      config,
      onStatus
    );
  }

  async setTargetAdminDelay(
    managerAddress: string,
    target: string,
    delay: number,
    config: ExecutionConfig,
    onStatus: AccessManagerStatusCallback
  ): Promise<OperationResult> {
    return this.writeTx(
      managerAddress,
      'setTargetAdminDelay',
      [target as Address, delay],
      config,
      onStatus
    );
  }

  async updateAuthority(
    managerAddress: string,
    target: string,
    newAuthority: string,
    config: ExecutionConfig,
    onStatus: AccessManagerStatusCallback
  ): Promise<OperationResult> {
    return this.writeTx(
      managerAddress,
      'updateAuthority',
      [target as Address, newAuthority as Address],
      config,
      onStatus
    );
  }

  async schedule(
    managerAddress: string,
    target: string,
    data: string,
    when: number,
    config: ExecutionConfig,
    onStatus: AccessManagerStatusCallback
  ): Promise<OperationResult> {
    return this.writeTx(
      managerAddress,
      'schedule',
      [target as Address, data as Hex, BigInt(when)],
      config,
      onStatus
    );
  }

  async execute(
    managerAddress: string,
    target: string,
    data: string,
    config: ExecutionConfig,
    onStatus: AccessManagerStatusCallback
  ): Promise<OperationResult> {
    return this.writeTx(
      managerAddress,
      'execute',
      [target as Address, data as Hex],
      config,
      onStatus
    );
  }

  async cancel(
    managerAddress: string,
    caller: string,
    target: string,
    data: string,
    config: ExecutionConfig,
    onStatus: AccessManagerStatusCallback
  ): Promise<OperationResult> {
    return this.writeTx(
      managerAddress,
      'cancel',
      [caller as Address, target as Address, data as Hex],
      config,
      onStatus
    );
  }
}

// ============================================================================
// Detection Helper
// ============================================================================

/**
 * Detect if a contract at the given address is an AccessManager.
 * Checks for the presence of canCall() and ADMIN_ROLE() returning uint64(0).
 */
export async function detectAccessManager(
  publicClient: PublicClient,
  contractAddress: Address
): Promise<boolean> {
  try {
    const adminRole = await publicClient.readContract({
      address: contractAddress,
      abi: ACCESS_MANAGER_ABI,
      functionName: 'ADMIN_ROLE',
    });
    // ADMIN_ROLE should return uint64(0)
    return adminRole === 0n;
  } catch {
    return false;
  }
}
