# PRD Delivery Backend - Hono Scaffold

## Background
Existing Kotlin/Spring Boot backend → migrate to **Hono + Bun + Drizzle ORM**.
Target DB: MariaDB (MySQL compatible). Keep same API contract: `/api/health`, `/api/tasks` CRUD.

## Tech Stack Decision
- **Runtime**: Bun (faster dev cycle)
- **Framework**: Hono (lightweight, edge-compatible routing)
- **ORM**: Drizzle ORM (TypeScript-native, migrations built-in)
- **Validation**: Zod (schema-first request/response validation)
- **Test**: Vitest + Playwright (existing E2E)
- **DB**: MariaDB via mysql2

## Structure
```
backend/
├── progress.md          ← State file (this loop reads it)
├── package.json         ← Bun packages
├── tsconfig.json        ← TypeScript config
├── drizzle.config.ts    ← Drizzle setup
├── docker-compose.yml   ← MariaDB container
├── Dockerfile           ← Bun production image
├── src/
│   ├── index.ts         ← Hono app entry
│   ├── routes/          ← Route handlers
│   ├── db/              ← Connection + Migrations config
│   └── services/        ← Business logic (from spec)
├── migrations/          ← Drizzle auto-generated SQL
├── tests/               ← Vitest unit tests
└── artifacts/           ← Build outputs
```
