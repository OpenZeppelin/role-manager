/**
 * RoleIdentifiersTable - Read-only reference table of role identifiers
 * Feature: 008-roles-page-layout
 *
 * Displays all available role identifiers with names and descriptions.
 * No interactive elements—purely informational per FR-023.
 */

import { cn } from '@openzeppelin/ui-builder-utils';

import type { RoleIdentifier } from '../../types/roles';

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
            {identifiers.map((identifier) => (
              <tr key={identifier.identifier} className="hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3">
                  <code className="rounded bg-muted px-2 py-1 font-mono text-xs">
                    {identifier.identifier}
                  </code>
                </td>
                <td className="px-4 py-3 font-medium">{identifier.name}</td>
                <td className="px-4 py-3 text-muted-foreground">{identifier.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
