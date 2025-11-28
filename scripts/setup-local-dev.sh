#!/usr/bin/env bash
# =============================================================================
# setup-local-dev.sh
# =============================================================================
# Switches between npm registry and local tarball dependencies for UI Builder
# packages. This allows developing against local changes without publishing.
#
# Usage:
#   ./scripts/setup-local-dev.sh [local|registry]
#
# Modes:
#   local    - Use local tarballs from ../contracts-ui-builder/.packed-packages/
#   registry - Use packages from npm registry (default versions)
# =============================================================================

set -euo pipefail

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Check if node is available
if ! command -v node &> /dev/null; then
    echo "❌ Error: node is not installed."
    exit 1
fi

# Run the Node.js implementation
node "$SCRIPT_DIR/setup-local-dev.cjs" "$@"
