# PRD Delivery

Lightweight **Hono (Bun)** backend + **React (Vite)** frontend. SQLite-based CRUD API with a SPA frontend — AI-driven, docs-first workflow.

## Stack

| Layer | Choice | Why |
|---|---|---|
| Runtime | [Bun](https://bun.sh) | Fast start, built-in SQLite, fetch, test runner |
| Backend | [Hono](https://hono.dev) | ~25 KB bundle, lightweight, multi-runtime |
| Database | Bun:SQLite (built-in) | Zero extra deps, file-based, no server needed |
| Frontend | React 19 + Vite 6 + Tailwind CSS 4 | Light SPA, hot reload, AI-friendly |
| Testing | `bun test` | Native runner, zero config |

## Quick Start

### Backend

```bash
cd backend
bun install
bun run dev         # localhost:3000 (set PORT=xxx to change)
bun run build       # → dist/index.js (~25 KB)
bun run test        # Bun native test runner
```

### Frontend

```bash
cd frontend
bun install
bun run dev         # localhost:5173, proxies /api → :3000
bun run build       # → dist/ (production)
```

## API Endpoints

| Method | Path | Description |
|---|---|---|
| `GET`   | `/`               | Service info (version, status) |
| `GET`   | `/api/health`     | Health check |
| `GET`   | `/api/tasks`      | List all tasks |
| `GET`   | `/api/tasks/:id`  | Get single task |
| `POST`  | `/api/tasks`      | Create task (201) |
| `PUT`   | `/api/tasks/:id`  | Update task |
| `DELETE`| `/api/tasks/:id`  | Delete task |

### Example: Create a Task

```bash
curl -X POST http://localhost:3000/api/tasks \
   -H 'Content-Type: application/json' \
   -d '{"title": "PRD Review", "customer_request": "Design meeting"}'
```

## Project Structure

```
├── backend/
│   ├── src/
│   │   ├── db/client.ts           # Bun:SQLite (init + connection)
│   │   ├── routes/tasks.ts        # CRUD endpoints
│   │   ├── routes/health.ts       # Health check
│   │   └── __tests__/             # Bun test runner
│   └── Dockerfile                 # (legacy — optional)
├── frontend/
│   ├── src/
│   │   ├── pages/                 # HomePage, TasksPage
│   │   ├── lib/api.ts             # API client
│   │   └── App.tsx                # Router + layout
│   └── vite.config.ts
├── docs/prd/                      # Drop PRDs here
├── Makefile                      # `make verify`
└── AGENTS.md                     # Agent workflow instructions
```

## Dependencies

**Backend:** `hono` only — SQLite is built into Bun.

**Frontend:** React 19, Vite, Tailwind CSS — minimal SPA.

Total backend bundle: **~25 KB** (minified).
