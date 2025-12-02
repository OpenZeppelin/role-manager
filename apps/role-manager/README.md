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
│   └── storage/         # Storage services (see STORAGE.md)
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

## Dependencies

### Runtime

- `@openzeppelin/ui-builder-storage` - IndexedDB storage utilities
- `@openzeppelin/ui-builder-styles` - Shared styles
- `@openzeppelin/ui-builder-types` - Shared types
- `@openzeppelin/ui-builder-ui` - UI components
- `@openzeppelin/ui-builder-utils` - Utility functions
- `react` - React framework
- `react-dom` - React DOM bindings
- `react-router-dom` - Routing
- `lucide-react` - Icons

### Dev Dependencies

- `vite` - Build tool
- `vitest` - Testing framework
- `tailwindcss` - CSS framework
- `fake-indexeddb` - IndexedDB mock for testing
