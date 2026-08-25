# Role Manager Application

A React-based application for managing smart contract roles and permissions across multiple blockchain networks.

## Getting Started

### Prerequisites

- Node.js >= 20.19.0
- pnpm >= 10.22.0

### Installation

```bash
# From the monorepo root
pnpm install
```

### Development

```bash
# Start the development server
pnpm dev

# Or from monorepo root
pnpm --filter @openzeppelin/role-manager-app dev
```

### Testing

```bash
# Run tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:coverage
```

## Architecture

### Core Modules

| Module  | Description                                               | Documentation                              |
| ------- | --------------------------------------------------------- | ------------------------------------------ |
| Storage | IndexedDB persistence layer for contracts and preferences | [Storage Docs](src/core/storage/README.md) |

## Project Structure

```text
apps/role-manager/src/
├── components/           # React components
│   ├── Dashboard/       # Dashboard-related components
│   ├── Layout/          # Layout components (Header, Sidebar, etc.)
│   └── Shared/          # Shared/reusable components
├── core/                # Core business logic
│   ├── ecosystems/      # Blockchain ecosystem registry
│   └── storage/         # Storage services
├── hooks/               # React hooks
├── pages/               # Page components
└── types/               # TypeScript type definitions
```

## Analytics

Google Analytics 4 events are sent through `useRoleManagerAnalytics` (`src/hooks/useRoleManagerAnalytics.ts`),
which wraps the shared `useAnalytics` hook from `@openzeppelin/ui-react`. Tracking is enabled by the
`analytics_enabled` feature flag and the `VITE_GA_TAG_ID` env var.

Every action event carries the `network_id` and `ecosystem` dimensions, built with
`getAnalyticsNetworkContext(runtime)` (`runtime.networkConfig.id` / `.ecosystem`, `"unknown"` when no
runtime is loaded). Param names are registered as GA custom dimensions — do not rename them.

**Privacy:** wallet/account addresses are never sent. Contract addresses are allowed. Free-form filter
input (search text, date bounds) is reported only as `set` / `cleared`.

| Event                            | Params                                                                 | Fired from                                                              |
| -------------------------------- | ---------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `page_view`                      | `page_title`, `page_path` (shared hook)                                | `components/Analytics/TrackedRoute.tsx` on every route render           |
| `contract_selected`              | `contract_address`, `network_id`, `ecosystem`                          | `hooks/useContractSelection.ts` — user picks a contract or selects by id |
| `wallet_connected`               | `wallet_type`, `network_id`, `ecosystem`                               | `components/Analytics/WalletConnectionTracker.tsx` on connect           |
| `wallet_disconnected`            | `network_id`, `ecosystem`                                              | `components/Analytics/WalletConnectionTracker.tsx` on disconnect        |
| `role_granted`                   | `role_name`, `network_id`, `ecosystem`                                 | `useAssignRoleDialog`, `useManageRolesDialog` on tx success             |
| `role_revoked`                   | `role_name`, `network_id`, `ecosystem`                                 | `useRevokeRoleDialog`, `useManageRolesDialog` on tx success             |
| `role_renounced`                 | `role_name`, `network_id`, `ecosystem`                                 | `useRenounceDialog` (type `role`) on tx success                         |
| `ownership_transfer_initiated`   | `network_id`, `ecosystem`                                              | `useOwnershipTransferDialog` on tx success                              |
| `ownership_accepted`             | `network_id`, `ecosystem`                                              | `useAcceptOwnershipDialog` on tx success                                |
| `ownership_renounced`            | `network_id`, `ecosystem`                                              | `useRenounceDialog` (type `ownership`) on tx success                    |
| `admin_transfer_initiated`       | `network_id`, `ecosystem`                                              | `useAdminTransferDialog` on tx success                                  |
| `admin_transfer_accepted`        | `network_id`, `ecosystem`                                              | `useAcceptAdminTransferDialog` on tx success                            |
| `admin_transfer_cancelled`       | `network_id`, `ecosystem`                                              | `useCancelAdminTransferDialog` on tx success                            |
| `admin_delay_change_scheduled`   | `network_id`, `ecosystem`                                              | `useChangeAdminDelayDialog` on tx success                               |
| `admin_delay_change_rolled_back` | `network_id`, `ecosystem`                                              | `useRollbackAdminDelayDialog` on tx success                             |
| `snapshot_exported`              | `format` (`json`), `network_id`, `ecosystem`                           | `useDashboardData` when the snapshot download succeeds                  |
| `filter_applied`                 | `page`, `filter_type`, `filter_value`, `network_id`, `ecosystem`       | `useFilterAnalytics` on the Role Changes and Authorized Accounts pages  |

`filter_applied` details: `page` is `Role Changes` or `Authorized Accounts`; `filter_type` is the filter
state key (`actionFilter`, `statusFilter`, `roleFilter`, `searchQuery`, `timestampFrom`, `timestampTo`);
`filter_value` is the selected option for enumerated filters and `set` / `cleared` for free-form ones.
One event is emitted per changed field.

## Scripts

| Script               | Description               |
| -------------------- | ------------------------- |
| `pnpm dev`           | Start development server  |
| `pnpm build`         | Build for production      |
| `pnpm preview`       | Preview production build  |
| `pnpm test`          | Run tests                 |
| `pnpm test:watch`    | Run tests in watch mode   |
| `pnpm test:coverage` | Run tests with coverage   |
| `pnpm typecheck`     | TypeScript type checking  |
| `pnpm lint`          | Run ESLint                |
| `pnpm lint:fix`      | Run ESLint with auto-fix  |
| `pnpm format`        | Format code with Prettier |
| `pnpm format:check`  | Check code formatting     |

## Local Development with UI Kit

When developing against local changes to `@openzeppelin/ui-*` packages:

```bash
# From the monorepo root, enable local packages
pnpm dev:local

# This uses packages from ../openzeppelin-ui and ../openzeppelin-adapters
# Make sure those repos are built first:
# cd ../openzeppelin-ui && pnpm install && pnpm build

# To switch back to npm registry packages
pnpm dev:npm
```

### How It Works

The local development workflow uses the published `oz-ui-dev` CLI plus the monorepo root [`readPackage` hook](https://pnpm.io/pnpmfile#hooksreadpackagepkg-context):

1. `pnpm dev:local` calls `oz-ui-dev use local` through the published CLI package
2. The CLI builds and packs the selected families into `.packed-packages/local-dev`
3. `.pnpmfile.cjs` rewrites `@openzeppelin/ui-*` and `@openzeppelin/adapter-*` dependencies to those packed tarballs during install

**Benefits:**

- `package.json` stays unchanged (no `file:` references committed)
- Switching between local and npm is a single command
- The packed-tarball flow mirrors published package behavior more closely than raw repo links
- Environment variables (`LOCAL_UI_PATH`, `LOCAL_ADAPTERS_PATH`) allow custom paths

See `.pnpmfile.cjs` at the monorepo root for the full implementation.

## Dependencies

### Runtime

- `@openzeppelin/ui-types` - Shared TypeScript types
- `@openzeppelin/ui-utils` - Utility functions
- `@openzeppelin/ui-styles` - Shared styles (Tailwind CSS 4)
- `@openzeppelin/ui-components` - UI components (shadcn/ui based)
- `@openzeppelin/ui-renderer` - Transaction form rendering
- `@openzeppelin/ui-react` - React context providers and hooks
- `@openzeppelin/ui-storage` - IndexedDB storage utilities
- `@openzeppelin/adapter-evm` - EVM blockchain adapter
- `@openzeppelin/adapter-stellar` - Stellar blockchain adapter
- `react` - React framework
- `react-dom` - React DOM bindings
- `react-router-dom` - Routing
- `lucide-react` - Icons

### Dev Dependencies

- `vite` - Build tool
- `vitest` - Testing framework
- `tailwindcss` - CSS framework
- `fake-indexeddb` - IndexedDB mock for testing
