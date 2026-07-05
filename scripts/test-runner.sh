#!/bin/bash
# test-runner.sh — Run E2E tests locally or in CI with consistent setup.
# Usage: ./scripts/test-runner.sh [--ci]
#      --ci    Skip browser install, start servers manually (CI mode)
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

mkdir -p "$PROJECT_ROOT/logs"

echo ""
if [ -n "$CI_MODE" ]; then
    echo "--- CI Mode: Starting servers in background, then running Playwright ---"
    
    # Start Backend server in background
    cd "$PROJECT_ROOT/backend"
    export DATABASE_URL="file:$PROJECT_ROOT/backend/data.db"
    export BENCH_MOCK="${BENCH_MOCK:-false}"
    nohup $BUN run start > "$PROJECT_ROOT/logs/backend.log" 2>&1 &
    BACKEND_PID=$!
    
    # Wait for Backend to be ready
    echo "Waiting for Backend server (port 8080)..."
    for i in $(seq 1 30); do
        if curl -s http://localhost:8080/api/health > /dev/null 2>&1; then
            echo "Backend is ready!"
            break
        fi
        if [ $i -eq 30 ]; then
            echo "Backend failed to start within 30 seconds"
            cat "$PROJECT_ROOT/logs/backend.log" 2>/dev/null || true
            exit 1
        fi
        sleep 1
    done
    
    # Build Frontend (for preview mode)
    cd "$PROJECT_ROOT/frontend" && $BUN x vite build
    
    # Start Frontend preview server in background
    nohup $BUN x vite preview --port 3000 > "$PROJECT_ROOT/logs/frontend.log" 2>&1 &
    FRONTEND_PID=$!
    
    # Wait for Frontend to be ready
    echo "Waiting for Frontend server (port 3000)..."
    for i in $(seq 1 30); do
        if curl -s http://localhost:3000 > /dev/null 2>&1; then
            echo "Frontend is ready!"
            break
        fi
        if [ $i -eq 30 ]; then
            echo "Frontend failed to start within 30 seconds"
            cat "$PROJECT_ROOT/logs/frontend.log" 2>/dev/null || true
            exit 1
        fi
        sleep 1
    done
    
    # Run Playwright tests (CI mode: servers already started)
    cd "$PROJECT_ROOT/frontend"
    export CI="$CI_MODE"
    npx playwright test
    EXIT_CODE=$?
    
    # Cleanup — stop background servers
    echo ""
    echo "--- Stopping servers ---"
    kill $BACKEND_PID 2>/dev/null || true
    kill $FRONTEND_PID 2>/dev/null || true
    wait $BACKEND_PID 2>/dev/null || true
    wait $FRONTEND_PID 2>/dev/null || true
    
else
    echo "--- Local Mode: Running E2E tests (Playwright webServer handles frontend) ---"
    cd "$PROJECT_ROOT/frontend"
    export CI="$CI_MODE"
    npx playwright test
    EXIT_CODE=$?
fi

if [ $EXIT_CODE -eq 0 ]; then
    echo ""
    echo "=== All E2E tests passed ==="
else
    echo ""
    echo "=== E2E tests failed (exit code: $EXIT_CODE) ==="
fi

exit $EXIT_CODE
