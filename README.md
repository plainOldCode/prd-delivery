# PRD Delivery Backend + Frontend

Lightweight **Hono (Bun)** backend / **React (Vite)** frontend — originally migrated from Kotlin/Spring Boot. SQLite 기반 CRUD API + SPA 프론트엔드.

## Stack

| Layer | Choice | Why |
|---|---|---|
| Runtime | [Bun](https://bun.sh) | Fast start, built-in SQLite, fetch, test runner |
| Backend | [Hono](https://hono.dev) | 24.9KB bundle, lightweight, multi-runtime support |
| Database | Bun:SQLite (built-in) | Zero extra deps, file-based, no server needed |
| Frontend | React 19 + Vite 6 + Tailwind CSS 4 | Light SPA, hot reload, AI-friendly patterns |
| Testing | Vitest v4 | Same runtime as Bun, API smoke tests built-in |

## Quick Start

### Backend

```bash
cd backend
bun install
bun run dev        # localhost:3001 (or set PORT)
bun run build      # → dist/index.js (25KB)
bun run test       # Vitest API smoke tests
```

### Frontend

```bash
cd frontend
bun install
bun run dev        # localhost:5173, proxies /api → :3001
bun run build      # → dist/ (production)
```

## API Endpoints

| Method | Path | Description |
|---|---|---|
| `GET`  | `/`              | Service info (version, status) |
| `GET`  | `/api/health`    | Health check |
| `GET`  | `/api/tasks`     | List all tasks |
| `GET`  | `/api/tasks/:id` | Get single task |
| `POST` | `/api/tasks`     | Create task (201) |
| `PUT`  | `/api/tasks/:id` | Update task |
| `DELETE` | `/api/tasks/:id` | Delete task |

### Example: Create a Task

```bash
curl -X POST http://localhost:3001/api/tasks \
  -H 'Content-Type: application/json' \
  -d '{"title": "PRD Review", "customer_request": "Design meeting"}'
```

## Project Structure

```
├── backend/
│   ├── src/
│   │   ├── db/client.ts          # Bun:SQLite (init + connection)
│   │   ├── routes/tasks.ts       # CRUD endpoints
│   │   ├── routes/health.ts      # Health check
│   │   └── __tests__/            # Vitest API smoke tests
│   ├── Dockerfile
│   ├── docker-compose.yml        # (legacy — optional)
│   └── vitest.config.ts
├── frontend/
│   ├── src/
│   │   ├── pages/                # HomePage, TasksPage
│   │   ├── lib/api.ts            # API client
│   │   └── App.tsx               # Router + layout
│   └── vite.config.ts
└── progress.md                   # Migration roadmap (completed)
```

## Dependencies

**Backend:** `hono` only — SQLite가 Bun에 내장되어 별도 설치 불필요.

**Frontend:** React 19, Vite, Tailwind CSS — 경량 SPA 구성.

Total backend bundle: **~25KB** (minified).
