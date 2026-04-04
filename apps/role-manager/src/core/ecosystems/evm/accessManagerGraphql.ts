/**
 * AccessManager GraphQL Client
 * Feature: 018-access-manager
 *
 * Primary data source for AccessManager data via Ponder subgraph.
 * All queries filter by both chainId and manager address to prevent
 * cross-contract data mixing when multiple AMs exist on the same chain.
 */

// =============================================================================
// Config
// =============================================================================

import { userNetworkServiceConfigService } from '@openzeppelin/ui-utils';

import { AM_ADMIN_ROLE_ID, AM_PUBLIC_ROLE_ID } from '../../../constants';
import type {
  AccessManagerMember,
  AccessManagerRole,
  FunctionRoleMapping,
  ScheduledOperation,
  TargetConfig,
} from '../../../types/access-manager';
import type { AccessManagerEventLog } from '../../storage/AccessManagerSyncStorage';

const SUBGRAPH_TIMEOUT = 10_000;

/**
 * Resolve the subgraph URL for a given network.
 * The subgraph indexes all contract types (AccessManager, AccessControl, Ownable).
 *
 * Priority:
 * 1. User-configured (Network Settings → "Access Control Indexer" tab)
 * 2. Environment variable (VITE_SUBGRAPH_URL — global fallback)
 * 3. null (not configured — falls back to on-chain event scanning)
 */
export function getSubgraphUrl(networkId?: string): string | null {
  // 1. User-configured per network (Network Settings → Access Control Indexer)
  if (networkId) {
    const userCfg = userNetworkServiceConfigService.get(networkId, 'access-control-indexer') as
      | { accessControlIndexerUrl?: string }
      | undefined;
    if (userCfg?.accessControlIndexerUrl) return userCfg.accessControlIndexerUrl;
  }

  // 2. Global env fallback
  const env = (import.meta as unknown as { env?: Record<string, string> }).env;
  return env?.VITE_SUBGRAPH_URL || null;
}

// =============================================================================
// GraphQL Queries (all filter by chainId + manager address)
// =============================================================================

const ROLES_QUERY = `
  query GetRoles($chainId: Int!, $manager: String!) {
    roles(where: { chainId: $chainId, manager: $manager }, limit: 100) {
      items {
        id
        label
        adminRoleId
        guardianRoleId
        grantDelay
        memberCount
        members(limit: 100) {
          items {
            account
            executionDelay
            since
          }
        }
      }
    }
  }
`;

const TARGETS_QUERY = `
  query GetTargets($chainId: Int!, $manager: String!) {
    targets(where: { chainId: $chainId, manager: $manager }, limit: 100) {
      items {
        address
        closed
        adminDelay
        functions(limit: 100) {
          items {
            selector
            roleId
          }
        }
      }
    }
  }
`;

const EVENTS_QUERY = `
  query GetEvents($chainId: Int!, $manager: String!) {
    accessManagerEvents(where: { chainId: $chainId, manager: $manager }, limit: 500, orderBy: "blockNumber", orderDirection: "desc") {
      items {
        blockNumber
        logIndex
        transactionHash
        timestamp
        eventType
        roleId
        account
        target
        selector
        label
      }
    }
  }
`;

const OPERATIONS_QUERY = `
  query GetOperations($chainId: Int!, $manager: String!) {
    operations(where: { chainId: $chainId, manager: $manager, status: SCHEDULED }, limit: 100, orderBy: "createdAt", orderDirection: "desc") {
      items {
        opId
        nonce
        schedule
        caller
        target
        data
        status
        createdAt
      }
    }
  }
`;

// =============================================================================
// GraphQL Client
// =============================================================================

async function gqlQuery<T>(
  query: string,
  variables: Record<string, unknown>,
  networkId?: string
): Promise<T | null> {
  const url = getSubgraphUrl(networkId);
  if (!url) return null;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), SUBGRAPH_TIMEOUT);

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) return null;

    const json = (await response.json()) as { data?: T; errors?: unknown[] };
    if (json.errors?.length) return null;

    return json.data ?? null;
  } catch {
    return null;
  }
}

// =============================================================================
// Public API
// =============================================================================

/** Session-level availability cache: avoids two HTTP requests on every 15s poll */
const availabilityCache = new Map<string, { available: boolean; checkedAt: number }>();
const AVAILABILITY_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Check if the subgraph is available and has data for this chain + manager.
 * Result is cached per session to avoid redundant _meta + roles queries on every poll.
 */
export async function isSubgraphAvailable(
  chainId: number,
  manager: string,
  networkId?: string
): Promise<boolean> {
  const key = `${chainId}:${manager.toLowerCase()}`;
  const cached = availabilityCache.get(key);
  if (cached && Date.now() - cached.checkedAt < AVAILABILITY_TTL_MS) {
    return cached.available;
  }

  const result = await gqlQuery<{ _meta: { status: unknown } }>(
    '{ _meta { status } }',
    {},
    networkId
  );
  if (!result) {
    availabilityCache.set(key, { available: false, checkedAt: Date.now() });
    return false;
  }

  const addr = manager.toLowerCase();
  const rolesCheck = await gqlQuery<{ roles: { totalCount: number } }>(
    'query($chainId: Int!, $manager: String!) { roles(where: { chainId: $chainId, manager: $manager }, limit: 1) { totalCount } }',
    { chainId, manager: addr },
    networkId
  );

  const available = rolesCheck?.roles?.totalCount !== undefined;
  availabilityCache.set(key, { available, checkedAt: Date.now() });
  return available;
}

/**
 * Fetch roles with members from subgraph for a specific manager contract.
 */
export async function fetchRolesFromSubgraph(
  chainId: number,
  manager: string,
  networkId?: string
): Promise<AccessManagerRole[] | null> {
  type RolesData = {
    roles: {
      items: Array<{
        id: string;
        label: string | null;
        adminRoleId: string | null;
        guardianRoleId: string | null;
        grantDelay: number;
        memberCount: number;
        members: {
          items: Array<{
            account: string;
            executionDelay: number;
            since: string;
          }>;
        };
      }>;
    };
  };

  const data = await gqlQuery<RolesData>(
    ROLES_QUERY,
    {
      chainId,
      manager: manager.toLowerCase(),
    },
    networkId
  );
  if (!data) return null;

  return data.roles.items.map((r) => ({
    roleId: String(r.id),
    label: r.label,
    adminRoleId: r.adminRoleId ? String(r.adminRoleId) : AM_ADMIN_ROLE_ID,
    guardianRoleId: r.guardianRoleId ? String(r.guardianRoleId) : AM_PUBLIC_ROLE_ID,
    grantDelay: r.grantDelay,
    members: r.members.items.map(
      (m): AccessManagerMember => ({
        address: m.account,
        executionDelay: m.executionDelay,
        since: Number(m.since),
      })
    ),
  }));
}

/**
 * Fetch targets with function-role mappings from subgraph for a specific manager.
 */
export async function fetchTargetsFromSubgraph(
  chainId: number,
  manager: string,
  networkId?: string
): Promise<TargetConfig[] | null> {
  type TargetsData = {
    targets: {
      items: Array<{
        address: string;
        closed: boolean;
        adminDelay: number;
        functions: {
          items: Array<{
            selector: string;
            roleId: string;
          }>;
        };
      }>;
    };
  };

  const data = await gqlQuery<TargetsData>(
    TARGETS_QUERY,
    {
      chainId,
      manager: manager.toLowerCase(),
    },
    networkId
  );
  if (!data) return null;

  return data.targets.items.map((t) => ({
    target: t.address,
    isClosed: t.closed,
    adminDelay: t.adminDelay,
    functionRoles: t.functions.items.map(
      (f): FunctionRoleMapping => ({
        selector: f.selector,
        roleId: String(f.roleId),
      })
    ),
  }));
}

/**
 * Fetch scheduled operations from subgraph for a specific manager.
 */
export async function fetchOperationsFromSubgraph(
  chainId: number,
  manager: string,
  networkId?: string
): Promise<ScheduledOperation[] | null> {
  type OpsData = {
    operations: {
      items: Array<{
        opId: string;
        nonce: number;
        schedule: string;
        caller: string;
        target: string;
        data: string;
        status: string;
        createdAt: string;
      }>;
    };
  };

  const data = await gqlQuery<OpsData>(
    OPERATIONS_QUERY,
    {
      chainId,
      manager: manager.toLowerCase(),
    },
    networkId
  );
  if (!data) return null;

  const now = Math.floor(Date.now() / 1000);

  return data.operations.items.map((op) => {
    const schedule = Number(op.schedule);
    return {
      operationId: op.opId,
      nonce: op.nonce,
      schedule,
      caller: op.caller,
      target: op.target,
      data: op.data,
      isReady: now >= schedule,
      isExpired: false, // Subgraph only returns SCHEDULED
    };
  });
}

/**
 * Fetch event history from subgraph for a specific manager.
 * Returns real events with transaction hashes from Ponder's indexed event tables.
 */
export async function fetchEventsFromSubgraph(
  chainId: number,
  manager: string,
  networkId?: string
): Promise<AccessManagerEventLog[] | null> {
  type EventsData = {
    accessManagerEvents: {
      items: Array<{
        blockNumber: string;
        transactionHash: string;
        timestamp: string;
        eventType: string;
        roleId: string | null;
        account: string | null;
        target: string | null;
        selector: string | null;
        label: string | null;
      }>;
    };
  };

  const data = await gqlQuery<EventsData>(
    EVENTS_QUERY,
    {
      chainId,
      manager: manager.toLowerCase(),
    },
    networkId
  );
  if (!data) return null;

  return data.accessManagerEvents.items.map((e) => ({
    type: e.eventType as AccessManagerEventLog['type'],
    blockNumber: Number(e.blockNumber),
    transactionHash: e.transactionHash,
    timestamp: Number(e.timestamp),
    roleId: e.roleId ? String(e.roleId) : undefined,
    account: e.account ?? undefined,
    target: e.target ?? undefined,
    selector: e.selector ?? undefined,
    label: e.label ?? undefined,
  }));
}

/**
 * Build event history from role members (grant events).
 * Fallback when subgraph event tables are unavailable.
 * Members have `since` timestamps but no transaction hashes.
 */
export function buildEventHistoryFromRoles(roles: AccessManagerRole[]): AccessManagerEventLog[] {
  const events: AccessManagerEventLog[] = [];

  for (const role of roles) {
    for (const member of role.members) {
      events.push({
        type: 'grant',
        blockNumber: 0,
        transactionHash: '',
        timestamp: member.since,
        roleId: role.roleId,
        account: member.address,
      });
    }
  }

  events.sort((a, b) => b.timestamp - a.timestamp);
  return events;
}
