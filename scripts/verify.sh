#!/bin/bash
set -euo pipefail

echo "=== PRD Delivery: Verify ==="

# Find bun in PATH instead of hardcoded path
BUN=$(command -v bun) || { echo "Bun not found in PATH"; exit 1; }
echo "Using Bun: $BUN"

echo ""
echo "--- Backend ---"
cd backend
$BUN install --frozen-lockfile
DATABASE_URL="file::memory:" $BUN run build
export DATABASE_URL="file::memory:"
$BUN run test || { echo "Backend tests failed"; exit 1; }
echo "Backend: OK"

echo ""
echo "--- Frontend ---"
cd ../frontend
$BUN install --frozen-lockfile
tsc --noEmit || { echo "Frontend type check failed"; exit 1; }
vite build || { echo "Frontend build failed"; exit 1; }
echo "Frontend: OK"

echo ""
echo "=== All checks passed ==="
