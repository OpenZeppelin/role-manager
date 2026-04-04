import { afterEach, describe, expect, it, vi } from 'vitest';

import { AM_ADMIN_ROLE_ID, AM_PUBLIC_ROLE_ID } from '../../../../constants';
import { fetchRolesFromSubgraph } from '../accessManagerGraphql';

const getMock = vi.fn();

vi.mock('@openzeppelin/ui-utils', () => ({
  userNetworkServiceConfigService: {
    get: (...args: unknown[]) => getMock(...args),
  },
}));

describe('fetchRolesFromSubgraph', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    getMock.mockReset();
  });

  it('falls back to admin for missing adminRoleId and public for missing guardianRoleId', async () => {
    getMock.mockReturnValue({ accessControlIndexerUrl: 'https://indexer.test/graphql' });

    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          roles: {
            items: [
              {
                id: '0',
                label: 'Admin',
                adminRoleId: null,
                guardianRoleId: null,
                grantDelay: 0,
                memberCount: 0,
                members: { items: [] },
              },
            ],
          },
        },
      }),
    } as Response);

    const roles = await fetchRolesFromSubgraph(1, '0x1234', 'testnet');

    expect(roles).toEqual([
      {
        roleId: '0',
        label: 'Admin',
        adminRoleId: AM_ADMIN_ROLE_ID,
        guardianRoleId: AM_PUBLIC_ROLE_ID,
        grantDelay: 0,
        members: [],
      },
    ]);
  });
});
