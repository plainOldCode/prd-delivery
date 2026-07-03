#!/bin/bash
# test-runner.sh — Run E2E tests locally or in CI with consistent setup.
# Usage: ./scripts/test-runner.sh [--ci]
#   --ci    Skip browser install (assume already cached), use line reporter
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CI_MODE="${1:-}"

BUN=$(command -v bun) || { echo "Bun not found in PATH"; exit 1; }

echo "=== E2E Test Runner ==="
echo "Project root: $PROJECT_ROOT"

# Install deps in both backend and frontend
echo ""
echo "--- Installing dependencies ---"
cd "$PROJECT_ROOT/backend" && $BUN install --frozen-lockfile 2>/dev/null || $BUN install
cd "$PROJECT_ROOT/frontend" && $BUN install --frozen-lockfile 2>/dev/null || $BUN install

# Install Playwright browsers (skip in CI — already cached)
if [ -z "$CI_MODE" ]; then
    echo ""
    echo "--- Installing Playwright browsers ---"
    cd "$PROJECT_ROOT/frontend" && npx playwright install chromium
fi

echo ""
echo "--- Running E2E tests ---"
cd "$PROJECT_ROOT/frontend"
export CI="$CI_MODE"
npx playwright test --config=e2e/playwright.config.ts
EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
    echo ""
    echo "=== All E2E tests passed ==="
else
    echo ""
    echo "=== E2E tests failed (exit code: $EXIT_CODE) ==="
fi

exit $EXIT_CODE
