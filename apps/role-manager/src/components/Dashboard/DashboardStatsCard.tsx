import { ReactNode } from 'react';

import { Button, Card, CardContent, CardHeader, CardTitle } from '@openzeppelin/ui-builder-ui';
import { cn } from '@openzeppelin/ui-builder-utils';

interface DashboardStatsCardProps {
  title: string;
  count: string | number;
  label: string;
  icon?: ReactNode;
  onClick?: () => void;
  className?: string;
}

export function DashboardStatsCard({
  title,
  count,
  label,
  icon,
  onClick,
  className,
}: DashboardStatsCardProps) {
  return (
    <Card
      className={cn(
        'group relative flex flex-col justify-between transition-all duration-200 hover:scale-[1.02] cursor-pointer overflow-hidden bg-white shadow-none',
        className
      )}
      onClick={onClick}
    >
      <div className="absolute top-4 right-4 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-200 z-10">
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs bg-white shadow-sm hover:bg-slate-50 px-3"
        >
          Open
        </Button>
      </div>

      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <CardTitle className="text-sm font-medium text-slate-500">{title}</CardTitle>
          {icon && <div className="text-slate-400">{icon}</div>}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-4xl font-bold tracking-tight mb-1 text-slate-900">{count}</div>
        <p className="text-xs text-slate-500">{label}</p>
      </CardContent>
    </Card>
  );
}
