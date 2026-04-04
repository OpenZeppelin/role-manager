/**
 * Utility for building AccessManager role name lookup maps.
 * Shared between Targets page and Role Changes data hook.
 */

import {
  AM_ADMIN_ROLE_ID,
  AM_ADMIN_ROLE_NAME,
  AM_PUBLIC_ROLE_ID,
  AM_PUBLIC_ROLE_NAME,
} from '../constants';
import type { AccessManagerRole } from '../types/access-manager';

/**
 * Build a Map from roleId → display name, with known names for Admin and Public.
 * Roles with labels use the label; unlabeled roles fall back to "Role #N".
 */
export function buildRoleNameMap(
  roles: Pick<AccessManagerRole, 'roleId' | 'label'>[]
): Map<string, string> {
  const map = new Map<string, string>();
  const knownNames: Record<string, string> = {
    [AM_ADMIN_ROLE_ID]: AM_ADMIN_ROLE_NAME,
    [AM_PUBLIC_ROLE_ID]: AM_PUBLIC_ROLE_NAME,
  };
  for (const r of roles) {
    map.set(r.roleId, r.label ?? knownNames[r.roleId] ?? `Role #${r.roleId}`);
  }
  // Ensure Admin and Public always present
  if (!map.has(AM_ADMIN_ROLE_ID)) map.set(AM_ADMIN_ROLE_ID, AM_ADMIN_ROLE_NAME);
  if (!map.has(AM_PUBLIC_ROLE_ID)) map.set(AM_PUBLIC_ROLE_ID, AM_PUBLIC_ROLE_NAME);
  return map;
}
