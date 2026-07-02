---
title: "Feature Name"
status: "draft" | "implemented" | "deprecated"
created: YYYY-MM-DD
---

# Feature Name

## Overview
- **What**: 1-2 sentence description of what this feature does
- **Why**: Why this feature exists, who benefits

## User Stories
- As a [role], I want to [action] so that [benefit]
- Multiple stories allowed

## Database Schema
```sql
-- New tables or migrations needed
CREATE TABLE IF NOT EXISTS table_name (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    -- columns...
);
```

## API Endpoints
| Method | Path | Description | Request Body | Response |
|--------|------|-------------|-------------|----------|
| GET | `/api/resource` | List all | — | `200 { data: Resource[] }` |
| POST | `/api/resource` | Create | `{ field: string }` | `201 { id, ... }` |

## Frontend Pages
- [PageName](../frontend/src/pages/) — Brief description
- Components needed, routing structure

## Acceptance Criteria
- [ ] All API endpoints return correct status codes
- [ ] Frontend renders without errors
- [ ] Tests pass (`bun run test`)
- [ ] Build passes (`make verify`)

## Test Requirements
- At minimum: one test file per route module
- Assert critical path only (status code + response shape)
- Use in-memory SQLite (`file::memory:`) for isolation
