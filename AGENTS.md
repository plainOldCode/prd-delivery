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
docs/            ← PRD / Specs go here
backend/         ← Hono + Bun (src/, __tests__)
frontend/        ← React + Vite (src/, vite.config.ts)
Makefile         → `make verify` runs build + test pipeline
AGENTS.md        → You are here
```

## Workflow: PRD → CODE

1. **Write the PRD** — place `docs/prd/<feature>.md` with a clear spec in Markdown.
2. **Implementation order** — the agent implements in this sequence:
   1. DB schema (SQLite table migration via `db/client.ts`)
   2. Backend routes + tests (`backend/src/routes/`, `backend/src/__tests__/`)
   3. Frontend pages + API hooks (`frontend/src/pages/`, `frontend/src/lib/api.ts`)
   4. E2E smoke test (`backend/src/__tests__/e2e-*.ts`)
3. **Verify** — run `make verify` or the commands below manually.

## Local LLM Loop Setup

Agents run Ollama / MLX models in a loop to convert PRDs into code. Each step requires a **self-check**:

```bash
# 1. Backend: type check + build + test
cd backend && bun run build && bun run test

# 2. Frontend: type check + build
cd frontend && tsc --noEmit && vite build

# 3. Full integration
make verify
```

### Loop Strategy (Critical — Avoid Reasoning Loops)

| Model | Settings |
|---|---|
| Qwen3 | `temperature 0.6-0.7`, `repeat_penalty 1.15` |
| Gemma4 | `temperature 1.0`, `top_k 40`, `--jinja` |

**Never** stack `repeat_penalty` + `frequency_penalty` — they cancel each other out.

### PRD-Driven Code Generation Order

When the agent reads a PRD and writes code:

1. **Schema first** — design SQLite tables/columns, verify in isolation.
2. **API layer** — define route → write test → run `bun run test` to confirm passing.
3. **Frontend layer** — page component → api.ts hook → build verification.
4. **Module isolation** — 1 feature = 1 routes file + 1 test file. No monoliths.

### Code Style

- TypeScript strict mode. No `any`, no `// @ts-ignore`.
- Tailwind CSS (utility-first). No custom CSS files unless necessary.
- KISS/DRY: minimal tests, assert only the critical path.
- Remove boilerplate aggressively. If it's not needed, it doesn't exist.

## Common Commands

```bash
# Backend
cd backend && bun run build       # Bundles ~25 KB
cd backend && bun run test        # Native Bun test runner

# Frontend
cd frontend && tsc --noEmit       # Type check only
cd frontend && vite build         # Production build

# All at once
make verify                       # Backend + Frontend build + test (defined in Makefile)
```

## Goal

Keep the PRD → CODE → TEST pipeline running autonomously. Deliver with the lightest possible stack — no unnecessary tooling, no heavy dependencies, no boilerplate.
