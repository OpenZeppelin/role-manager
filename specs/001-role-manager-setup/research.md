# Phase 0: Outline & Research

## Decisions & Rationale

### 1. Monorepo Structure

**Decision**: Mirror `contracts-ui-builder` exactly (`apps/` + `packages/`).
**Rationale**:

- Ensures compatibility with shared tooling and configuration.
- Facilitates "copy-paste" of configuration files (`tsconfig.json`, `eslint.config.js`).
- Allows for future expansion (e.g., adding `apps/rwa-manager` later).
  **Alternatives Considered**:
- _Single Project_: Rejected due to Constitution Principle II (Reuse-First) and multi-chain scalability needs.

### 2. Toolchain

**Decision**: Adopt `pnpm`, `vitest`, `tsup`, `vite`, `changesets`.
**Rationale**:

- **Mandated by Constitution**: Principle VI explicit requirements.
- **Performance**: `pnpm` workspace handling is efficient; `vite`/`vitest` offer fast feedback loops.
- **Consistency**: Matches upstream repo, reducing context switching for developers.

### 3. Local Development Integration

**Decision**: Implement "Local Tarball Workflow".
**Rationale**:

- **Mandated by Constitution**: Principle II prohibits symlinks.
- **Reliability**: Ensures that `role-manager` builds against the exact artifact structure that will be published to NPM, catching packaging issues early.
- **Mechanism**: A script `scripts/setup-local-dev.sh` will rewrite `package.json` dependencies to point to `file:../contracts-ui-builder/.packed-packages/*.tgz` on demand.

### 4. Versioning Strategy

**Decision**: Independent versioning for apps; synchronized for shared packages if coupled.
**Rationale**:

- `apps/role-manager` is a standalone product.
- `packages/components` may need to evolve with `contracts-ui-builder`.
- **Mechanism**: `changesets` handles this granularity natively.

## Unknowns & Risks

_None. The requirements are strictly "mirror the existing repo"._
