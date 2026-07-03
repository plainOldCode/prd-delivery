# AGENTS.md — PRD-Driven Delivery (Lightweight Agent Scaffold)

Drop a PRD into `docs/prd/` and this scaffold drives an agent through backend → frontend → e2e-test. Docs-first, AI-native workflow.

## Stack

| Layer | Choice |
|-------|--------|
| Runtime | [Bun](https://bun.sh) — fast start, built-in SQLite, fetch, test runner |
| Backend | [Hono](https://hono.dev) + TypeScript — ~25 KB bundle |
| Frontend | React 19 + Vite 6 + Tailwind CSS v4 |
| Database | Bun:SQLite (`bun:sqlite`) — prepared statements prevent SQL injection |
| Testing | `bun test` (unit/API) + Playwright (E2E, Chromium headless) |
| CI | GitHub Actions (push / PR on `main`) |

## Stack Constraints (Violating is an error)

1. **No ORM** — use `bun:sqlite` prepared statements directly. Drizzle, Prisma are too heavy.
2. **No Next.js / Nuxt** — routing overlap with Hono; keep it light.
3. **No Docker / Kubernetes** — local dev + CI is enough.

## Directory Structure

```
docs/prd/          ← PRD / Specs (see PRD Format below)
backend/           ← Hono + Bun (src/, src/__tests__)
frontend/          ← React + Vite (src/, e2e/)
scripts/           ← Shared scripts (verify.sh, test-runner.sh)
Makefile           → `make verify` / `make e2e`
AGENTS.md          → You are here
```

## Workflow: PRD → CODE

### Phase 0 — Test Infrastructure Green ⚡ (Do this FIRST)

> **Rule: If the test pipeline isn't green before you start coding, you will waste more time debugging "is it my code or my setup?" than you save by skipping this step.**

Before implementing a new PRD feature:

1. Run `make verify` — backend build + test + frontend type check + build must pass
2. Run `make e2e` — ensure Playwright starts both servers and existing tests pass
3. Check CI status on GitHub — the pipeline you run locally should match `.github/workflows/ci.yml`

If any of these fail **before your feature code**, fix the infrastructure first. This ~10-minute step saves 2+ hours of iterative debugging per feature.

### Phase 1 — Implement the Feature

1. **Write the PRD** — place `docs/prd/<feature>.md` following [TEMPLATE.md](docs/prd/TEMPLATE.md). See [example.md](docs/prd/example.md) for a real implementation.
2. **Implementation order** — the agent implements in this sequence:
    1. DB schema (SQLite table migration via `backend/src/db/client.ts`)
    2. Backend routes + tests (`backend/src/routes/`, `backend/src/__tests__/`)
    3. Frontend pages + API hooks (`frontend/src/pages/`, `frontend/src/lib/api.ts`)
    4. E2E test skeleton — copy from `frontend/e2e/helpers/template.spec.ts` and adapt
3. **Mark status** — update `status: "implemented"` in the PRD YAML frontmatter when done.

### Phase 2 — E2E Test Green

- Write the E2E test using helpers from `frontend/e2e/helpers/auth-helpers.ts` (for auth flows) or the template
- Run `make e2e` locally to confirm
- Push and verify CI passes end-to-end

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
- **Use in-memory SQLite**: set `DATABASE_URL="file::memory:"` when running tests
- **Assert critical path only**: status code + response shape. Don't test edge cases unless the PRD specifies them
- **Run tests after each step** — if `bun run test` fails, fix before moving on

#### E2E Test Pattern

```typescript
// frontend/e2e/<feature>.spec.ts — use this structure:
import { test, expect } from '@playwright/test';
import { loginAs } from '../helpers/auth-helpers';  // re-use auth helpers

test.describe('<Feature Name>', () => {
    test('critical user flow', async ({ page }) => {
        // 1. Navigate — use page.goto(), NOT waitForSelector first
        await page.goto('/<route>');

        // 2. Wait for a specific input or heading (id > data-testid > css selector)
        await expect(page.locator('#some-input')).toBeVisible({ timeout: 10_000 });

        // 3. Interact → Assert
        await page.locator('#some-input').fill('value');
        await page.locator('#submit-btn').click();
        await expect(page.locator('.result')).toBeVisible();
    });
});
```

**E2E Selector Priority (use in order):**
1. `id` attribute (`#username`) — most reliable, fastest
2. `data-testid` — for elements that don't have id
3. `.first()` / `.nth()` — last resort, fragile across page changes
4. NEVER use `getByLabel()` from Testing Library — Playwright has its own APIs

**Timing Pitfalls:**
- SPA redirects: Navigate directly to the target route instead of clicking links that trigger redirects
- Vite + Hono coexistence: Always wait for a DOM element to be visible before interacting
- Profile menus / dropdowns (like `#profile-menu`): Click the toggle first, then use `.first()` or explicit `text()` selector

### PRD Format — Required Sections

When creating a new feature spec, use [docs/prd/TEMPLATE.md](docs/prd/TEMPLATE.md) as your base. These sections are mandatory:

| Section | Purpose |
|---------|--------|
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
cd backend && bun run build         # Bundles ~25 KB
cd backend && DATABASE_URL="file::memory:" bun run test   # Tests with in-memory DB

# Frontend
cd frontend && tsc --noEmit         # Type check only
cd frontend && vite build           # Production build
cd frontend && npx playwright test  # E2E tests (manual mode)

# All at once
make verify                         # Backend + Frontend build + API tests
make e2e                            # Full E2E suite (starts backend + frontend servers)
```

## Known Pitfalls (Learned from Auth Feature)

| Symptom | Root Cause | Fix |
|---------|-----------|-----|
| Playwright can't find element after `page.goto('/')` | AuthContext redirect race — page renders blank before redirecting | Navigate directly to `/auth` instead of `/` |
| Vite webServer fails in CI with "relative path not found" | `../backend` doesn't resolve from the runner's cwd | Use `resolve(__dirname, '../..')/backend` for absolute paths |
| E2E "No tests found" | Playwright expects `*.spec.ts`, not `*.e2e.ts` | Name files `feature.spec.ts` |
| Port 5173 already in use | Vite dev server running from previous run | Set `reuseExistingServer: true` in config |
| `DATABASE_URL` not respected | Drizzle caches connection at module import time | Always set env BEFORE importing the app |

## Goal

Keep the PRD → CODE → TEST pipeline running autonomously. Deliver with the lightest possible stack — no unnecessary tooling, no heavy dependencies, no boilerplate.
