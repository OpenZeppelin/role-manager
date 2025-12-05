/**
 * DashboardEmptyState Component
 * Feature: 007-dashboard-real-data
 *
 * Displayed when no contract is selected on the Dashboard.
 * Per FR-011: Shows title, description, and CTA to add a contract.
 */
import { FileSearch } from 'lucide-react';
import { useState } from 'react';

import { Button, Card, CardContent } from '@openzeppelin/ui-builder-ui';

import { AddContractDialog } from '../Contracts/AddContractDialog';

/**
 * Empty state displayed on Dashboard when no contract is selected.
 * Provides guidance and a CTA to add a new contract.
 */
export function DashboardEmptyState() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    <>
      <Card className="shadow-none">
        <CardContent className="p-0 min-h-[400px] flex items-center justify-center">
          <div className="flex w-full flex-col items-center justify-center text-center p-6">
            <div className="rounded-full bg-slate-100 p-3 mb-4">
              <FileSearch className="h-6 w-6 text-slate-400" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900 mb-1">No Contract Selected</h3>
            <p className="text-sm text-slate-500 max-w-xs">
              Select a contract from the sidebar or add a new one to get started.
            </p>
            <div className="mt-4">
              <Button onClick={() => setIsDialogOpen(true)} variant="outline" size="sm">
                Add Contract
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <AddContractDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} />
    </>
  );
}
