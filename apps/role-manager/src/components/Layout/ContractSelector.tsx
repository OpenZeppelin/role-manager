import { ChevronDown, Plus, Trash } from 'lucide-react';

import {
  AddressDisplay,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@openzeppelin/ui-builder-ui';

import type { ContractSelectorProps } from '../../types/contracts';

export function ContractSelector({
  contracts,
  selectedContract,
  onSelectContract,
  onAddContract,
  onRemoveContract,
}: ContractSelectorProps) {
  // Generate a color based on the address
  const getAvatarColor = (address: string) => {
    // Simple deterministic color generation
    const colors = [
      '#ef4444',
      '#f97316',
      '#f59e0b',
      '#84cc16',
      '#10b981',
      '#06b6d4',
      '#3b82f6',
      '#8b5cf6',
      '#d946ef',
      '#f43f5e',
    ];
    let hash = 0;
    for (let i = 0; i < address.length; i++) {
      hash = address.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const TriggerContent = selectedContract ? (
    <div className="flex items-center gap-3 text-left">
      <div
        className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium text-white"
        style={{ backgroundColor: getAvatarColor(selectedContract.address) }}
      >
        {(selectedContract.label || 'Unknown').substring(0, 2).toUpperCase()}
      </div>
      <div className="flex flex-1 flex-col overflow-hidden">
        <span className="truncate text-sm font-medium text-foreground">
          {selectedContract.label || 'Unknown Contract'}
        </span>
        <span className="text-xs text-muted-foreground">
          {/* IMPORTANT: Do NOT render a button inside the trigger button */}
          <AddressDisplay
            address={selectedContract.address}
            className="font-normal text-muted-foreground"
            truncate
          />
        </span>
      </div>
    </div>
  ) : (
    <span className="text-sm font-medium">Select Contract</span>
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="flex h-14 w-full items-center justify-between border-border bg-card px-3 py-2 hover:bg-accent hover:text-accent-foreground"
        >
          {TriggerContent}
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="min-w-[320px]" align="start">
        <div className="p-1">
          {(contracts || []).map((contract) => (
            <DropdownMenuItem
              key={contract.id}
              onClick={() => onSelectContract(contract)}
              className="group flex cursor-pointer items-center justify-between gap-2 rounded-sm p-2 focus:bg-accent"
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <div
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-medium text-white"
                  style={{ backgroundColor: getAvatarColor(contract.address) }}
                >
                  {(contract.label || 'Unknown').substring(0, 2).toUpperCase()}
                </div>
                <div className="flex flex-col overflow-hidden">
                  <span className="truncate text-sm font-medium text-foreground">
                    {contract.label || 'Unknown Contract'}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {/* OK to show copy inside the dropdown item (not inside a button) */}
                    <AddressDisplay
                      address={contract.address}
                      showCopyButton
                      showCopyButtonOnHover
                      className="font-normal text-muted-foreground"
                      truncate
                    />
                  </span>
                </div>
              </div>
              {onRemoveContract && (
                <div
                  role="button"
                  tabIndex={0}
                  className="rounded-sm p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveContract(contract);
                  }}
                  aria-label={`Delete ${contract.label}`}
                >
                  <Trash className="h-4 w-4" />
                </div>
              )}
            </DropdownMenuItem>
          ))}
        </div>
        <DropdownMenuSeparator />
        <div className="p-1">
          <DropdownMenuItem
            onClick={onAddContract}
            className="flex cursor-pointer items-center gap-2 rounded-sm p-2 font-medium text-primary focus:bg-accent"
          >
            <Plus className="h-4 w-4" />
            Add new contract
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
