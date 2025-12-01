#!/usr/bin/env bash
# =============================================================================
# pack-ui-builder.sh
# =============================================================================
# Packs upstream UI Builder packages into tarballs for local development.
# This creates .tgz files that can be used as file: dependencies.
#
# Usage:
#   ./scripts/pack-ui-builder.sh [UI_BUILDER_PATH]
#
# Arguments:
#   UI_BUILDER_PATH  Path to the contracts-ui-builder repository
#                    (default: ../contracts-ui-builder)
#
# Output:
#   Creates .packed-packages/ directory in UI Builder with .tgz files
# =============================================================================

# set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_warn() { echo -e "${YELLOW}⚠️  $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }

# Default path to UI Builder (sibling directory)
UI_BUILDER_PATH="${1:-../contracts-ui-builder}"
PACKED_DIR=".packed-packages"

# Resolve to absolute path
UI_BUILDER_PATH=$(cd "$(dirname "$0")/.." && cd "$UI_BUILDER_PATH" 2>/dev/null && pwd) || {
  log_error "UI Builder not found at: ${1:-../contracts-ui-builder}"
  log_info "Please provide the correct path as an argument:"
  log_info "  ./scripts/pack-ui-builder.sh /path/to/contracts-ui-builder"
  exit 1
}

log_info "Using UI Builder at: $UI_BUILDER_PATH"

# Verify it's the correct repository
if [ ! -f "$UI_BUILDER_PATH/package.json" ]; then
  log_error "Not a valid Node.js project: $UI_BUILDER_PATH"
  exit 1
fi

# Check if it has the expected workspace structure
if [ ! -d "$UI_BUILDER_PATH/packages" ]; then
  log_error "No packages/ directory found. Is this contracts-ui-builder?"
  exit 1
fi

# Create output directory
PACK_OUTPUT="$UI_BUILDER_PATH/$PACKED_DIR"
mkdir -p "$PACK_OUTPUT"
log_info "Output directory: $PACK_OUTPUT"

# Clean old tarballs
log_info "Cleaning old tarballs..."
rm -f "$PACK_OUTPUT"/*.tgz

# Build UI Builder first
log_info "Building UI Builder packages..."
cd "$UI_BUILDER_PATH"
pnpm install --frozen-lockfile || pnpm install
pnpm build

# Pack each package
log_info "Packing packages..."
packed_count=0

for pkg_dir in packages/*/; do
  cd "$UI_BUILDER_PATH"
  if [ -f "$pkg_dir/package.json" ]; then
    pkg_name=$(node -p "require('./$pkg_dir/package.json').name" 2>/dev/null || echo "")
    if [ -n "$pkg_name" ]; then
      log_info "Packing $pkg_name in $pkg_dir..."
      cd "$UI_BUILDER_PATH/$pkg_dir" || { log_warn "Failed to cd into $pkg_dir"; continue; }
      
      # Skip midnight adapter if it's causing issues (temporary fix for debugging)
      if [[ "$pkg_name" == *"adapter-midnight"* ]]; then
         log_warn "Skipping $pkg_name (known issue)"
         continue
      fi

      if ! pnpm pack --pack-destination "$PACK_OUTPUT"; then
        log_warn "Failed to pack $pkg_name. Continuing..."
      else
        ((packed_count++))
      fi
    fi
  fi
done

cd "$UI_BUILDER_PATH"

# List created tarballs
log_success "Packed $packed_count packages!"
echo ""
log_info "Created tarballs:"
ls -la "$PACK_OUTPUT"/*.tgz 2>/dev/null || log_warn "No tarballs found"

echo ""
log_success "Done! Run 'scripts/setup-local-dev.sh' to use these packages."
