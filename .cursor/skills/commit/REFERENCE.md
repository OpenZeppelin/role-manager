# Commit Reference Documentation

Detailed reference for the commit skill with troubleshooting, configuration details, and advanced usage.

## Full commitlint Configuration

The project uses `@commitlint/config-conventional` with these customizations:

```javascript
// commitlint.config.js
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'body-leading-blank': [1, 'always'],
    'body-max-line-length': [2, 'always', 100],
    'footer-leading-blank': [1, 'always'],
    'footer-max-line-length': [2, 'always', 100],
    'header-max-length': [2, 'always', 100],
    'subject-case': [2, 'never', ['sentence-case', 'start-case', 'pascal-case', 'upper-case']],
    'subject-empty': [2, 'never'],
    'subject-full-stop': [2, 'never', '.'],
    'type-case': [2, 'always', 'lower-case'],
    'type-empty': [2, 'never'],
    'type-enum': [
      2,
      'always',
      [
        'build',
        'chore',
        'ci',
        'docs',
        'feat',
        'fix',
        'perf',
        'refactor',
        'revert',
        'style',
        'test',
        'wip',
      ],
    ],
    'scope-enum': [
      2,
      'always',
      [
        // App scopes
        'role-manager',
        // Package scopes
        'components',
        'hooks',
        // Infrastructure scopes
        'deps',
        'config',
        'ci',
        'docs',
        'spec',
        'tests',
        'release',
        // General scopes
        'ui',
        'utils',
        'types',
      ],
    ],
    'scope-empty': [2, 'never'],
  },
  ignores: [
    (message) =>
      message.includes('[skip ci]') ||
      /^chore\(release\):.+/.test(message) ||
      message === 'docs(tests): update coverage badges',
  ],
};
```

### Rule Severity Levels

- `0` = disabled
- `1` = warning
- `2` = error

## Husky Hooks Details

### commit-msg Hook

Location: `.husky/commit-msg`

Actions:

1. Skips validation in CI environments (when `$CI` is set)
2. Loads NVM and uses Node.js 20+ if available
3. Validates Node.js version (requires 20.19.0+)
4. Runs commitlint on the commit message
5. Provides helpful error messages with allowed scopes and types

### pre-commit Hook

Location: `.husky/pre-commit`

Actions:

1. Loads NVM and uses Node.js 20+ if available
2. Validates Node.js version (requires 20.19.0+)
3. Skips if no files are staged
4. Checks for local tarball dependencies (`file:.*ui-builder`) in `apps/role-manager/package.json`
5. Runs `pnpm fix-all` (prettier + eslint)

### pre-push Hook

Location: `.husky/pre-push`

Actions:

1. Loads NVM and uses Node.js 20+ if available
2. Validates Node.js version (requires 20.19.0+)
3. Runs `pnpm fix-all` (formatting and linting)

## Adding New Scopes

When a new package or module is created, update `commitlint.config.js`:

```javascript
'scope-enum': [
  2,
  'always',
  [
    // ... existing scopes
    'new-scope-name',  // Add new scope here
  ],
],
```

Common scenarios requiring new scopes:

| New Package/Feature    | Suggested Scope      |
| ---------------------- | -------------------- |
| `apps/<name>`          | `<name>`             |
| `packages/<name>`      | `<name>`             |
| New feature area       | Descriptive name     |
| New spec document      | `spec`               |

## Local Tarball Workflow

This project uses local tarballs for development with `@openzeppelin/ui-builder` packages.

### Development Mode (Local Tarballs)

```bash
# Switch to local tarball versions
pnpm dev:tarball
```

This allows developing with local ui-builder changes.

### Registry Mode (For Commits)

```bash
# Switch to registry versions before committing
pnpm dev:npm
```

**IMPORTANT**: Always run `pnpm dev:npm` before committing if you've been using local tarballs.

### Why This Matters

- Local `file:` paths work only on your machine
- CI/CD and other developers won't have access to your local paths
- The pre-commit hook blocks commits with local tarball dependencies

## Troubleshooting Decision Tree

```
Commit fails?
├── "scope-enum" error
│   └── Use allowed scope or update commitlint.config.js
├── "scope-empty" error
│   └── Add a scope: feat(scope): message
├── "subject-case" error
│   └── Use lowercase: "add feature" not "Add feature"
├── "header-max-length" error
│   └── Shorten subject to under 100 chars
├── "Local tarball dependencies detected"
│   └── Run: pnpm dev:npm
├── Hook permission denied / GPG signing failed
│   └── Running in sandbox mode - use full permissions
└── Node.js version error
    └── Use nvm to switch to Node.js 20+: nvm use 20
```

## Commit Message Templates

### Feature

```
feat(<scope>): add <feature description>

<Optional: More detailed explanation of what the feature does,
why it was added, and any important implementation details.>

<Optional: Related issues or context>
```

### Bug Fix

```
fix(<scope>): resolve <bug description>

<Optional: Explanation of what was wrong and how it was fixed>

Fixes #<issue-number>
```

### Breaking Change

```
feat(<scope>)!: change <breaking description>

<Explanation of what changed>

BREAKING CHANGE: <Description of breaking change and migration path>
```

### Refactor

```
refactor(<scope>): <what was refactored>

<Optional: Why the refactor was needed, what improved>
```

### Documentation

```
docs(<scope>): <what was documented>

<Optional: Additional context>
```

### Specification

```
docs(spec): <spec document description>

<Optional: Summary of spec changes>
```

## CI Considerations

Commits in CI skip the commit-msg hook (checked via `$CI` env var). However:

- Merge commits still validate on PR
- Release commits use special format: `chore(release): version packages`
- Coverage badge updates use: `docs(tests): update coverage badges`

## GPG Signing

All commits must be GPG-signed. If GPG signing fails:

1. Check GPG agent: `gpgconf --launch gpg-agent`
2. Set GPG_TTY: `export GPG_TTY=$(tty)`
3. Verify key: `gpg --list-secret-keys --keyid-format LONG`
4. Test signing: `echo "test" | gpg --clearsign`

**NEVER use `--no-gpg-sign`** - GPG signing is required for security and code integrity.
