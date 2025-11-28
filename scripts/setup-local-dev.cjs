#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const args = process.argv.slice(2);
const mode = args[0];
const targetVersion = args[1];

if (!['local', 'registry'].includes(mode)) {
  console.error('Usage: ./scripts/setup-local-dev.sh [local|registry] [version]');
  process.exit(1);
}

const packageJsonPath = path.resolve(__dirname, '../apps/role-manager/package.json');
// Assuming the ui-builder repo is at ../../contracts-ui-builder relative to scripts/
const uiBuilderPath = path.resolve(__dirname, '../../contracts-ui-builder');
const packedDir = '.packed-packages';

const packages = {
  '@openzeppelin/ui-builder-styles': {
    version: '^0.10.0',
    filePattern: 'openzeppelin-ui-builder-styles-0.10.0.tgz',
  },
  '@openzeppelin/ui-builder-ui': {
    version: '^0.16.0',
    filePattern: 'openzeppelin-ui-builder-ui-0.16.0.tgz',
  },
};

const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

let changed = false;

if (mode === 'local') {
  console.log('🔄 Switching to local tarball dependencies...');

  for (const [name, config] of Object.entries(packages)) {
    const tarballPath = path.join(uiBuilderPath, packedDir, config.filePattern);
    // Relative path from apps/role-manager/package.json to the tarball
    const relativePath = path.relative(path.dirname(packageJsonPath), tarballPath);
    const fileUrl = `file:${relativePath}`;

    if (fs.existsSync(tarballPath)) {
      pkg.dependencies[name] = fileUrl;
      console.log(`✅ Linked ${name} -> ${fileUrl}`);
      changed = true;
    } else {
      console.error(`❌ Tarball not found: ${tarballPath}`);
      console.error('   Run ./scripts/pack-ui-builder.sh first.');
      process.exit(1);
    }
  }
} else {
  console.log('🔄 Switching to registry dependencies...');

  const versionToUse = targetVersion || 'latest';

  for (const [name, config] of Object.entries(packages)) {
    pkg.dependencies[name] = versionToUse;
    console.log(`✅ Set ${name} -> ${versionToUse}`);
    changed = true;
  }
}

if (changed) {
  fs.writeFileSync(packageJsonPath, JSON.stringify(pkg, null, 2) + '\n');
  console.log('💾 package.json updated.');
  try {
    console.log('📦 Running pnpm install...');
    execSync('pnpm install', { stdio: 'inherit', cwd: path.dirname(packageJsonPath) });
  } catch (e) {
    console.error('❌ pnpm install failed.');
    process.exit(1);
  }
} else {
  console.log('ℹ️  No changes needed.');
}
