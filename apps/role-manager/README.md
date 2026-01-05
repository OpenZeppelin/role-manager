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

# This uses packages from ../openzeppelin-ui and ../contracts-ui-builder
# Make sure those repos are built first:
# cd ../openzeppelin-ui && pnpm install && pnpm build

# To switch back to npm registry packages
pnpm dev:npm
```

### How It Works

The local development workflow uses pnpm's [`readPackage` hook](https://pnpm.io/pnpmfile#hooksreadpackagepkg-context) via `.pnpmfile.cjs` to dynamically resolve packages at install time:

1. When `LOCAL_UI=true` is set (via `pnpm dev:local`), the hook intercepts package resolution
2. Any `@openzeppelin/ui-*` dependency is rewritten to `file:../openzeppelin-ui/packages/*`
3. Any `@openzeppelin/ui-builder-adapter-*` dependency is rewritten to `file:../contracts-ui-builder/packages/*`

**Benefits:**

- `package.json` stays unchanged (no `file:` references committed)
- Switching between local and npm is instant — just re-run install
- Transitive dependencies are also resolved locally
- Environment variables (`LOCAL_UI_PATH`, `LOCAL_UI_BUILDER_PATH`) allow custom paths

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
- `@openzeppelin/ui-builder-adapter-evm` - EVM blockchain adapter
- `@openzeppelin/ui-builder-adapter-stellar` - Stellar blockchain adapter
- `react` - React framework
- `react-dom` - React DOM bindings
- `react-router-dom` - Routing
- `lucide-react` - Icons

### Dev Dependencies

- `vite` - Build tool
- `vitest` - Testing framework
- `tailwindcss` - CSS framework
- `fake-indexeddb` - IndexedDB mock for testing
