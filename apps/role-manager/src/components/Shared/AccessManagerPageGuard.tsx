/**
 * AccessManagerPageGuard
 *
 * Shared guard component for AM-specific pages (Targets, Operations).
 * Handles the three common early-return states:
 * 1. No contract selected
 * 2. Contract is not an AccessManager
 * 3. Data is loading
 *
 * Renders children when all guards pass.
 */

import type { LucideIcon } from 'lucide-react';
import { FileSearch } from 'lucide-react';
import type { ReactNode } from 'react';

import { Card, CardContent } from '@openzeppelin/ui-components';

import { PageEmptyState } from './PageEmptyState';
import { PageHeader } from './PageHeader';

export interface AccessManagerPageGuardProps {
  /** Page title (e.g., "Targets", "Operations") */
  title: string;
  /** Contract display name */
  contractLabel: string;
  /** Whether a contract is selected */
  hasContract: boolean;
  /** Whether the selected contract is an AccessManager */
  isAccessManager: boolean;
  /** Whether data is loading */
  isLoading: boolean;
  /** Description for "not an AM" empty state */
  notAmDescription: string;
  /** Loading message */
  loadingMessage: string;
  /** Icon for "not an AM" state */
  notAmIcon: LucideIcon;
  /** Page content when all guards pass */
  children: ReactNode;
}

export function AccessManagerPageGuard({
  title,
  contractLabel,
  hasContract,
  isAccessManager,
  isLoading,
  notAmDescription,
  loadingMessage,
  notAmIcon,
  children,
}: AccessManagerPageGuardProps) {
  if (!hasContract) {
    return (
      <div className="p-6 space-y-6">
        <PageHeader title={title} subtitle={`Select a contract to view ${title.toLowerCase()}`} />
        <PageEmptyState
          title="No Contract Selected"
          description={`Select an AccessManager contract from the dropdown above to view its ${title.toLowerCase()}.`}
          icon={FileSearch}
        />
      </div>
    );
  }

  if (!isAccessManager) {
    return (
      <div className="p-6 space-y-6">
        <PageHeader
          title={title}
          subtitle={
            <span>
              <span className="font-bold text-foreground">{contractLabel}</span> is not an
              AccessManager
            </span>
          }
        />
        <PageEmptyState
          title="Not an AccessManager"
          description={notAmDescription}
          icon={notAmIcon}
        />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <PageHeader
          title={title}
          subtitle={
            <span>
              Loading for <span className="font-bold text-foreground">{contractLabel}</span>
            </span>
          }
        />
        <Card className="shadow-none">
          <CardContent className="p-8 text-center text-muted-foreground">
            {loadingMessage}
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
