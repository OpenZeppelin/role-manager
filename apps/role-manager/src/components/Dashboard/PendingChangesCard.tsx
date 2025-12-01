import { Clock } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@openzeppelin/ui-builder-ui';
import { cn } from '@openzeppelin/ui-builder-utils';

import { EmptyState } from '../Shared/EmptyState';

export function PendingChangesCard({ className }: { className?: string }) {
  return (
    <Card className={cn('w-full h-full min-h-[300px] flex flex-col shadow-none', className)}>
      <CardHeader>
        <CardTitle className="text-lg font-medium">Pending Role Changes</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col items-center justify-center">
        <EmptyState
          title="No pending role changes"
          description="There are no pending role changes for this contract."
          icon={Clock}
          className="h-full"
        />
      </CardContent>
    </Card>
  );
}
