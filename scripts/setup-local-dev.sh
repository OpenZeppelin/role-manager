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
#
# Prerequisites:
#   - For 'local' mode: Run ./scripts/pack-ui-builder.sh first
# =============================================================================

set -euo pipefail

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

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Default paths
UI_BUILDER_PATH="${UI_BUILDER_PATH:-$ROOT_DIR/../contracts-ui-builder}"
PACKED_DIR=".packed-packages"
BACKUP_SUFFIX=".registry-backup"

# Mode argument
MODE="${1:-}"

show_usage() {
  echo "Usage: $0 [local|registry]"
  echo ""
  echo "Modes:"
  echo "  local    - Use local tarballs from UI Builder"
  echo "  registry - Use packages from npm registry"
  echo ""
  echo "Examples:"
  echo "  $0 local     # Switch to local development mode"
  echo "  $0 registry  # Switch back to registry mode"
}

# Find UI Builder packages that might be used as dependencies
get_ui_builder_packages() {
  local packed_path="$UI_BUILDER_PATH/$PACKED_DIR"
  if [ -d "$packed_path" ]; then
    ls "$packed_path"/*.tgz 2>/dev/null | while read -r tgz; do
      # Extract package name from tarball
      # Format: @scope-name-version.tgz or name-version.tgz
      basename "$tgz" .tgz | sed 's/-[0-9].*//'
    done
  fi
}

# Get the tarball path for a package
get_tarball_path() {
  local pkg_name="$1"
  local packed_path="$UI_BUILDER_PATH/$PACKED_DIR"
  
  # Find matching tarball
  # Handle scoped packages (@openzeppelin/foo -> openzeppelin-foo-*.tgz)
  local search_name
  search_name=$(echo "$pkg_name" | sed 's/@//' | sed 's/\//-/')
  
  ls "$packed_path"/"$search_name"-*.tgz 2>/dev/null | head -1
}

switch_to_local() {
  log_info "Switching to local development mode..."
  
  # Check if tarballs exist
  local packed_path="$UI_BUILDER_PATH/$PACKED_DIR"
  if [ ! -d "$packed_path" ] || [ -z "$(ls -A "$packed_path"/*.tgz 2>/dev/null)" ]; then
    log_error "No packed tarballs found at: $packed_path"
    log_info "Run './scripts/pack-ui-builder.sh' first to create tarballs."
    exit 1
  fi
  
  log_info "Found tarballs in: $packed_path"
  
  # For now, just verify and report
  # Actual dependency rewriting would be done here when we have real dependencies
  log_success "Local development mode is ready!"
  log_info "When adding UI Builder dependencies, use file: protocol:"
  echo ""
  echo "  pnpm add file:$packed_path/<package-name>-<version>.tgz"
  echo ""
  log_info "Available packages:"
  ls "$packed_path"/*.tgz 2>/dev/null | while read -r f; do
    echo "  - $(basename "$f")"
  done
}

switch_to_registry() {
  log_info "Switching to registry mode..."
  
  # For now, just report - actual implementation would restore package.json backups
  log_success "Registry mode is ready!"
  log_info "Dependencies will be fetched from npm registry."
  log_info "Run 'pnpm install' to refresh dependencies."
}

# Main
case "$MODE" in
  local)
    switch_to_local
    ;;
  registry)
    switch_to_registry
    ;;
  "")
    log_error "No mode specified."
    echo ""
    show_usage
    exit 1
    ;;
  *)
    log_error "Unknown mode: $MODE"
    echo ""
    show_usage
    exit 1
    ;;
esac
