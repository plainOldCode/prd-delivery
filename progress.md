# Backend Migration Progress: Kotlin/Spring Boot → Hono + Bun + Drizzle

Loop: Every cron run picks the first `| start |` step, executes it, marks `| end |`, then continues to next.
Target directory: ~/.hermes/projects/prd-delivery-backend/backend/

## Steps

### Step 1: Project scaffolding — package.json, tsconfig, .env
- Status: `| pending |`
- **Do:** Create `package.json` (Hono, Bun, Zod, Drizzle+mysql2), `tsconfig.json` (strict ESM + path alias), `.env` template (DB_HOST, DB_PORT, DB_NAME, etc.)
- **Verify:** `bun install` succeeds; all packages resolved.

### Step 2: Hono entry point — src/index.ts with logger + CORS + root
- Status: `| pending |`
- **Do:** Create `src/index.ts` — import Hono, add `cors()`/`logger()` middleware, register `/` endpoint returning service metadata, use Bun serve. Leave route imports commented until step 6/7.
- **Verify:** `bun run dev` starts on port 3000; `curl localhost:3000/` returns JSON.

### Step 3: DB connection — Drizzle + mysql2 for MariaDB
- Status: `| pending |`
- **Do:** Create `.env.local` with DB credentials. Set up `src/db/client.ts` (drizzle-orm MySQL connector using mysql2). Write `drizzle.config.ts`.
- **Verify:** Import db client in src/index.ts and query `SELECT 1` returns successfully when MariaDB is running.

### Step 4: DB schema — sample_task as Drizzle schema + seed data
- Status: `| pending |`
- **Do:** Create `src/db/schemas.ts` — define `sampleTask` table matching original Liquibase (id, title, status, created_at, customer_request, requested_work, target_delivery_date, build_estimate, owner_name). Generate migration via `drizzle-kit generate`. Seed data for initial rows.
- **Verify:** Schema matches 0001-init.yaml + 0002-business-task-planning.yaml columns/types exactly.

### Step 5: Health route — GET /api/health
- Status: `| pending |`
- **Do:** Create `src/routes/health.ts` — return `{ service, workspace, profile, status, timestamp }` matching original HealthController response. Import and mount in index.ts.
- **Verify:** `GET /api/health` returns expected JSON shape (same as Spring Boot version).

### Step 6: Task routes — GET /api/tasks + POST /api/tasks
- Status: `| pending |`
- **Do:** Create `src/routes/tasks.ts` — list all tasks (ORDER BY id), create task with truncation logic (`toTitle`). Import and mount in index.ts.
- **Verify:** `GET /api/tasks` returns task list; `POST /api/tasks` creates new row + returns 201.

### Step 7: Zod validation — CreateBusinessTaskRequest schema
- Status: `| pending |`
- **Do:** Create `src/schemas.ts` — Zod schema for POST payload (customer_req required non-blank ≤255, requested_work ≤255, target_delivery_date required date, build_estimate ≤60, owner ≤80). Wire into route via `zValidator`.
- **Verify:** Invalid request returns 400 with field errors matching original TaskApiErrorResponse.

### Step 8: Error handling — Global error middleware
- Status: `| pending |`
- **Do:** Create global Hono middleware to catch Zod validation failures, unparseable body → `{ code, message, fieldErrors }`. Mount before routes.
- **Verify:** Malformed body → 400; validation failure → 400 with fieldErrors map.

### Step 9: Docker setup — Dockerfile (Bun-based) + docker-compose.yml
- Status: `| pending |`
- **Do:** Create multi-stage Dockerfile (Bun builder → Bun slim runtime). Update docker-compose.yml to match original structure (ports, env vars).
- **Verify:** `docker compose up --build` succeeds; containers start and respond.

### Step 10: Vitest test suite — smoke tests for routes
- Status: `| pending |`
- **Do:** Create `tests/smoke.test.ts` — test GET /, health endpoint, task CRUD. Use `supertest` or direct Hono request testing.
- **Verify:** `bun test` passes all tests.

### Step 11: Final integration — Build + run verification
- Status: `| pending |`
- **Do:** Run full build (`bun run build`), verify docker compose, ensure all endpoints work in Docker.
- **Verify:** Service fully functional via Docker matching original Spring Boot API behavior.
