# Local Development with openzeppelin-ui and ui-builder

This guide explains how to develop with local versions of `@openzeppelin/ui-*` packages from [openzeppelin-ui](https://github.com/OpenZeppelin/openzeppelin-ui) and `@openzeppelin/ui-builder-adapter-*` packages from [ui-builder](https://github.com/OpenZeppelin/ui-builder).

## Quick Start

```bash
# 1. Clone all three repos as siblings
cd ~/dev/repos/OpenZeppelin
git clone git@github.com:OpenZeppelin/role-manager.git
git clone git@github.com:OpenZeppelin/openzeppelin-ui.git
git clone git@github.com:OpenZeppelin/ui-builder.git

# 2. Install dependencies in openzeppelin-ui
cd openzeppelin-ui
pnpm install

# 3. Install dependencies in ui-builder
cd ../ui-builder
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

```
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
└── ui-builder/                # Adapter packages
    └── packages/
        ├── adapter-evm/       # @openzeppelin/ui-builder-adapter-evm
        ├── adapter-stellar/   # @openzeppelin/ui-builder-adapter-stellar
        └── adapter-solana/    # @openzeppelin/ui-builder-adapter-solana
```

## Commands

### Switch to Local Packages

```bash
pnpm dev:local
```

This command automatically:

1. Builds packages in local openzeppelin-ui (defaults to `../openzeppelin-ui`)
2. Builds adapter packages in local ui-builder (defaults to `../ui-builder`)
3. Runs `LOCAL_UI=true pnpm install` to resolve all dependencies to local paths

This ensures you always have up-to-date compiled types when working with local packages.

### Custom Paths

If your repos are in different locations, use environment variables:

```bash
LOCAL_UI_PATH=/path/to/openzeppelin-ui LOCAL_UI_BUILDER_PATH=/path/to/ui-builder pnpm dev:local
```

### Switch Back to npm Packages

```bash
pnpm dev:npm
```

This runs a regular `pnpm install` which uses the published npm versions.

## Development Workflow

### Making Changes to UI Packages

1. Make changes in `openzeppelin-ui/packages/*`
2. Rebuild and reinstall:
   ```bash
   pnpm dev:local  # Rebuilds and reinstalls
   ```
3. Restart the dev server if needed

### Making Changes to Adapter Packages

1. Make changes in `ui-builder/packages/adapter-*`
2. Rebuild and reinstall:
   ```bash
   pnpm dev:local  # Rebuilds and reinstalls
   ```
3. Restart the dev server if needed

### Hot Reload (Advanced)

For faster iteration, run builds in watch mode:

```bash
# Terminal 1: Watch openzeppelin-ui
cd openzeppelin-ui
pnpm build --watch  # If supported

# Terminal 2: Watch ui-builder adapters
cd ui-builder
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
cd ../ui-builder && pnpm install && pnpm --filter='./packages/adapter-*' build
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

```
🔨 Building local openzeppelin-ui packages...
...
🔨 Building local ui-builder adapter packages...
...
[local-dev] @openzeppelin/ui-types → /path/to/openzeppelin-ui/packages/types
[local-dev] @openzeppelin/ui-builder-adapter-evm → /path/to/ui-builder/packages/adapter-evm
...
✅ Using local @openzeppelin/ui-* packages from ../openzeppelin-ui
✅ Using local @openzeppelin/ui-builder-adapter-* packages from ../ui-builder
```

## Best Practices

1. **Keep All Repos Updated**: Pull latest changes from all repos regularly
2. **Build Before Testing**: Always rebuild after changes
3. **Use npm for CI**: Local mode is for development only; CI should use npm packages
4. **Commit Separately**: Changes to openzeppelin-ui or ui-builder should be committed/pushed separately
