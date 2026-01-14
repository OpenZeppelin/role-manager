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

- [Monorepo Structure](#monorepo-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
- [Available Scripts](#available-scripts)
- [Local Development with UI Builder](#local-development-with-ui-builder)
- [Project Structure](#project-structure)
- [Tech Stack](#tech-stack)
- [Code Style](#code-style)
- [Commit Convention](#commit-convention)
- [Contributing](#contributing)
- [License](#license)

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

| Script                  | Description                                     |
| ----------------------- | ----------------------------------------------- |
| `pnpm dev`              | Start the development server (role-manager app) |
| `pnpm dev:all`          | Start all packages in watch mode                |
| `pnpm build`            | Build all packages and apps                     |
| `pnpm build:ui-builder` | Build and pack local UI Builder packages        |
| `pnpm build:packages`   | Build only packages (components, hooks)         |
| `pnpm build:app`        | Build only the role-manager app                 |
| `pnpm test`             | Run tests across all packages                   |
| `pnpm test:all`         | Run all tests in parallel                       |
| `pnpm test:coverage`    | Run tests with coverage reports                 |
| `pnpm typecheck`        | Run TypeScript type checking                    |
| `pnpm lint`             | Run ESLint across all packages                  |
| `pnpm lint:fix`         | Fix ESLint issues                               |
| `pnpm format`           | Format code with Prettier                       |
| `pnpm format:check`     | Check formatting without changes                |
| `pnpm fix-all`          | Run Prettier then ESLint fix                    |
| `pnpm commit`           | Create a commit using Commitizen                |
| `pnpm changeset`        | Create a changeset for versioning               |
| `pnpm clean`            | Clean build artifacts                           |

## Local Development with UI Builder

This project can consume packages from the [UI Builder](https://github.com/OpenZeppelin/ui-builder) repository. To develop against local changes:

1. **Pack the dependencies** (in the root directory):

   ```bash
   ./scripts/pack-ui-builder.sh
   ```

2. **Switch to local tarballs**:

   ```bash
   pnpm dev:local
   ```

   This rewrites `package.json` to use `file:` paths pointing to the generated tarballs.

3. **Revert to registry mode** (before committing):

   ```bash
   pnpm dev:registry
   ```

   Or specify a version:

   ```bash
   ./scripts/setup-local-dev.sh registry ^0.16.0
   ```

   **Note**: A `pre-commit` hook will prevent you from committing `file:` paths to ensure CI compatibility.

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
