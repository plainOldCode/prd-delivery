export PATH="/Users/miniadmin/.bun/bin:${PATH}"

cd "$(dirname "$0")/../backend"

echo "==> Backend build"
bun run build || exit 1

echo "==> Health unit test (no server needed)"
bun test src/__tests__/health.test.ts || exit 1

SERVER_PORT=3999

echo "[test] killing old servers on :$SERVER_PORT ..."
kill $(lsof -ti:$SERVER_PORT 2>/dev/null) 2>/dev/null || true
sleep 0.5

echo "==> Starting backend on port $SERVER_PORT"
PORT=$SERVER_PORT bun run src/index.ts &
SERVER_PID=$!
sleep 1.5

echo "==> API integration test (server :$SERVER_PORT)"
PORT=$SERVER_PORT bun test src/__tests__/api.test.ts; result=$?
kill $SERVER_PID 2>/dev/null || true

cd "$(dirname "$0")/../frontend"

echo "==> Frontend type check"
bun x tsc --noEmit || exit 1

echo "==> Frontend build"
bun x vite build || exit 1

echo ""
echo "All checks passed OK"
