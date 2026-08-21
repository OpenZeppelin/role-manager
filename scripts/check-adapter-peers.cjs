#!/usr/bin/env node
/**
 * Fails if an installed @openzeppelin/ui-* package is older than what an installed
 * @openzeppelin/adapter-* requires.
 *
 * The adapters enforce this themselves, but only at runtime: they call
 * validatePeerVersions() from @openzeppelin/ui-utils while building an ecosystem
 * runtime, and throw
 *
 *   [@openzeppelin/adapter-evm] Incompatible @openzeppelin/ui-types version.
 *     Installed: 3.3.0
 *     Required:  >=3.5.0
 *
 * Nothing in the build catches that. Typecheck passes (the types are compatible),
 * the unit tests pass (they never construct a real runtime), the app builds, and the
 * failure only appears in a browser -- where RuntimeProvider marks the network as
 * failed and refuses to retry, leaving the UI spinning forever. That is exactly how
 * bumping the adapters to 4.x while leaving the ui-* pins at 3.3.0 reached staging.
 *
 * Semantics deliberately mirror validatePeerVersions: it compares against the
 * *minimum* of the declared range, not the range itself. So ui-utils 4.0.0 against a
 * declared ^2.0.0 passes, because the runtime only asks for >= 2.0.0. Checking the
 * caret strictly here would report failures the adapters do not actually have.
 */

const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..');

/**
 * Candidate node_modules/@openzeppelin directories. pnpm workspaces install a
 * package's dependencies next to that package, so the app's copies are not
 * necessarily hoisted to the root.
 */
function candidateScopeDirs() {
  const dirs = [path.join(repoRoot, 'node_modules', '@openzeppelin')];
  for (const group of ['apps', 'packages']) {
    const groupDir = path.join(repoRoot, group);
    if (!fs.existsSync(groupDir)) continue;
    for (const entry of fs.readdirSync(groupDir, { withFileTypes: true })) {
      // Workspace members may themselves be symlinks, so do not filter on isDirectory().
      dirs.push(path.join(groupDir, entry.name, 'node_modules', '@openzeppelin'));
    }
  }
  return dirs.filter((dir) => fs.existsSync(dir));
}

const scopeDirs = candidateScopeDirs();

/** Read a package.json for @openzeppelin/<name> from the first scope dir that has it. */
function readPackage(name) {
  for (const dir of scopeDirs) {
    const file = path.join(dir, name, 'package.json');
    if (!fs.existsSync(file)) continue;
    try {
      return JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch {
      // fall through to the next candidate
    }
  }
  return null;
}

/** Every installed adapter-* name across all scope dirs. */
function installedAdapters() {
  const names = new Set();
  for (const dir of scopeDirs) {
    for (const entry of fs.readdirSync(dir)) {
      // pnpm links packages in as symlinks, so isDirectory() is false -- match on name.
      if (entry.startsWith('adapter-')) names.add(entry);
    }
  }
  return [...names].sort();
}

/** Lowest version a range admits: ^3.5.0, ~3.5.0, >=3.5.0 and 3.5.0 all give 3.5.0. */
function minimumOf(range) {
  const match = /(\d+)\.(\d+)\.(\d+)/.exec(range);
  return match ? match[0] : null;
}

function compareSemver(a, b) {
  const pa = a.replace(/-.+$/, '').split('.').map(Number);
  const pb = b.replace(/-.+$/, '').split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] ?? 0) !== (pb[i] ?? 0)) return (pa[i] ?? 0) - (pb[i] ?? 0);
  }
  return 0;
}

if (scopeDirs.length === 0) {
  console.error('✖ No node_modules/@openzeppelin directory found -- run pnpm install first.');
  process.exit(1);
}

const adapters = installedAdapters();
if (adapters.length === 0) {
  console.error('✖ No @openzeppelin/adapter-* packages installed -- nothing to validate.');
  process.exit(1);
}

const failures = [];
let checked = 0;

for (const adapter of adapters) {
  const adapterPkg = readPackage(adapter);
  if (!adapterPkg) continue;

  for (const [peerName, range] of Object.entries(adapterPkg.peerDependencies || {})) {
    if (!peerName.startsWith('@openzeppelin/ui-')) continue;

    const minimum = minimumOf(range);
    if (!minimum) continue;

    const peerPkg = readPackage(peerName.replace('@openzeppelin/', ''));
    if (!peerPkg) continue; // not installed here; this app may not use that peer

    checked += 1;
    if (compareSemver(peerPkg.version, minimum) < 0) {
      failures.push(
        `@openzeppelin/${adapter} requires ${peerName} >=${minimum}, but ${peerPkg.version} is installed.`
      );
    }
  }
}

if (failures.length > 0) {
  console.error('\n✖ Adapter peer version check failed\n');
  for (const failure of failures) {
    console.error(`  - ${failure}`);
  }
  console.error(
    '\nThe adapters throw on this at runtime, not at build time, so the app compiles\n' +
      'and tests cleanly and then fails in the browser with the network runtime stuck\n' +
      'in a failed state.\n\n' +
      'Fix: raise the @openzeppelin/ui-* versions in apps/role-manager/package.json AND\n' +
      'the overrides in pnpm-workspace.yaml -- the overrides pin exact versions and will\n' +
      'otherwise force the app ranges straight back down.\n'
  );
  process.exit(1);
}

if (checked === 0) {
  console.error('✖ Found adapters but resolved no @openzeppelin/ui-* peers -- check is not working.');
  process.exit(1);
}

console.log(`✓ Adapter peer version check passed (${checked} adapter/peer pairs)`);
