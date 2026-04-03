# Build stage
FROM node:25-slim@sha256:5aea649bacdc35e8e20571131c4f3547477dfe66e677d45c005af6dbd1edfaa7 AS base

WORKDIR /app

# Set NODE_ENV to development to ensure devDependencies are installed for the build
ENV NODE_ENV=development

# Accept build argument for analytics feature flag
# - 'true': Enable Google Analytics tracking
# - 'false' or unset: Disable analytics (default for security/privacy)
ARG VITE_APP_CFG_FEATURE_FLAG_ANALYTICS_ENABLED=false
ENV VITE_APP_CFG_FEATURE_FLAG_ANALYTICS_ENABLED=$VITE_APP_CFG_FEATURE_FLAG_ANALYTICS_ENABLED

# Accept build argument for Google Analytics tag ID
ARG VITE_GA_TAG_ID
ENV VITE_GA_TAG_ID=$VITE_GA_TAG_ID

# Install build dependencies required for native Node.js modules
# node-gyp (used by some dependencies) requires python and build-essential
# 'python-is-python3' is used in newer Debian-based images instead of 'python'
RUN apt-get update && apt-get install -y python-is-python3 build-essential && rm -rf /var/lib/apt/lists/*

# Clear any potential corrupted Node.js cache that might cause gyp issues
RUN rm -rf /root/.cache/node-gyp /root/.npm /root/.node-gyp || true

# Install pnpm
RUN npm install -g pnpm

# Copy workspace configuration files
# Note: .pnpmfile.cjs is included because pnpm-lock.yaml has a checksum for it.
# The local-dev rewrite hook is a no-op in Docker (LOCAL_* env vars are not set),
# but the prerelease-widening hook (allowAdapterPrereleases) always runs.
COPY ./package.json ./pnpm-lock.yaml ./pnpm-workspace.yaml ./.npmrc ./.pnpmfile.cjs ./
COPY ./tsconfig.json ./tsconfig.base.json ./tsconfig.node.json ./

# Copy all workspace packages, apps, and scripts
COPY ./packages ./packages/
COPY ./apps ./apps/
COPY ./scripts ./scripts/

# Step 1: Install dependencies from frozen lockfile (exact production dependency tree)
# Retry once on failure after clearing possible corrupted caches to avoid node-gyp issues
RUN pnpm install --frozen-lockfile || (echo "Install failed, clearing caches and retrying..." && rm -rf /root/.cache/node-gyp /root/.npm /root/.node-gyp && pnpm install --frozen-lockfile)

# Step 2: Surgically override adapter packages for staging builds.
# When ADAPTER_DIST_TAG is set (e.g. "rc"), the resolution script queries npm for
# both the requested dist-tag and "latest", picks the newer version per adapter, and
# runs `pnpm add --save-exact` for only those packages. All non-adapter dependencies
# remain byte-for-byte identical to the frozen lockfile from Step 1.
# When ADAPTER_DIST_TAG is unset (production), this step is a no-op.
ARG ADAPTER_DIST_TAG
RUN if [ -n "$ADAPTER_DIST_TAG" ]; then \
      node scripts/resolve-staging-adapters.cjs "$ADAPTER_DIST_TAG"; \
    fi

# Set Node.js memory limit to prevent OOM during build
# This is especially important for TypeScript compilation in CI environments
ENV NODE_OPTIONS="--max-old-space-size=4096"

# Build all packages and the application with optimizations
# This step uses Docker BuildKit secrets to securely pass API keys
# The secrets are only available during this RUN command and won't be stored in the image
RUN --mount=type=secret,id=etherscan_api_key \
    --mount=type=secret,id=routescan_api_key \
    sh -c '\
        if [ -f /run/secrets/etherscan_api_key ]; then \
            export VITE_APP_CFG_SERVICE_ETHERSCANV2_API_KEY=$(cat /run/secrets/etherscan_api_key); \
        else \
            echo "Warning: Building without Etherscan API key"; \
        fi && \
        if [ -f /run/secrets/routescan_api_key ]; then \
            export VITE_APP_CFG_SERVICE_ROUTESCAN_API_KEY=$(cat /run/secrets/routescan_api_key); \
        else \
            echo "Warning: Building without Routescan API key"; \
        fi && \
        pnpm build:app'

# Runtime stage - using a slim image for a smaller footprint
FROM node:25-slim@sha256:5aea649bacdc35e8e20571131c4f3547477dfe66e677d45c005af6dbd1edfaa7 AS runner

# Set NODE_ENV to production for the final runtime image
ENV NODE_ENV=production

WORKDIR /app

# Install 'serve' to run the static application
RUN npm install -g serve

# Copy the built application from the base stage
COPY --from=base /app/apps/role-manager/dist ./dist

# Expose the port the app will run on
EXPOSE 3000

# Start the server to serve the static files from the 'dist' folder
CMD ["serve", "-s", "dist", "-l", "3000"]
