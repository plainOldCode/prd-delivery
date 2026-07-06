# LLM Benchmark Dashboard

Web dashboard for measuring and comparing **local LLM performance** — speed, context retention, and accuracy. Run benchmarks with one click, visualize results in real time, and compare across models.

## Features

- **Speed**: Prompt tok/s, Generation tok/s, TTFT (Time to First Token)
- **Context Retention**: Needle-in-haystack tests at 500/1k/4k token sizes × 3 positions
- **Accuracy**: Rule-based QA scoring across 10 questions (math, logic, general knowledge)
- **Hardware Detection**: Auto-detects CPU, RAM, GPU for reproducibility

## Stack

| Layer | Choice | Why |
|---|---|---|
| Runtime | [Bun](https://bun.sh) | Fast start, built-in SQLite, fetch, test runner |
| Backend | [Hono](https://hono.dev) | ~25 KB bundle, lightweight, multi-runtime |
| Database | Bun:SQLite (built-in) | Zero extra deps, file-based, no server needed |
| Frontend | React 19 + Vite 6 + Tailwind CSS 4 | Light SPA, hot reload |
| Testing | Playwright E2E | Full browser automation with CI support |

## Quick Start

### Prerequisites

- [Bun](https://bun.sh) installed
- Ollama/MLX running locally (for real benchmarks; mock mode available for testing)

### Backend

```bash
cd backend
bun install
bun run dev          # localhost:8080 (set PORT=xxx to change)
bun run build        # → dist/index.js (~126 KB)
bun run test         # Bun native test runner
```

### Frontend

```bash
cd frontend
bun install
bun run dev          # localhost:5173, proxies /api → :8080
bun run build        # → dist/ (production)
```

## API Endpoints

### Benchmarks

| Method | Path | Description |
|---|---|---|
| `GET`  | `/api/models` | List available models (Ollama/MLX) |
| `POST` | `/api/bench/run` | Run full benchmark (SSE progress stream) |
| `GET`  | `/api/bench/history` | Past results (latest 50) |
| `GET`  | `/api/bench/:id` | Individual result + test details |
| `DELETE` | `/api/bench/:id` | Delete benchmark record |

### Hardware & Models

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/hardware` | Detect system specs (chip, cores, RAM) |

### Auth

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/auth/signin` | Sign in (JWT) |
| `POST` | `/api/auth/signup` | Create account |
| `POST` | `/api/auth/verify` | Verify identity |

### Legacy

| Method | Path | Description |
|---|---|---|
| `GET`  | `/api/health` | Health check |
| `GET`  | `/` | Service info (version, status) |

## Frontend Pages

| Page | Route | Description |
|---|---|---|
| Dashboard | `/bench` | Model selection → Run benchmark → Live progress |
| History | `/bench/history` | Past runs list + comparison view |
| Detail | `/bench/:id`, `/results/:id` | Individual run details with test breakdown |

## Database Schema

```sql
CREATE TABLE bench_runs (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    model_name    TEXT NOT NULL,
    hardware      TEXT,
    runtime       TEXT,          -- "ollama", "mlx", "backend"
    speed_prompt_tps REAL DEFAULT 0,
    speed_gen_tps    REAL DEFAULT 0,
    speed_ttft_ms    REAL DEFAULT 0,
    retention_pct    REAL DEFAULT 0,
    accuracy_pct     REAL DEFAULT 0,
    created_at    TEXT DEFAULT (datetime('now'))
);

CREATE TABLE bench_tests (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id        INTEGER REFERENCES bench_runs(id),
    category      TEXT,          -- 'speed', 'retention', 'accuracy'
    name          TEXT NOT NULL,
    passed        INTEGER NOT NULL,
    details       TEXT,          -- JSON string
    created_at    TEXT DEFAULT (datetime('now'))
);
```

## Makefile Commands

| Command | Description |
|---|---|
| `make help` | Show available targets |
| `make verify` | Local checks: build + unit test + typecheck + frontend build |
| `make e2e` | E2E tests (local — starts servers in background) |
| `make ci-e2e` | E2E tests (CI mode — expects servers pre-started) |

## Project Structure

```
├── backend/
│   ├── src/
│   │   ├── db/client.ts            # Bun:SQLite (init + connection)
│   │   ├── routes/auth.ts          # Auth (JWT sign-in/sign-up)
│   │   ├── routes/bench.ts         # Benchmark endpoints
│   │   ├── routes/tasks.ts         # Legacy CRUD endpoints
│   │   ├── services/bench.ts       # Bench runner (speed/retention/accuracy)
│   │   ├── services/hardware.ts    # Hardware detection
│   │   └── __tests__/              # Bun unit tests
│   └── dist/index.js               # Built backend (~126 KB)
├── frontend/
│   ├── src/
│   │   ├── pages/                  # BenchPage, BenchHistoryPage, etc.
│   │   ├── hooks/useBench.ts       # Benchmark state management
│   │   ├── auth/AuthContext.tsx    # Auth context (JWT)
│   │   ├── util/request.util.ts    # API client with env-based routing
│   │   └── App.tsx                 # Router + layout + auth guards
│   ├── e2e/                        # Playwright E2E tests
│   │   ├── auth.spec.ts            # Auth flow test
│   │   ├── bench.spec.ts           # Benchmark cycle test
│   │   └── helpers/                # Test helpers (auth, constants)
│   ├── playwright.config.ts        # E2E config (serial in CI)
│   └── vite.config.ts              # Dev server + proxy config
├── scripts/test-runner.sh          # E2E test runner (local + CI modes)
├── docs/prd/                       # Product requirements
│   ├── llm-bench.md                # LLM Benchmark PRD ✅ implemented
│   └── auth.md                     # Auth PRD ✅ implemented
├── Makefile                        # `make verify`, `make e2e`
└── AGENTS.md                      # Agent workflow instructions
```

## Testing

### Mock Mode

Set `BENCH_MOCK=true` to run benchmarks without an actual LLM server. Models return stub data — useful for CI and UI testing.

```bash
BENCH_MOCK=true bun run dev
```

### E2E Tests

| Test | Description |
|---|---|
| `auth.spec.ts` | Sign Up → Sign In → Dashboard → Sign Out flow |
| `bench.spec.ts` | Full benchmark cycle: Run → Progress → Detail Report |

## Dependencies

**Backend:** `hono` only — SQLite is built into Bun.

**Frontend:** React 19, Vite 6, Tailwind CSS 4, React Router DOM — minimal SPA.

Total backend bundle: **~126 KB** (bundled with Hono + services).

## Out of Scope (Phase 1)

- Public leaderboard — local-first design
- Vision/audio model benchmarks — text models only
- Multi-user authentication — single user local tool
