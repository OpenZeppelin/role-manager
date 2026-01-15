# Build stage
FROM node:25-slim@sha256:ee036ac49abf78c38be1ae0a622fb9aa2beeffe4d7b65eeca6fd2a90b685726d AS base

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
# Note: .pnpmfile.cjs is included because pnpm-lock.yaml has a checksum for it
# The hook is a no-op in Docker (LOCAL_UI env var is not set)
COPY ./package.json ./pnpm-lock.yaml ./pnpm-workspace.yaml ./.npmrc ./.pnpmfile.cjs ./
COPY ./tsconfig.json ./tsconfig.base.json ./tsconfig.node.json ./

# Copy all workspace packages and apps
COPY ./packages ./packages/
COPY ./apps ./apps/

# Install dependencies directly from the public npm registry
# Retry once on failure after clearing possible corrupted caches to avoid node-gyp issues
RUN pnpm install --frozen-lockfile || (echo "Install failed, clearing caches and retrying..." && rm -rf /root/.cache/node-gyp /root/.npm /root/.node-gyp && pnpm install --frozen-lockfile)

# Set Node.js memory limit to prevent OOM during build
# This is especially important for TypeScript compilation in CI environments
ENV NODE_OPTIONS="--max-old-space-size=4096"

# Build all packages and the application with optimizations
# Use filter to build packages first, then the app
# This provides better caching and error isolation
RUN pnpm build:app

# Runtime stage - using a slim image for a smaller footprint
FROM node:25-slim@sha256:ee036ac49abf78c38be1ae0a622fb9aa2beeffe4d7b65eeca6fd2a90b685726d AS runner

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
