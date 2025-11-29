import { Check, ChevronDown, Plus, Trash } from 'lucide-react';

import {
  AddressDisplay,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@openzeppelin/ui-builder-ui';

export interface Account {
  address: string;
  name: string;
  type?: string;
  color?: string; // For the avatar placeholder
}

interface AccountSelectorProps {
  accounts: Account[];
  selectedAccount: Account | null;
  onSelectAccount: (account: Account) => void;
  onAddAccount: () => void;
  onRemoveAccount?: (account: Account) => void;
}

export function AccountSelector({
  accounts,
  selectedAccount,
  onSelectAccount,
  onAddAccount,
  onRemoveAccount,
}: AccountSelectorProps) {
  // Fallback avatar color if not provided
  const getAvatarColor = (account: Account) => account.color || '#3b82f6'; // blue-500 default

  const TriggerContent = selectedAccount ? (
    <div className="flex items-center gap-3 text-left">
      <div
        className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium text-white"
        style={{ backgroundColor: getAvatarColor(selectedAccount) }}
      >
        {selectedAccount.name.substring(0, 2).toUpperCase()}
      </div>
      <div className="flex flex-1 flex-col overflow-hidden">
        <span className="truncate text-sm font-medium text-foreground">{selectedAccount.name}</span>
        <span className="text-xs text-muted-foreground">
          <AddressDisplay
            address={selectedAccount.address}
            showCopyButton
            showCopyButtonOnHover
            className="font-normal text-muted-foreground"
            truncate
          />
        </span>
      </div>
    </div>
  ) : (
    <span className="text-sm font-medium">Select Account</span>
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
      <DropdownMenuContent
        className="w-(--radix-dropdown-menu-trigger-width) min-w-[240px]"
        align="start"
      >
        <div className="p-1">
          {accounts.map((account) => (
            <DropdownMenuItem
              key={account.address}
              onClick={() => onSelectAccount(account)}
              className="group flex cursor-pointer items-center justify-between gap-2 rounded-sm p-2 focus:bg-accent"
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <div
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-medium text-white"
                  style={{ backgroundColor: getAvatarColor(account) }}
                >
                  {account.name.substring(0, 2).toUpperCase()}
                </div>
                <div className="flex flex-col overflow-hidden">
                  <span className="truncate text-sm font-medium text-foreground">
                    {account.name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    <AddressDisplay
                      address={account.address}
                      className="font-normal text-muted-foreground"
                      truncate
                    />
                  </span>
                </div>
              </div>
              {selectedAccount?.address === account.address && (
                <Check className="h-4 w-4 text-primary" />
              )}
              {onRemoveAccount && selectedAccount?.address !== account.address && (
                <div
                  role="button"
                  tabIndex={0}
                  className="hidden rounded-sm p-1 hover:bg-destructive/10 hover:text-destructive group-hover:block"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveAccount(account);
                  }}
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
            onClick={onAddAccount}
            className="flex cursor-pointer items-center gap-2 rounded-sm p-2 font-medium text-primary focus:bg-accent"
          >
            <Plus className="h-4 w-4" />
            Add new account
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
