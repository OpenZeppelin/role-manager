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
// Admin Role Constants (Feature: 016-two-step-admin-assignment)
// =============================================================================

/** Synthetic role ID for the contract admin */
export const ADMIN_ROLE_ID = 'ADMIN_ROLE';

/** Display name for the admin role */
export const ADMIN_ROLE_NAME = 'Admin';

/** Default description for the admin role */
export const ADMIN_ROLE_DESCRIPTION =
  'The Admin role has elevated privileges for managing access control settings.';
