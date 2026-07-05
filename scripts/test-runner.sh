#!/bin/bash
# test-runner.sh — Run E2E tests locally or in CI with consistent setup.
# Usage: ./scripts/test-runner.sh [--ci]
#    --ci    Skip browser install (assume already cached), use line reporter
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CI_MODE="${1:-}"

BUN=$(command -v bun)
if [ -z "$BUN" ]; then
    # Fallback for local development environment where .bun/bin might not be in PATH
    if [ -x "/Users/miniadmin/.bun/bin/bun" ]; then
        BUN="/Users/miniadmin/.bun/bin/bun"
    else
        echo "Bun not found in PATH or fallback /Users/miniadmin/.bun/bin/bun"; exit 1;
    fi
fi

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

# Clear persistent SQLite DB so E2E tests start fresh (local only)
if [ -z "$CI_MODE" ]; then
    echo ""
    echo "--- Clearing test database ---"
    rm -f "$PROJECT_ROOT/backend/data.db"
fi

echo ""
echo "--- Running E2E tests (Playwright webServer handles backend+frontend) ---"
cd "$PROJECT_ROOT/frontend"
export CI="$CI_MODE"
npx playwright test --config=playwright.config.ts
EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
    echo ""
    echo "=== All E2E tests passed ==="
else
    echo ""
    echo "=== E2E tests failed (exit code: $EXIT_CODE) ==="
fi

exit $EXIT_CODE
