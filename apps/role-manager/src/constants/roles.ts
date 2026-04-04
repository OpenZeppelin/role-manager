/**
 * Role-related constants
 *
 * Centralized constants for role identifiers and names used across the app.
 */

// =============================================================================
// Owner Role Constants
// =============================================================================

/** Synthetic role ID for the contract owner */
export const OWNER_ROLE_ID = 'OWNER_ROLE';

/** Display name for the owner role */
export const OWNER_ROLE_NAME = 'Owner';

/** Default description for the owner role */
export const OWNER_ROLE_DESCRIPTION = 'Contract owner with full administrative privileges';

// =============================================================================
// Contract Admin Constants (Feature: 016-two-step-admin-assignment)
// =============================================================================

/**
 * Synthetic role ID for the contract admin (from getAdminInfo())
 *
 * This is DIFFERENT from the enumerated "ADMIN_ROLE" in AccessControl:
 * - CONTRACT_ADMIN: Single privileged account, transferred via two-step process
 * - ADMIN_ROLE: Standard AccessControl role that can have multiple members
 */
export const ADMIN_ROLE_ID = 'CONTRACT_ADMIN';

/** Display name for the contract admin role */
export const ADMIN_ROLE_NAME = 'Contract Admin';

/** Default description for the contract admin role */
export const ADMIN_ROLE_DESCRIPTION =
  'The Contract Admin has the highest privileges for managing access control settings. Transferred via two-step process.';

// =============================================================================
// AccessManager Role Constants (Feature: 018-access-manager)
// =============================================================================

/** AccessManager ADMIN_ROLE = uint64(0) */
export const AM_ADMIN_ROLE_ID = '0';

/** Display name for the AccessManager admin role */
export const AM_ADMIN_ROLE_NAME = 'Admin';

/** Default description for the AccessManager admin role */
export const AM_ADMIN_ROLE_DESCRIPTION =
  'Root authority role with full administrative privileges over the AccessManager.';

/** AccessManager PUBLIC_ROLE = type(uint64).max */
export const AM_PUBLIC_ROLE_ID = '18446744073709551615';

/** Display name for the AccessManager public role */
export const AM_PUBLIC_ROLE_NAME = 'Public';

/** Default description for the AccessManager public role */
export const AM_PUBLIC_ROLE_DESCRIPTION =
  'Special role that grants access to all accounts. Functions assigned to this role are callable by anyone.';
