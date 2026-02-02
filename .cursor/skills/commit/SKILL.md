---
name: commit
description: Creates commits following the monorepo's Conventional Commits standard with proper GPG signing, scope selection, and pre-commit validation. Use when creating commits, writing commit messages, or when the user asks to commit changes.
---

# Commit Skill for Role Manager Monorepo

This skill guides committing changes following the project's Conventional Commits standard.

## Critical Requirements

1. **Always run commits outside sandbox** - Full shell permissions required for GPG signing and pre-commit hooks
2. **Never use `--no-gpg-sign`** - All commits must be GPG-signed
3. **Never use `--no-verify`** - Pre-commit hooks must run

## Commit Format

```
<type>(<scope>): <subject>

[optional body]

[optional footer(s)]
```

### Rules

| Rule               | Requirement                                                          |
| ------------------ | -------------------------------------------------------------------- |
| Header max length  | 100 characters                                                       |
| Subject case       | lowercase (never sentence-case, start-case, pascal-case, upper-case) |
| Subject ending     | No period                                                            |
| Scope              | **Required** (scope-empty is enforced)                               |
| Body line length   | Max 100 characters                                                   |
| Body leading blank | Required if body present                                             |

## Commit Types

| Type       | Description                                             |
| ---------- | ------------------------------------------------------- |
| `feat`     | New feature                                             |
| `fix`      | Bug fix                                                 |
| `docs`     | Documentation only                                      |
| `style`    | Formatting, whitespace (no code change)                 |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `perf`     | Performance improvement                                 |
| `test`     | Adding or correcting tests                              |
| `build`    | Build system or external dependencies                   |
| `ci`       | CI configuration changes                                |
| `chore`    | Other changes (not src or test)                         |
| `revert`   | Reverts a previous commit                               |
| `wip`      | Work in progress (avoid if possible)                    |

## Allowed Scopes

The commitlint config enforces these scopes:

| Scope          | Description                      |
| -------------- | -------------------------------- |
| `role-manager` | Main application changes         |
| `components`   | Shared component changes         |
| `hooks`        | Shared hook changes              |
| `deps`         | Dependency updates               |
| `config`       | Configuration files              |
| `ci`           | CI/CD configuration              |
| `docs`         | Documentation                    |
| `spec`         | Specification/planning documents |
| `tests`        | Test-related changes             |
| `release`      | Release automation               |
| `ui`           | UI-specific changes              |
| `utils`        | Utility functions                |
| `types`        | TypeScript type definitions      |

## Commit Workflow

```bash
# 1. Stage changes
git add <files>

# 2. Commit with HEREDOC (recommended for multi-line messages)
git commit -m "$(cat <<'EOF'
feat(role-manager): add new contract template selector

Implements a dropdown component for selecting contract templates
with search functionality and categorization support.
EOF
)"

# Or simple one-liner
git commit -m "feat(role-manager): add new feature"
```

## Pre-commit Hooks

The following checks run automatically on commit:

1. **Node.js version check**: Requires Node.js 20.19.0+
2. **Local tarball detection**: Prevents committing `file:` dependencies pointing to local ui-builder
3. **Formatting**: Runs `pnpm fix-all` (prettier + eslint)
4. **Commit message validation**: Runs commitlint

If pre-commit fails:

- **Formatting/Linting**: Usually auto-fixed; re-stage and commit again
- **Local tarball**: Run `pnpm dev:npm` to switch to registry versions before committing
- **Commit message**: Fix message format and retry

## Pre-push Hooks

Before pushing, these checks run:

1. **Node.js version check**: Requires Node.js 20.19.0+
2. **Formatting and linting**: Runs `pnpm fix-all`

If pre-push fails, fix the issues and push again.

## Breaking Changes

Indicate breaking changes with `!` after type/scope:

```bash
feat(role-manager)!: change configuration interface
```

Or with a footer:

```
feat(role-manager): change configuration interface

BREAKING CHANGE: Configuration interface now requires new properties.
All consumers must update their configuration.
```

## Common Pitfalls

### Sandbox Mode Errors

**Symptom**: Commit fails with permission errors, GPG signing fails, or hooks don't run.

**Fix**: Run commit commands with full shell permissions (outside sandbox).

### Invalid Scope

**Symptom**: `scope-enum` error from commitlint.

**Fix**: Use one of the allowed scopes above. If a new scope is justified, update `commitlint.config.js`.

### Subject Case Error

**Symptom**: `subject-case` error.

**Fix**: Use lowercase for the entire subject:

- Bad: `Add new feature`
- Good: `add new feature`

### Missing Scope

**Symptom**: `scope-empty` error from commitlint.

**Fix**: Always include a scope. Choose the most relevant package or category.

### Local Tarball Dependencies

**Symptom**: Pre-commit fails with "Local tarball dependencies detected" error.

**Fix**: Run `pnpm dev:npm` to switch from local file paths to registry versions before committing.

## Examples

```bash
# Feature with app scope
feat(role-manager): add storage database factory

# Fix with component scope
fix(components): resolve button click handler issue

# Refactor with hooks scope
refactor(hooks): simplify useRecentContracts logic

# Specification documents
docs(spec): update data store service requirements

# Documentation
docs(docs): add local development guide

# Test changes
test(tests): add unit tests for ContractContext

# Dependencies update
chore(deps): update @openzeppelin/ui-builder to v1.2.0

# CI changes
ci(ci): add coverage threshold checks

# UI-specific changes
feat(ui): add dark mode support

# Utility functions
refactor(utils): optimize address validation

# Type definitions
feat(types): add ContractConfig interface
```

## Quick Reference

```bash
# Stage and commit
git add . && git commit -m "feat(role-manager): add feature"

# Check commit format is valid
echo "feat(role-manager): add feature" | npx commitlint

# View recent commit formats for reference
git log --oneline -10

# Amend last commit (only if not pushed!)
git commit --amend

# Switch to registry versions before committing
pnpm dev:npm
```

## Branch Naming

- Feature branches: `###-feature-name` (e.g., `003-data-store-service`)
- Use kebab-case for branch names
- Include feature number prefix when following spec workflow
