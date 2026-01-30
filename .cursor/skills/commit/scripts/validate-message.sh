#!/usr/bin/env bash
# Validate a commit message against the project's commitlint rules
# Usage: ./validate-message.sh "feat(role-manager): add new feature"

set -e

if [ -z "$1" ]; then
  echo "Usage: $0 \"<commit-message>\""
  echo ""
  echo "Examples:"
  echo "  $0 \"feat(role-manager): add new feature\""
  echo "  $0 \"fix(components): resolve button click handler\""
  echo "  $0 \"docs(spec): update data store requirements\""
  echo ""
  echo "Allowed scopes: role-manager, components, hooks, deps, config, ci, docs, spec, tests, release, ui, utils, types"
  echo "Allowed types: build, chore, ci, docs, feat, fix, perf, refactor, revert, style, test, wip"
  exit 1
fi

MESSAGE="$1"

# Find the project root (where commitlint.config.js lives)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../../.." && pwd)"

cd "$PROJECT_ROOT"

echo "Validating: $MESSAGE"
echo "---"

echo "$MESSAGE" | npx --no -- commitlint

if [ $? -eq 0 ]; then
  echo "---"
  echo "✅ Commit message is valid!"
else
  echo "---"
  echo "❌ Commit message is invalid. See errors above."
  exit 1
fi
