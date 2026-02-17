/**
 * Tests for invalidationMap
 *
 * Verifies that each mutation type produces the correct set of query keys
 * for invalidation, and that the deferred refetch configuration is correct.
 */
import { describe, expect, it } from 'vitest';

import { invalidationMap, type MutationType } from '../invalidationMap';
import { queryKeys } from '../queryKeys';

const TEST_ADDRESS = '0xTEST_CONTRACT';

describe('invalidationMap', () => {
  // =========================================================================
  // Completeness
  // =========================================================================

  it('should have an entry for every MutationType', () => {
    const expectedTypes: MutationType[] = [
      'grantRole',
      'revokeRole',
      'renounceRole',
      'transferOwnership',
      'acceptOwnership',
      'renounceOwnership',
      'transferAdmin',
      'acceptAdmin',
      'cancelAdmin',
      'changeAdminDelay',
      'rollbackAdminDelay',
    ];

    for (const type of expectedTypes) {
      expect(invalidationMap[type]).toBeDefined();
      expect(invalidationMap[type].keys).toBeTypeOf('function');
    }
  });

  // =========================================================================
  // Role mutations
  // =========================================================================

  describe('role mutations', () => {
    it.each<MutationType>(['grantRole', 'revokeRole', 'renounceRole'])(
      '%s should invalidate roles, enrichedRoles, and history',
      (mutationType) => {
        const config = invalidationMap[mutationType];
        const keys = config.keys(TEST_ADDRESS);

        expect(keys).toContainEqual(queryKeys.contractRoles(TEST_ADDRESS));
        expect(keys).toContainEqual(queryKeys.contractRolesEnriched(TEST_ADDRESS));
        expect(keys).toContainEqual(queryKeys.contractHistory(TEST_ADDRESS));
      }
    );

    it.each<MutationType>(['grantRole', 'revokeRole', 'renounceRole'])(
      '%s should NOT have deferred refetch',
      (mutationType) => {
        expect(invalidationMap[mutationType].deferredRefetchMs).toBeUndefined();
      }
    );
  });

  // =========================================================================
  // Ownership mutations
  // =========================================================================

  describe('ownership mutations', () => {
    it('transferOwnership should invalidate ownership and history', () => {
      const keys = invalidationMap.transferOwnership.keys(TEST_ADDRESS);

      expect(keys).toContainEqual(queryKeys.contractOwnership(TEST_ADDRESS));
      expect(keys).toContainEqual(queryKeys.contractHistory(TEST_ADDRESS));
      // Should NOT invalidate roles (only initiating transfer)
      expect(keys).not.toContainEqual(queryKeys.contractRoles(TEST_ADDRESS));
    });

    it('transferOwnership should await-refetch ownership', () => {
      const awaitKeys = invalidationMap.transferOwnership.awaitRefetch!(TEST_ADDRESS);
      expect(awaitKeys).toContainEqual(queryKeys.contractOwnership(TEST_ADDRESS));
    });

    it('acceptOwnership should invalidate ownership, roles, enrichedRoles, and history', () => {
      const keys = invalidationMap.acceptOwnership.keys(TEST_ADDRESS);

      expect(keys).toContainEqual(queryKeys.contractOwnership(TEST_ADDRESS));
      expect(keys).toContainEqual(queryKeys.contractRoles(TEST_ADDRESS));
      expect(keys).toContainEqual(queryKeys.contractRolesEnriched(TEST_ADDRESS));
      expect(keys).toContainEqual(queryKeys.contractHistory(TEST_ADDRESS));
    });

    it('renounceOwnership should invalidate ownership, roles, enrichedRoles, and history', () => {
      const keys = invalidationMap.renounceOwnership.keys(TEST_ADDRESS);

      expect(keys).toContainEqual(queryKeys.contractOwnership(TEST_ADDRESS));
      expect(keys).toContainEqual(queryKeys.contractRoles(TEST_ADDRESS));
      expect(keys).toContainEqual(queryKeys.contractRolesEnriched(TEST_ADDRESS));
      expect(keys).toContainEqual(queryKeys.contractHistory(TEST_ADDRESS));
    });
  });

  // =========================================================================
  // Admin mutations
  // =========================================================================

  describe('admin mutations', () => {
    it('transferAdmin should invalidate adminInfo and history', () => {
      const keys = invalidationMap.transferAdmin.keys(TEST_ADDRESS);

      expect(keys).toContainEqual(queryKeys.contractAdminInfo(TEST_ADDRESS));
      expect(keys).toContainEqual(queryKeys.contractHistory(TEST_ADDRESS));
    });

    it('acceptAdmin should invalidate adminInfo, roles, enrichedRoles, and history', () => {
      const keys = invalidationMap.acceptAdmin.keys(TEST_ADDRESS);

      expect(keys).toContainEqual(queryKeys.contractAdminInfo(TEST_ADDRESS));
      expect(keys).toContainEqual(queryKeys.contractRoles(TEST_ADDRESS));
      expect(keys).toContainEqual(queryKeys.contractRolesEnriched(TEST_ADDRESS));
      expect(keys).toContainEqual(queryKeys.contractHistory(TEST_ADDRESS));
    });

    it.each<MutationType>(['cancelAdmin', 'changeAdminDelay', 'rollbackAdminDelay'])(
      '%s should have deferredRefetchMs of 3000',
      (mutationType) => {
        expect(invalidationMap[mutationType].deferredRefetchMs).toBe(3000);
      }
    );

    it.each<MutationType>(['cancelAdmin', 'changeAdminDelay', 'rollbackAdminDelay'])(
      '%s should invalidate adminInfo and history',
      (mutationType) => {
        const keys = invalidationMap[mutationType].keys(TEST_ADDRESS);

        expect(keys).toContainEqual(queryKeys.contractAdminInfo(TEST_ADDRESS));
        expect(keys).toContainEqual(queryKeys.contractHistory(TEST_ADDRESS));
      }
    );

    it.each<MutationType>(['cancelAdmin', 'changeAdminDelay', 'rollbackAdminDelay'])(
      '%s should await-refetch adminInfo',
      (mutationType) => {
        const awaitKeys = invalidationMap[mutationType].awaitRefetch!(TEST_ADDRESS);
        expect(awaitKeys).toContainEqual(queryKeys.contractAdminInfo(TEST_ADDRESS));
      }
    );
  });

  // =========================================================================
  // History invalidation (all mutations)
  // =========================================================================

  describe('history invalidation', () => {
    it('every mutation type should invalidate contractHistory', () => {
      const allTypes = Object.keys(invalidationMap) as MutationType[];

      for (const type of allTypes) {
        const keys = invalidationMap[type].keys(TEST_ADDRESS);
        expect(keys).toContainEqual(queryKeys.contractHistory(TEST_ADDRESS));
      }
    });
  });

  // =========================================================================
  // queryKeys consistency
  // =========================================================================

  describe('queryKeys module', () => {
    it('should produce stable key arrays for the same address', () => {
      const addr = '0xABC';
      expect(queryKeys.contractRoles(addr)).toEqual(['contractRoles', addr]);
      expect(queryKeys.contractRolesEnriched(addr)).toEqual(['contractRolesEnriched', addr]);
      expect(queryKeys.contractOwnership(addr)).toEqual(['contractOwnership', addr]);
      expect(queryKeys.contractAdminInfo(addr)).toEqual(['contractAdminInfo', addr]);
      expect(queryKeys.contractCapabilities(addr)).toEqual(['contractCapabilities', addr]);
      expect(queryKeys.contractHistory(addr)).toEqual(['contract-history', addr]);
      expect(queryKeys.currentBlock('net-1')).toEqual(['currentBlock', 'net-1']);
      expect(queryKeys.expirationMetadata(addr, 'ownership', 'net-1')).toEqual([
        'expirationMetadata',
        addr,
        'ownership',
        'net-1',
      ]);
    });
  });
});
