/**
 * RoleIdentifiersTable - Read-only reference table of role identifiers
 * Feature: 008-roles-page-layout, 009-roles-page-data
 *
 * Displays all available role identifiers with names and descriptions.
 * No interactive elements—purely informational per FR-023.
 *
 * Updated in spec 009 (T045):
 * - Accepts real RoleIdentifier[] from useRolesPageData
 * - T046: Handles hash identifiers with proper truncation display
 */

import { cn, truncateMiddle } from '@openzeppelin/ui-builder-utils';

import type { RoleIdentifier } from '../../types/roles';
import { isHash } from '../../utils/hash';

/**
 * Format identifier for display, truncating long hashes.
 * Uses truncateMiddle from shared utils for consistent formatting.
 * Full hash shown on hover via title attribute.
 */
function formatIdentifier(identifier: string): { display: string; isTruncated: boolean } {
  if (!isHash(identifier)) {
    return { display: identifier, isTruncated: false };
  }
  // Truncate long hashes for display using shared utility
  if (identifier.length > 16) {
    const startChars = identifier.startsWith('0x') ? 10 : 8;
    return {
      display: truncateMiddle(identifier, startChars, 6),
      isTruncated: true,
    };
  }
  return { display: identifier, isTruncated: false };
}

/**
 * Props for the RoleIdentifiersTable component
 */
export interface RoleIdentifiersTableProps {
  /** Array of role identifiers to display */
  identifiers: RoleIdentifier[];
  /** Additional CSS classes */
  className?: string;
}

/**
 * Read-only reference table displaying all available role identifiers
 *
 * @example
 * <RoleIdentifiersTable identifiers={mockRoleIdentifiers} />
 */
export function RoleIdentifiersTable({ identifiers, className }: RoleIdentifiersTableProps) {
  return (
    <div className={cn('space-y-4', className)}>
      {/* Section Header */}
      <div className="space-y-1">
        <h2 className="text-xl font-semibold">Available Role Identifiers</h2>
        <p className="text-sm text-muted-foreground">
          Reference table of all role identifiers available in this contract
        </p>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left font-semibold">Role Identifier</th>
              <th className="px-4 py-3 text-left font-semibold">Name</th>
              <th className="px-4 py-3 text-left font-semibold">Description</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {identifiers.map((identifier) => {
              const formatted = formatIdentifier(identifier.identifier);
              return (
                <tr key={identifier.identifier} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <code
                      className="rounded bg-muted px-2 py-1 font-mono text-xs"
                      title={formatted.isTruncated ? identifier.identifier : undefined}
                    >
                      {formatted.display}
                    </code>
                  </td>
                  <td className="px-4 py-3 font-medium">{identifier.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {identifier.description || (
                      <span className="text-muted-foreground/60 italic">No description</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
