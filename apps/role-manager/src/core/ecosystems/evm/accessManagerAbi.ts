/**
 * AccessManager ABI (OpenZeppelin 5.x)
 * Feature: 018-access-manager
 *
 * Minimal ABI for read/write operations against an AccessManager contract.
 */

export const ACCESS_MANAGER_ABI = [
  // ── View Functions ──
  {
    type: 'function',
    name: 'ADMIN_ROLE',
    inputs: [],
    outputs: [{ name: '', type: 'uint64' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'PUBLIC_ROLE',
    inputs: [],
    outputs: [{ name: '', type: 'uint64' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'canCall',
    inputs: [
      { name: 'caller', type: 'address' },
      { name: 'target', type: 'address' },
      { name: 'selector', type: 'bytes4' },
    ],
    outputs: [
      { name: 'immediate', type: 'bool' },
      { name: 'delay', type: 'uint32' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'expiration',
    inputs: [],
    outputs: [{ name: '', type: 'uint32' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getAccess',
    inputs: [
      { name: 'roleId', type: 'uint64' },
      { name: 'account', type: 'address' },
    ],
    outputs: [
      { name: 'since', type: 'uint48' },
      { name: 'currentDelay', type: 'uint32' },
      { name: 'pendingDelay', type: 'uint32' },
      { name: 'effect', type: 'uint48' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getNonce',
    inputs: [{ name: 'id', type: 'bytes32' }],
    outputs: [{ name: '', type: 'uint32' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getRoleAdmin',
    inputs: [{ name: 'roleId', type: 'uint64' }],
    outputs: [{ name: '', type: 'uint64' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getRoleGrantDelay',
    inputs: [{ name: 'roleId', type: 'uint64' }],
    outputs: [{ name: '', type: 'uint32' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getRoleGuardian',
    inputs: [{ name: 'roleId', type: 'uint64' }],
    outputs: [{ name: '', type: 'uint64' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getSchedule',
    inputs: [{ name: 'id', type: 'bytes32' }],
    outputs: [{ name: '', type: 'uint48' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getTargetAdminDelay',
    inputs: [{ name: 'target', type: 'address' }],
    outputs: [{ name: '', type: 'uint32' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getTargetFunctionRole',
    inputs: [
      { name: 'target', type: 'address' },
      { name: 'selector', type: 'bytes4' },
    ],
    outputs: [{ name: '', type: 'uint64' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'hasRole',
    inputs: [
      { name: 'roleId', type: 'uint64' },
      { name: 'account', type: 'address' },
    ],
    outputs: [
      { name: 'isMember', type: 'bool' },
      { name: 'executionDelay', type: 'uint32' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'hashOperation',
    inputs: [
      { name: 'caller', type: 'address' },
      { name: 'target', type: 'address' },
      { name: 'data', type: 'bytes' },
    ],
    outputs: [{ name: '', type: 'bytes32' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'isTargetClosed',
    inputs: [{ name: 'target', type: 'address' }],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'minSetback',
    inputs: [],
    outputs: [{ name: '', type: 'uint32' }],
    stateMutability: 'view',
  },

  // ── Write Functions ──
  {
    type: 'function',
    name: 'grantRole',
    inputs: [
      { name: 'roleId', type: 'uint64' },
      { name: 'account', type: 'address' },
      { name: 'executionDelay', type: 'uint32' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'revokeRole',
    inputs: [
      { name: 'roleId', type: 'uint64' },
      { name: 'account', type: 'address' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'renounceRole',
    inputs: [
      { name: 'roleId', type: 'uint64' },
      { name: 'callerConfirmation', type: 'address' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'labelRole',
    inputs: [
      { name: 'roleId', type: 'uint64' },
      { name: 'label', type: 'string' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'setRoleAdmin',
    inputs: [
      { name: 'roleId', type: 'uint64' },
      { name: 'admin', type: 'uint64' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'setRoleGuardian',
    inputs: [
      { name: 'roleId', type: 'uint64' },
      { name: 'guardian', type: 'uint64' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'setGrantDelay',
    inputs: [
      { name: 'roleId', type: 'uint64' },
      { name: 'newDelay', type: 'uint32' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'setTargetFunctionRole',
    inputs: [
      { name: 'target', type: 'address' },
      { name: 'selectors', type: 'bytes4[]' },
      { name: 'roleId', type: 'uint64' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'setTargetClosed',
    inputs: [
      { name: 'target', type: 'address' },
      { name: 'closed', type: 'bool' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'setTargetAdminDelay',
    inputs: [
      { name: 'target', type: 'address' },
      { name: 'newDelay', type: 'uint32' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'updateAuthority',
    inputs: [
      { name: 'target', type: 'address' },
      { name: 'newAuthority', type: 'address' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'schedule',
    inputs: [
      { name: 'target', type: 'address' },
      { name: 'data', type: 'bytes' },
      { name: 'when', type: 'uint48' },
    ],
    outputs: [
      { name: 'operationId', type: 'bytes32' },
      { name: 'nonce', type: 'uint32' },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'execute',
    inputs: [
      { name: 'target', type: 'address' },
      { name: 'data', type: 'bytes' },
    ],
    outputs: [{ name: '', type: 'uint32' }],
    stateMutability: 'payable',
  },
  {
    type: 'function',
    name: 'cancel',
    inputs: [
      { name: 'caller', type: 'address' },
      { name: 'target', type: 'address' },
      { name: 'data', type: 'bytes' },
    ],
    outputs: [{ name: '', type: 'uint32' }],
    stateMutability: 'nonpayable',
  },

  // ── Events (for role/target discovery) ──
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
  {
    type: 'event',
    name: 'RoleAdminChanged',
    inputs: [
      { name: 'roleId', type: 'uint64', indexed: true },
      { name: 'admin', type: 'uint64', indexed: true },
    ],
  },
  {
    type: 'event',
    name: 'RoleGuardianChanged',
    inputs: [
      { name: 'roleId', type: 'uint64', indexed: true },
      { name: 'guardian', type: 'uint64', indexed: true },
    ],
  },
  {
    type: 'event',
    name: 'RoleGrantDelayChanged',
    inputs: [
      { name: 'roleId', type: 'uint64', indexed: true },
      { name: 'delay', type: 'uint32', indexed: false },
      { name: 'since', type: 'uint48', indexed: false },
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
    name: 'TargetClosed',
    inputs: [
      { name: 'target', type: 'address', indexed: true },
      { name: 'closed', type: 'bool', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'TargetAdminDelayUpdated',
    inputs: [
      { name: 'target', type: 'address', indexed: true },
      { name: 'delay', type: 'uint32', indexed: false },
      { name: 'since', type: 'uint48', indexed: false },
    ],
  },
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
] as const;
