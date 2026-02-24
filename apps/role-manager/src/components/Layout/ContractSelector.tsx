import { ChevronDown, Plus, Trash } from 'lucide-react';

import {
  AddressDisplay,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@openzeppelin/ui-components';

import { useContractDisplayName } from '../../hooks/useContractDisplayName';
import type { ContractRecord, ContractSelectorProps } from '../../types/contracts';

const AVATAR_COLORS = [
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

function getAvatarColor(address: string): string {
  let hash = 0;
  for (let i = 0; i < address.length; i++) {
    hash = address.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

// =============================================================================
// Trigger (selected contract display in the sidebar button)
// =============================================================================

function SelectedContractTrigger({ contract }: { contract: ContractRecord }) {
  const displayName = useContractDisplayName(contract);

  return (
    <div className="flex min-w-0 flex-1 items-center gap-3 text-left">
      <div
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-medium text-white"
        style={{ backgroundColor: getAvatarColor(contract.address) }}
      >
        {displayName.substring(0, 2).toUpperCase()}
      </div>
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <span className="truncate text-sm font-medium text-foreground">{displayName}</span>
        <AddressDisplay
          address={contract.address}
          className="text-xs font-normal text-muted-foreground"
          disableLabel
          truncate
        />
      </div>
    </div>
  );
}

// =============================================================================
// Dropdown item (each contract row in the list)
// =============================================================================

interface ContractItemProps {
  contract: ContractRecord;
  onSelect: (contract: ContractRecord) => void;
  onRemove?: (contract: ContractRecord) => void;
}

function ContractItem({ contract, onSelect, onRemove }: ContractItemProps) {
  const displayName = useContractDisplayName(contract);

  return (
    <DropdownMenuItem
      onClick={() => onSelect(contract)}
      className="group flex cursor-pointer items-center justify-between gap-2 rounded-sm p-2 focus:bg-accent"
    >
      <div className="flex items-center gap-3 overflow-hidden">
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-medium text-white"
          style={{ backgroundColor: getAvatarColor(contract.address) }}
        >
          {displayName.substring(0, 2).toUpperCase()}
        </div>
        <div className="flex flex-col overflow-hidden">
          <span className="truncate text-sm font-medium text-foreground">{displayName}</span>
          <span className="text-xs text-muted-foreground">
            <AddressDisplay
              address={contract.address}
              showCopyButton
              showCopyButtonOnHover
              className="font-normal text-muted-foreground"
              disableLabel
              truncate
            />
          </span>
        </div>
      </div>
      {onRemove && (
        <div
          role="button"
          tabIndex={0}
          className="rounded-sm p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
          onClick={(e) => {
            e.stopPropagation();
            onRemove(contract);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              e.stopPropagation();
              onRemove(contract);
            }
          }}
          aria-label={`Delete ${displayName}`}
        >
          <Trash className="h-4 w-4" />
        </div>
      )}
    </DropdownMenuItem>
  );
}

// =============================================================================
// Main ContractSelector
// =============================================================================

export function ContractSelector({
  contracts,
  selectedContract,
  onSelectContract,
  onAddContract,
  onRemoveContract,
}: ContractSelectorProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="flex h-14 w-full items-center justify-between border-border bg-card px-3 py-2 hover:bg-accent hover:text-accent-foreground"
        >
          {selectedContract ? (
            <SelectedContractTrigger contract={selectedContract} />
          ) : (
            <span className="text-sm font-medium">Select Contract</span>
          )}
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="min-w-[320px]" align="start">
        <div className="p-1">
          {(contracts || []).map((contract) => (
            <ContractItem
              key={contract.id}
              contract={contract}
              onSelect={onSelectContract}
              onRemove={onRemoveContract}
            />
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
