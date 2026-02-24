/**
 * RoleNameDisplay Component
 * Feature: 017-evm-access-control
 *
 * Displays a role name with proper rendering based on whether the name
 * is a human-readable label or a hash identifier:
 * - Labels: rendered as plain text (e.g., "Minter", "Admin")
 * - Hashes: rendered via AddressDisplay with truncation + copy-to-clipboard
 *
 * This component centralizes the hash/label display logic so that any
 * component rendering a role name gets consistent behavior without
 * duplicating the conditional rendering pattern.
 */

import { AddressDisplay } from '@openzeppelin/ui-components';

export interface RoleNameDisplayProps {
  /** Human-readable role name (capitalized label or truncated hash) */
  roleName: string;
  /** Raw role identifier (hash or constant string) */
  roleId: string;
  /** Whether the role name is a truncated hash requiring AddressDisplay */
  isHashDisplay: boolean;
  /** CSS class applied to the text wrapper (ignored for hash display) */
  className?: string;
  /** Number of leading characters to show for truncated hash display */
  startChars?: number;
  /** Number of trailing characters to show for truncated hash display */
  endChars?: number;
}

/**
 * Renders a role name as plain text or as a truncated hash with copy-to-clipboard.
 *
 * @example
 * ```tsx
 * // Label role: renders as plain text
 * <RoleNameDisplay roleName="Minter" roleId="0x9f2d..." isHashDisplay={false} />
 *
 * // Hash role: renders AddressDisplay with copy button
 * <RoleNameDisplay roleName="0x9f2d...abcd" roleId="0x9f2d..." isHashDisplay={true} />
 * ```
 */
export function RoleNameDisplay({
  roleName,
  roleId,
  isHashDisplay,
  className,
  startChars = 6,
  endChars = 4,
}: RoleNameDisplayProps): React.ReactElement {
  if (isHashDisplay) {
    return (
      <AddressDisplay
        address={roleId}
        truncate={true}
        startChars={startChars}
        endChars={endChars}
        showCopyButton={true}
        className={className}
      />
    );
  }

  return <span className={className}>{roleName}</span>;
}
