import { Card, CardContent } from '@openzeppelin/ui-components';
import { cn } from '@openzeppelin/ui-utils';

import { EmptyState, EmptyStateProps } from './EmptyState';

export function PageEmptyState({ className, ...props }: EmptyStateProps) {
  return (
    <Card className={cn('shadow-none', className)}>
      <CardContent className="p-0 min-h-[400px] flex items-center justify-center">
        <EmptyState {...props} />
      </CardContent>
    </Card>
  );
}
