---
title: "Task Management"
status: "implemented"
created: 2025-07-01
---

# Task Management

## Overview
- **What**: A simple task (todo) management system with CRUD operations
- **Why**: Users can create, view, update, and delete tasks — the baseline feature that proves our PRD→CODE pipeline works end-to-end

## User Stories
- As a user, I want to see a list of tasks so that I know what I need to do
- As a user, I want to mark tasks as complete so that I can track progress
- As a user, I want to delete old tasks so that my list stays clean

## Database Schema
```sql
CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    completed INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## API Endpoints
| Method | Path | Description | Request Body | Response |
|--------|------|-------------|-------------|----------|
| POST | `/tasks` | Create task | `{ title: string, description?: string }` | `201 { id, title, ... }` |
| GET | `/tasks` | List all tasks | — | `200 { tasks: Task[] }` |
| GET | `/tasks/:id` | Get single task | — | `200 Task \| 404 {}` |
| PATCH | `/tasks/:id` | Update task | `{ title?, description?, completed? }` | `200 Task` |
| DELETE | `/tasks/:id` | Delete task | — | `204` |

## Frontend Pages
- **HomePage** — Hero section + links to features
- **TasksPage** — Task table with create form, edit/delete actions
  - Route: `/tasks` (via react-router-dom)
  - API hooks: `lib/api.ts` for task CRUD

## Acceptance Criteria
- [x] All API endpoints return correct status codes
- [x] Frontend renders without errors
- [x] Tests pass (`bun run test`)
- [x] Build passes (`make verify`)

## Test Requirements
- `api.test.ts` — Full CRUD cycle via `app.request()`
- Assert: POST returns 201, GET returns tasks array, PATCH updates record, DELETE removes it
- In-memory SQLite: no persistent state between tests
