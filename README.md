# Role Manager 🔐

> Access control management interface for smart contracts. Visualize roles, permissions, and execute administrative actions across multiple blockchain ecosystems.

## Project Status

This project is currently in development.

[![OpenSSF Scorecard](https://api.securityscorecards.dev/projects/github.com/OpenZeppelin/role-manager/badge)](https://api.securityscorecards.dev/projects/github.com/OpenZeppelin/role-manager)
[![Scorecard supply-chain security](https://github.com/OpenZeppelin/role-manager/actions/workflows/scorecard.yml/badge.svg)](https://github.com/OpenZeppelin/role-manager/actions/workflows/scorecard.yml)
[![OpenSSF Best Practices](https://www.bestpractices.dev/projects/11773/badge)](https://www.bestpractices.dev/projects/11773)
[![CLA Assistant](https://github.com/OpenZeppelin/role-manager/actions/workflows/cla.yml/badge.svg)](https://github.com/OpenZeppelin/role-manager/actions/workflows/cla.yml)
[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)
[![CI](https://github.com/OpenZeppelin/role-manager/actions/workflows/ci.yml/badge.svg)](https://github.com/OpenZeppelin/role-manager/actions/workflows/ci.yml)
[![Conventional Commits](https://img.shields.io/badge/Conventional%20Commits-1.0.0-brightgreen.svg)](https://conventionalcommits.org)
[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-20232A?logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Vite](https://img.shields.io/badge/Vite-B73BFE?logo=vite&logoColor=FFD62E)](https://vitejs.dev/)
[![pnpm](https://img.shields.io/badge/pnpm-F69220?logo=pnpm&logoColor=white)](https://pnpm.io/)

## Table of Contents

- [Supported Ecosystems & Networks](#supported-ecosystems--networks)
- [Contract Types & Features](#contract-types--features)
- [Monorepo Structure](#monorepo-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
- [Available Scripts](#available-scripts)
- [Local development with openzeppelin-ui and openzeppelin-adapters](#local-development-with-openzeppelin-ui-and-openzeppelin-adapters)
- [Project Structure](#project-structure)
- [Tech Stack](#tech-stack)
- [Code Style](#code-style)
- [Commit Convention](#commit-convention)
- [Contributing](#contributing)
- [License](#license)

## Supported Ecosystems & Networks

Role Manager supports smart contracts across three blockchain ecosystems via dedicated adapter packages.

### EVM

23 networks (11 mainnet, 12 testnet) via `@openzeppelin/adapter-evm`.

| Mainnet           | Testnet               |
| ----------------- | --------------------- |
| Ethereum          | Sepolia               |
| Arbitrum One      | Arbitrum Sepolia      |
| Base              | Base Sepolia          |
| Polygon           | Polygon Amoy          |
| Polygon zkEVM     | Polygon zkEVM Cardona |
| BNB Smart Chain   | BSC Testnet           |
| OP Mainnet        | OP Sepolia            |
| Avalanche C-Chain | Avalanche Fuji        |
| Linea             | Linea Sepolia         |
| Scroll            | Scroll Sepolia        |
| ZkSync Era        | ZkSync Era Sepolia    |
|                   | Monad Testnet         |

### Stellar

2 networks (1 mainnet, 1 testnet) via `@openzeppelin/adapter-stellar`.

| Mainnet                | Testnet         |
| ---------------------- | --------------- |
| Stellar Public Network | Stellar Testnet |

### Polkadot

5 networks (3 mainnet, 2 testnet) via `@openzeppelin/adapter-polkadot`.

| Mainnet      | Testnet              |
| ------------ | -------------------- |
| Polkadot Hub | Polkadot Hub Testnet |
| Moonbeam     | Moonbase Alpha       |
| Moonriver    |                      |

## Contract Types & Features

The application detects OpenZeppelin contract standards via ABI analysis and adapts its UI and available operations accordingly. Contracts can implement multiple standards simultaneously (e.g., AccessControl + AccessControlEnumerable).

### Contract Types

| Standard          | Description                                                            |
| ----------------- | ---------------------------------------------------------------------- |
| **Ownable**       | Single-owner access control pattern                                    |
| **AccessControl** | Role-based access control with granular permissions for multiple roles |

### Contract Features

These features layer on top of the core contract types to provide additional capabilities.

| Feature                | Standard                       | Description                                                                                                          |
| ---------------------- | ------------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| **Two-Step Ownership** | Ownable2Step                   | Ownership transfers require the new owner to explicitly accept, preventing accidental transfers to wrong addresses   |
| **Two-Step Admin**     | AccessControlDefaultAdminRules | Admin transfers require acceptance after a configurable delay, adding a safety window before the change takes effect |
| **Enumerable Roles**   | AccessControlEnumerable        | Roles and their members can be enumerated on-chain                                                                   |
| **History**            | —                              | On-chain history of role changes is available via an indexer                                                         |

### Supported Operations

| Operation             | Ownable | AccessControl | Notes                                                         |
| --------------------- | :-----: | :-----------: | ------------------------------------------------------------- |
| Grant Role            |         |       ✓       | Assign a role to an account                                   |
| Revoke Role           |         |       ✓       | Remove a role from an account                                 |
| Renounce Role         |         |       ✓       | Self-revoke a role                                            |
| Transfer Ownership    |    ✓    |               | Two-step when Ownable2Step is detected                        |
| Accept Ownership      |    ✓    |               | Ownable2Step only                                             |
| Renounce Ownership    |    ✓    |               | Permanently removes the owner                                 |
| Transfer Admin        |         |       ✓       | AccessControlDefaultAdminRules only, with configurable delay  |
| Accept Admin Transfer |         |       ✓       | AccessControlDefaultAdminRules only                           |
| Cancel Admin Transfer |         |       ✓       | AccessControlDefaultAdminRules only                           |
| Change Admin Delay    |         |       ✓       | AccessControlDefaultAdminRules only, change is itself delayed |
| Rollback Admin Delay  |         |       ✓       | AccessControlDefaultAdminRules only                           |
| Export Snapshot       |    ✓    |       ✓       | Download contract access control state as JSON                |

## Monorepo Structure

This project is organized as a monorepo with the following packages:

- **apps/role-manager**: The main React application for managing smart contract roles.
- **packages/components**: Shared React UI components.
- **packages/hooks**: Shared React hooks for state management and business logic.

## Getting Started

### Prerequisites

- **Node.js**: v20+ (LTS recommended)
- **pnpm**: v10+ (`corepack enable` recommended)

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/OpenZeppelin/role-manager.git
   cd role-manager
   ```

2. Install dependencies:

   ```bash
   pnpm install
   ```

3. Build all packages:

   ```bash
   pnpm build
   ```

4. Start the development server:

   ```bash
   pnpm dev
   ```

5. Open your browser and navigate to `http://localhost:5173`

## Available Scripts

| Script                | Description                                     |
| --------------------- | ----------------------------------------------- |
| `pnpm dev`            | Start the development server (role-manager app) |
| `pnpm dev:all`        | Start all packages in watch mode                |
| `pnpm build`          | Build all packages and apps                     |
| `pnpm build:packages` | Build only packages (components, hooks)         |
| `pnpm build:app`      | Build only the role-manager app                 |
| `pnpm test`           | Run tests across all packages                   |
| `pnpm test:all`       | Run all tests in parallel                       |
| `pnpm test:coverage`  | Run tests with coverage reports                 |
| `pnpm typecheck`      | Run TypeScript type checking                    |
| `pnpm lint`           | Run ESLint across all packages                  |
| `pnpm lint:fix`       | Fix ESLint issues                               |
| `pnpm format`         | Format code with Prettier                       |
| `pnpm format:check`   | Check formatting without changes                |
| `pnpm fix-all`        | Run Prettier then ESLint fix                    |
| `pnpm commit`         | Create a commit using Commitizen                |
| `pnpm changeset`      | Create a changeset for versioning               |
| `pnpm clean`          | Clean build artifacts                           |

## Local development with openzeppelin-ui and openzeppelin-adapters

This project can consume packages from [openzeppelin-ui](https://github.com/OpenZeppelin/openzeppelin-ui) (`@openzeppelin/ui-*`) and [openzeppelin-adapters](https://github.com/OpenZeppelin/openzeppelin-adapters) (`@openzeppelin/adapter-*`). See [docs/LOCAL_DEVELOPMENT.md](docs/LOCAL_DEVELOPMENT.md) for clone layout, troubleshooting, and workflow details.

1. **Enable local UI + adapter packages**:

   ```bash
   pnpm dev:local
   ```

   This delegates to the published `oz-ui-dev` CLI, which builds and packs the configured families from your local checkouts before reinstalling Role Manager against those packed artifacts.

2. **Enable only local UI packages**:

   ```bash
   pnpm dev:uikit:local
   ```

3. **Enable only local adapter packages**:

   ```bash
   pnpm dev:adapters:local
   ```

4. **Switch back to npm packages** (before committing):

   ```bash
   pnpm dev:npm
   ```

5. **Custom paths** (optional):

   ```bash
   LOCAL_UI_PATH=/path/to/openzeppelin-ui LOCAL_ADAPTERS_PATH=/path/to/openzeppelin-adapters pnpm dev:local
   ```

## Project Structure

```text
role-manager/
├── apps/
│   └── role-manager/        # Main React application
│       ├── src/             # Application source code
│       ├── index.html       # HTML entry point
│       ├── vite.config.ts   # Vite configuration
│       └── package.json     # App dependencies
├── packages/
│   ├── components/          # Shared UI components
│   │   ├── src/
│   │   ├── tsup.config.ts   # Build configuration
│   │   └── package.json
│   └── hooks/               # Shared React hooks
│       ├── src/
│       ├── tsup.config.ts   # Build configuration
│       └── package.json
├── scripts/                 # Development helper scripts
├── specs/                   # Feature specifications
├── test/                    # Shared test setup
├── .changeset/              # Versioning configuration
├── .github/                 # GitHub Actions workflows
├── .husky/                  # Git hooks
├── package.json             # Root workspace configuration
├── pnpm-workspace.yaml      # PNPM workspace definition
├── tsconfig.base.json       # Base TypeScript configuration
├── eslint.config.cjs        # ESLint configuration
├── tailwind.config.cjs      # Tailwind CSS configuration
└── vitest.shared.config.ts  # Shared test configuration
```

## Tech Stack

- **React 19**: Modern React with hooks and concurrent features
- **TypeScript 5**: Type-safe development
- **Vite 7**: Fast development server and build tool
- **Tailwind CSS**: Utility-first CSS framework
- **Vitest**: Fast unit testing framework
- **tsup**: TypeScript library bundler
- **pnpm**: Fast, disk-efficient package manager
- **ESLint + Prettier**: Code quality and formatting
- **Husky + lint-staged**: Git hooks for quality gates
- **Commitlint**: Conventional commit enforcement
- **Changesets**: Version management and changelogs

## Code Style

### Git Hooks

This project uses Husky to enforce code quality:

- **pre-commit**: Runs lint-staged (Prettier → ESLint)
- **pre-push**: Runs full lint and format check
- **commit-msg**: Enforces conventional commit format

### Formatting

For consistent code formatting:

```bash
# Format and lint all files
pnpm fix-all
```

## Commit Convention

This project follows [Conventional Commits](https://www.conventionalcommits.org/). Use the interactive commit tool:

```bash
pnpm commit
```

Examples:

```text
feat(role-manager): add role visualization component
fix(hooks): resolve state update race condition
docs: update README with setup instructions
chore: update dependencies
```

## Contributing

1. Create a feature branch from `main`
2. Make your changes following the code style guidelines
3. Write tests for new functionality
4. Create a changeset: `pnpm changeset`
5. Submit a pull request

## License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

---

_This project uses [@openzeppelin/ui-components](https://www.npmjs.com/package/@openzeppelin/ui-components) for shared UI components._
