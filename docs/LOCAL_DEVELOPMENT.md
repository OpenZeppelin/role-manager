# Local Development with openzeppelin-ui and openzeppelin-adapters

This guide explains how to develop with local versions of `@openzeppelin/ui-*` packages from [openzeppelin-ui](https://github.com/OpenZeppelin/openzeppelin-ui) and `@openzeppelin/adapter-*` packages from [openzeppelin-adapters](https://github.com/OpenZeppelin/openzeppelin-adapters).

## Quick Start

```bash
# 1. Clone all three repos as siblings
cd ~/dev/repos/OpenZeppelin
git clone git@github.com:OpenZeppelin/role-manager.git
git clone git@github.com:OpenZeppelin/openzeppelin-ui.git
git clone git@github.com:OpenZeppelin/openzeppelin-adapters.git

# 2. Install dependencies in openzeppelin-ui
cd openzeppelin-ui
pnpm install

# 3. Install dependencies in openzeppelin-adapters
cd ../openzeppelin-adapters
pnpm install

# 4. Enable local packages in role-manager (auto-builds both repos)
cd ../role-manager
pnpm dev:local

# 5. Start development
pnpm dev
```

## How It Works

The local development setup uses pnpm's `.pnpmfile.cjs` hook to dynamically resolve packages to local file paths when `LOCAL_UI=true` is set.

### Directory Structure

```text
~/dev/repos/OpenZeppelin/
├── role-manager/              # This repo
├── openzeppelin-ui/           # UI packages
│   └── packages/
│       ├── types/             # @openzeppelin/ui-types
│       ├── utils/             # @openzeppelin/ui-utils
│       ├── styles/            # @openzeppelin/ui-styles
│       ├── components/        # @openzeppelin/ui-components
│       ├── renderer/          # @openzeppelin/ui-renderer
│       ├── react/             # @openzeppelin/ui-react
│       └── storage/           # @openzeppelin/ui-storage
└── openzeppelin-adapters/     # Adapter packages
    └── packages/
        ├── adapter-evm/       # @openzeppelin/adapter-evm
        ├── adapter-evm-core/  # @openzeppelin/adapter-evm-core
        ├── adapter-stellar/   # @openzeppelin/adapter-stellar
        ├── adapter-solana/    # @openzeppelin/adapter-solana
        ├── adapter-polkadot/  # @openzeppelin/adapter-polkadot
        └── adapter-midnight/  # @openzeppelin/adapter-midnight
```

## Commands

### Switch to Local UI + Adapter Packages

```bash
pnpm dev:local
```

This command automatically:

1. Builds packages in local openzeppelin-ui (defaults to `../openzeppelin-ui`)
2. Builds adapter packages in local openzeppelin-adapters (defaults to `../openzeppelin-adapters`)
3. Runs `LOCAL_UI=true LOCAL_ADAPTERS=true pnpm install` to resolve all dependencies to local paths

This ensures you always have up-to-date compiled types when working with local packages.

### Switch to Local UI Packages Only

```bash
pnpm dev:uikit:local
```

Use this when you only want local `@openzeppelin/ui-*` packages and want adapters to keep resolving from npm.

### Switch to Local Adapter Packages Only

```bash
pnpm dev:adapters:local
```

Use this when you only want local `@openzeppelin/adapter-*` packages and want UI packages to keep resolving from npm.

### Custom Paths

If your repos are in different locations, use environment variables:

```bash
LOCAL_UI_PATH=/path/to/openzeppelin-ui LOCAL_ADAPTERS_PATH=/path/to/openzeppelin-adapters pnpm dev:local
```

`LOCAL_UI_BUILDER_PATH` is still accepted as a compatibility alias for `LOCAL_ADAPTERS_PATH`.

### Switch Back to npm Packages

```bash
pnpm dev:npm
```

This runs a regular `pnpm install` which uses the published npm versions.

## Development Workflow

### Making Changes to UI Packages

1. Make changes in `openzeppelin-ui/packages/*`
2. Rebuild and reinstall: `pnpm dev:local`
3. Restart the dev server if needed

### Making Changes to Adapter Packages

1. Make changes in `openzeppelin-adapters/packages/adapter-*`
2. Rebuild and reinstall: `pnpm dev:local`
3. Restart the dev server if needed

### Hot Reload (Advanced)

For faster iteration, run builds in watch mode:

```bash
# Terminal 1: Watch openzeppelin-ui
cd openzeppelin-ui
pnpm build --watch  # If supported

# Terminal 2: Watch openzeppelin-adapters
cd openzeppelin-adapters
pnpm --filter='./packages/adapter-*' build --watch  # If supported

# Terminal 3: Run role-manager
cd role-manager
pnpm dev
```

## Troubleshooting

### "Module not found" Errors

Re-run `pnpm dev:local` to rebuild and reinstall local packages:

```bash
pnpm dev:local
```

Or manually ensure both repos are built:

```bash
cd ../openzeppelin-ui && pnpm install && pnpm --filter='./packages/*' build
cd ../openzeppelin-adapters && pnpm install && pnpm --filter='./packages/adapter-*' build
```

### Changes Not Reflected

After changing code in either dependency repo, rebuild and restart:

```bash
pnpm dev:local  # Rebuilds automatically
pnpm dev        # Restart dev server
```

### Switching Between Modes

If you experience issues after switching between local and npm modes:

```bash
# Clean and reinstall
pnpm clean
rm -rf node_modules
pnpm install  # or pnpm dev:local
```

### Verifying Local Mode is Active

When running `pnpm dev:local`, you should see:

```text
🔨 Building local openzeppelin-ui packages...
...
🔨 Building local openzeppelin-adapters packages...
...
[local-dev] @openzeppelin/ui-types → /path/to/openzeppelin-ui/packages/types
[local-dev] @openzeppelin/adapter-evm → /path/to/openzeppelin-adapters/packages/adapter-evm
...
✅ Using local @openzeppelin/ui-* packages from ../openzeppelin-ui
✅ Using local @openzeppelin/adapter-* packages from ../openzeppelin-adapters
```

## Best Practices

1. **Keep All Repos Updated**: Pull latest changes from all repos regularly
2. **Build Before Testing**: Always rebuild after changes
3. **Use npm for CI**: Local mode is for development only; CI should use npm packages
4. **Commit Separately**: Changes to openzeppelin-ui or openzeppelin-adapters should be committed/pushed separately
