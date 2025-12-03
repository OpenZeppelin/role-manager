#!/usr/bin/env node
/**
 * setup-local-dev.cjs
 *
 * Switches role-manager dependencies between local tarballs and npm registry.
 * This enables testing UI Builder changes before publishing to npm.
 *
 * Usage:
 *   node scripts/setup-local-dev.cjs local    # Use local tarballs
 *   node scripts/setup-local-dev.cjs registry # Use npm registry (latest)
 *   node scripts/setup-local-dev.cjs registry 0.16.0  # Use specific version
 *
 * Prerequisites:
 *   Run ./scripts/pack-ui-builder.sh first to create tarballs
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const args = process.argv.slice(2);
const mode = args[0];
const targetVersion = args[1];

if (!['local', 'registry'].includes(mode)) {
  console.error('Usage: node scripts/setup-local-dev.cjs [local|registry] [version]');
  console.error('');
  console.error('Modes:');
  console.error('  local     Use local tarballs from UI Builder');
  console.error('  registry  Use npm registry (default: latest)');
  console.error('');
  console.error('Examples:');
  console.error('  node scripts/setup-local-dev.cjs local');
  console.error('  node scripts/setup-local-dev.cjs registry');
  console.error('  node scripts/setup-local-dev.cjs registry 0.16.0');
  process.exit(1);
}

const packageJsonPath = path.resolve(__dirname, '../apps/role-manager/package.json');
const uiBuilderPath = path.resolve(__dirname, '../../contracts-ui-builder');
const packedDir = '.packed-packages';
const packedPath = path.join(uiBuilderPath, packedDir);

/**
 * All UI Builder packages that role-manager may depend on.
 * The script will dynamically find tarballs for these packages.
 */
const UI_BUILDER_PACKAGES = [
  // Core packages (always needed)
  '@openzeppelin/ui-builder-renderer',
  '@openzeppelin/ui-builder-storage',
  '@openzeppelin/ui-builder-styles',
  '@openzeppelin/ui-builder-types',
  '@openzeppelin/ui-builder-ui',
  '@openzeppelin/ui-builder-utils',
  // Adapter packages (needed for network/address validation)
  '@openzeppelin/ui-builder-adapter-evm',
  '@openzeppelin/ui-builder-adapter-stellar',
  '@openzeppelin/ui-builder-adapter-solana',
  // Midnight adapter has complex WASM dependencies - include if needed
  // '@openzeppelin/ui-builder-adapter-midnight',
];

/**
 * Find the tarball for a package in the packed directory.
 * Handles version changes by pattern matching.
 *
 * @param {string} packageName - e.g., '@openzeppelin/ui-builder-types'
 * @returns {{ tarball: string, version: string } | null}
 */
function findTarball(packageName) {
  if (!fs.existsSync(packedPath)) {
    return null;
  }

  // Convert @openzeppelin/ui-builder-types -> openzeppelin-ui-builder-types
  const tarballPrefix = packageName.replace('@', '').replace('/', '-');

  const files = fs.readdirSync(packedPath);
  const tarball = files.find((f) => f.startsWith(tarballPrefix) && f.endsWith('.tgz'));

  if (!tarball) {
    return null;
  }

  // Extract version from filename: openzeppelin-ui-builder-types-0.16.0.tgz -> 0.16.0
  const versionMatch = tarball.match(/-(\d+\.\d+\.\d+)\.tgz$/);
  const version = versionMatch ? versionMatch[1] : 'unknown';

  return { tarball, version };
}

/**
 * Check which packages are currently in package.json dependencies
 */
function getCurrentDependencies(pkg) {
  const deps = pkg.dependencies || {};
  return UI_BUILDER_PACKAGES.filter((name) => name in deps);
}

const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
let changed = false;
const results = { success: [], failed: [], skipped: [] };

if (mode === 'local') {
  console.log('🔄 Switching to local tarball dependencies...\n');

  // Check if packed directory exists
  if (!fs.existsSync(packedPath)) {
    console.error(`❌ Packed packages directory not found: ${packedPath}`);
    console.error('');
    console.error('Run the pack script first:');
    console.error('  ./scripts/pack-ui-builder.sh');
    process.exit(1);
  }

  // Get current dependencies to know what to update
  const currentDeps = getCurrentDependencies(pkg);

  if (currentDeps.length === 0) {
    console.log('ℹ️  No UI Builder packages found in dependencies.');
    console.log('   Add packages to dependencies first, then run this script.');
    process.exit(0);
  }

  console.log(`Found ${currentDeps.length} UI Builder packages in dependencies:\n`);

  for (const packageName of currentDeps) {
    const found = findTarball(packageName);

    if (found) {
      const tarballFullPath = path.join(packedPath, found.tarball);
      const relativePath = path.relative(path.dirname(packageJsonPath), tarballFullPath);
      const fileUrl = `file:${relativePath}`;

      pkg.dependencies[packageName] = fileUrl;
      console.log(`  ✅ ${packageName}`);
      console.log(`     -> ${fileUrl} (v${found.version})`);
      results.success.push(packageName);
      changed = true;
    } else {
      console.log(`  ❌ ${packageName}`);
      console.log(`     Tarball not found in ${packedPath}`);
      results.failed.push(packageName);
    }
  }

  // Show summary
  console.log('');
  if (results.failed.length > 0) {
    console.log(
      '⚠️  Some packages failed. Run ./scripts/pack-ui-builder.sh to create missing tarballs.'
    );
  }
} else {
  console.log('🔄 Switching to registry dependencies...\n');

  const versionToUse = targetVersion || 'latest';
  const currentDeps = getCurrentDependencies(pkg);

  if (currentDeps.length === 0) {
    console.log('ℹ️  No UI Builder packages found in dependencies.');
    process.exit(0);
  }

  for (const packageName of currentDeps) {
    // Check if it's currently a file: dependency
    const currentValue = pkg.dependencies[packageName];
    if (currentValue && currentValue.startsWith('file:')) {
      pkg.dependencies[packageName] = versionToUse;
      console.log(`  ✅ ${packageName} -> ${versionToUse}`);
      results.success.push(packageName);
      changed = true;
    } else {
      console.log(`  ⏭️  ${packageName} (already using registry: ${currentValue})`);
      results.skipped.push(packageName);
    }
  }
}

// Handle pnpm overrides for local mode
// This ensures transitive dependencies also use local tarballs
if (mode === 'local' && results.success.length > 0) {
  console.log('\n🔧 Setting up pnpm overrides for transitive dependencies...');

  // Read root package.json for overrides
  const rootPkgPath = path.resolve(__dirname, '../package.json');
  const rootPkg = JSON.parse(fs.readFileSync(rootPkgPath, 'utf8'));

  if (!rootPkg.pnpm) {
    rootPkg.pnpm = {};
  }
  if (!rootPkg.pnpm.overrides) {
    rootPkg.pnpm.overrides = {};
  }

  // Add overrides for all successfully linked packages
  for (const packageName of results.success) {
    const found = findTarball(packageName);
    if (found) {
      const tarballFullPath = path.join(packedPath, found.tarball);
      const relativePath = path.relative(path.dirname(rootPkgPath), tarballFullPath);
      rootPkg.pnpm.overrides[packageName] = `file:${relativePath}`;
      console.log(`  ✅ Override: ${packageName}`);
    }
  }

  fs.writeFileSync(rootPkgPath, JSON.stringify(rootPkg, null, 2) + '\n');
  console.log('💾 Updated root package.json with pnpm overrides');
} else if (mode === 'registry') {
  // Remove overrides when switching back to registry
  const rootPkgPath = path.resolve(__dirname, '../package.json');
  const rootPkg = JSON.parse(fs.readFileSync(rootPkgPath, 'utf8'));

  if (rootPkg.pnpm?.overrides) {
    let removedCount = 0;
    for (const packageName of UI_BUILDER_PACKAGES) {
      if (rootPkg.pnpm.overrides[packageName]) {
        delete rootPkg.pnpm.overrides[packageName];
        removedCount++;
      }
    }
    if (removedCount > 0) {
      // Clean up empty objects
      if (Object.keys(rootPkg.pnpm.overrides).length === 0) {
        delete rootPkg.pnpm.overrides;
      }
      if (Object.keys(rootPkg.pnpm).length === 0) {
        delete rootPkg.pnpm;
      }
      fs.writeFileSync(rootPkgPath, JSON.stringify(rootPkg, null, 2) + '\n');
      console.log(`\n🧹 Removed ${removedCount} pnpm overrides from root package.json`);
    }
  }
}

// Write changes and install
if (changed) {
  console.log('');
  fs.writeFileSync(packageJsonPath, JSON.stringify(pkg, null, 2) + '\n');
  console.log('💾 Updated apps/role-manager/package.json');

  console.log('📦 Running pnpm install...\n');
  try {
    execSync('pnpm install --no-frozen-lockfile', {
      stdio: 'inherit',
      cwd: path.resolve(__dirname, '..'),
    });
    console.log('\n✅ Done! Dependencies updated successfully.');
  } catch (e) {
    console.error('\n❌ pnpm install failed. You may need to run it manually.');
    process.exit(1);
  }
} else {
  console.log('\nℹ️  No changes needed.');
}

// Final summary
console.log('');
console.log('Summary:');
console.log(`  ✅ Updated: ${results.success.length}`);
if (results.failed.length > 0) {
  console.log(`  ❌ Failed:  ${results.failed.length} (${results.failed.join(', ')})`);
}
if (results.skipped.length > 0) {
  console.log(`  ⏭️  Skipped: ${results.skipped.length}`);
}
