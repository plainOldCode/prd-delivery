# AGENTS.md — PRD-Driven Delivery (Lightweight Agent Scaffold)

Drop a PRD into `docs/prd/` and this scaffold drives an agent through backend → frontend → e2e-test. Docs-first, AI-native workflow.

## Stack

| Layer | Choice |
|-------|--------|
| Runtime | [Bun](https://bun.sh) — fast start, built-in SQLite, fetch, test runner |
| Backend | [Hono](https://hono.dev) + TypeScript — ~25 KB bundle |
| Frontend | React 19 + Vite 6 + Tailwind CSS v4 |
| Database | Bun:SQLite (`bun:sqlite`) — prepared statements prevent SQL injection |
| Testing | `bun test` — native runner, zero config, built-in describe/it/expect |
| CI | GitHub Actions (push / PR on `main`) |

## Stack Constraints (Violating is an error)

1. **No ORM** — use `bun:sqlite` prepared statements directly. Drizzle, Prisma are too heavy.
2. **No Next.js / Nuxt** — routing overlap with Hono; keep it light.
3. **No Docker / Kubernetes** — local dev + CI is enough.

## Directory Structure

```
docs/prd/         ← PRD / Specs (see PRD Format below)
backend/          ← Hono + Bun (src/, src/__tests__)
frontend/         ← React + Vite (src/, vite.config.ts)
Makefile          → `make verify` runs build + test pipeline
AGENTS.md         → You are here
```

## Workflow: PRD → CODE

1. **Write the PRD** — place `docs/prd/<feature>.md` following [TEMPLATE.md](docs/prd/TEMPLATE.md). See [example.md](docs/prd/example.md) for a real implementation.
2. **Implementation order** — the agent implements in this sequence:
    1. DB schema (SQLite table migration via `backend/src/db/client.ts`)
    2. Backend routes + tests (`backend/src/routes/`, `backend/src/__tests__/`)
    3. Frontend pages + API hooks (`frontend/src/pages/`, `frontend/src/lib/api.ts`)
    4. Verify — `make verify` must pass before marking the feature done
3. **Mark status** — update `status: "implemented"` in the PRD YAML frontmatter when done.

### Reading a PRD (Agent Behavior)

When you receive a PRD file or are told to implement a feature:

1. **Load the PRD** — read `docs/prd/<feature>.md` end-to-end
2. **Parse sections in order**:
    - `Database Schema` → update `backend/src/db/client.ts` with new tables
    - `API Endpoints` → create/update route files under `backend/src/routes/`
    - `Frontend Pages` → create page components, hooks, routes
    - `Test Requirements` → write matching test file(s)
3. **Implement one section at a time** — do not skip ahead to UI before the API is working

### Writing Tests (Rules)

Every new feature needs tests that prove it works:

- **One test file per route** → `backend/src/__tests__/<feature>.test.ts`
- **Use in-memory SQLite**: `export const DATABASE_URL = "file::memory:";` before importing the app
- **Assert critical path only**: status code + response shape. Don't test edge cases unless the PRD specifies them
- **Run tests after each step** — if `bun run test` fails, fix before moving on

### PRD Format — Required Sections

When creating a new feature spec, use [docs/prd/TEMPLATE.md](docs/prd/TEMPLATE.md) as your base. These sections are mandatory:

| Section | Purpose |
|---------|---------|
| `Overview` | What + Why — one paragraph context for the agent |
| `User Stories` | Behavior the user expects — drives acceptance criteria |
| `Database Schema` | SQL DDL → agent creates tables in `client.ts` |
| `API Endpoints` | HTTP method, path, body, response → agent writes routes + tests |
| `Frontend Pages` | UI structure → agent creates React components |
| `Acceptance Criteria` | Checkboxes the agent marks `[x]` when done |
| `Test Requirements` | What to test, how isolated tests should run |

An LLM can parse any `.md` file following this template and produce working code without asking questions.

### Code Style

- TypeScript strict mode. No `any`, no `// @ts-ignore`.
- Tailwind CSS (utility-first). No custom CSS files unless necessary.
- KISS/DRY: minimal tests, assert only the critical path.
- Remove boilerplate aggressively. If it's not needed, it doesn't exist.

## Common Commands

```bash
# Backend
cd backend && bun run build        # Bundles ~25 KB
cd backend && bun run test         # Native Bun test runner (in-memory SQLite)

# Frontend
cd frontend && tsc --noEmit        # Type check only
cd frontend && vite build          # Production build

# All at once
make verify                        # Backend + Frontend build + test
```

## Goal

Keep the PRD → CODE → TEST pipeline running autonomously. Deliver with the lightest possible stack — no unnecessary tooling, no heavy dependencies, no boilerplate.
