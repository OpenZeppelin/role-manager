import { Database, RefreshCw, Wrench } from 'lucide-react';
import type { ReactElement } from 'react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@openzeppelin/ui-components';

import { seedMockMainnetContractWithToast } from '@/dev/seedMockMainnetContract';

/**
 * Developer tools for local mainnet-disable testing.
 */
export function DevToolsDropdown(): ReactElement {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="inline-flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          title="Developer Tools"
        >
          <Wrench size={16} />
          Dev Tools
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel className="text-xs text-destructive">
          Not for production! Disable <code>show_dev_tools</code> before deploying.
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Mainnet disable testing</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => void seedMockMainnetContractWithToast()}>
          <Database className="mr-2 h-4 w-4" />
          Seed saved mainnet contract
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => void seedMockMainnetContractWithToast({ includeSavedPrefs: true })}
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Seed + apply saved prefs (reload)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
