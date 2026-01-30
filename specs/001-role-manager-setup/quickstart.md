# Quickstart: Role Manager Development

## Prerequisites

- **Node.js**: v24+ (Active LTS)
- **PNPM**: v10+ (`corepack enable` recommended)
- **Upstream Repo**: `ui-builder` cloned at `../ui-builder` (optional, for local linking)

## Setup

1.  **Install Dependencies**:

    ```bash
    pnpm install
    ```

2.  **Build Workspace**:

    ```bash
    pnpm build
    ```

3.  **Run Tests**:
    ```bash
    pnpm test
    ```

## Local Development with UI Builder

To develop against local changes in `ui-builder` packages (e.g., `adapter-stellar`):

1.  **In `ui-builder`**:

    ```bash
    # Pack the packages you are working on
    ./scripts/pack-packages.sh
    ```

2.  **In `role-manager`**:

    ```bash
    # Switch to local tarball mode
    ./scripts/setup-local-dev.sh --local
    pnpm install
    ```

3.  **To Revert**:
    ```bash
    # Switch back to registry mode
    ./scripts/setup-local-dev.sh --registry
    pnpm install
    ```

## Project Structure

- `apps/role-manager`: The main React application.
- `packages/`: Shared libraries (hooks, components).
- `scripts/`: Automation for dev workflows.
