|# Backend Scaffold Progress - Hono + Bun + Drizzle

**Target:** Kotlin/Spring Boot backend → Hono+Bun+Drizzle 마이그레이션
**Loop:** Cron every 10m, Agent reads this file and processes first `start`-less step

| Step | Description | Status | Notes |
|:----:|:------------|:-------|:------|
| S01 | Bun 프로젝트 초기화 (package.json, tsconfig.json) | end | package.json + deps installed |
| S02 | Hono 설치 및 진입점 설정 | end | src/index.ts with Bun serve entry |
| S03 | Drizzle ORM + database 연결 설정 | end | drizzle-orm@latest + mysql2 pool, `bun run build` ✅ |
| S04 | Task 엔티티 스키마 정의 (MariaDB MySQL dialect) | end | src/db/schemas.ts created |
| S05 | /api/health GET 라우트 구현 | end | Hono healthRoutes → 29 modules → dist/index.js ✅ |
| S06 | /api/tasks CRUD 라우т實現 | end | GET/POST/PUT/DELETE on /api/tasks + Zod validation |
| S07 | Zod 유효성 검사 미들웨어 추가 | end | health check test passes: `bun run test` ✅ |
| S08 | Unit tests: vitest setup + sample_task mocks | end | healthRoutes.mount() test ✅ (status 200, body ok) |
| S09 | docker-compose.yml (MariaDB) 작성 | end | mariaDB:11.4, healthcheck + persistent volume ✅ |
| S10 | Dockerfile (Bun multi-stage) 작성 | end | 3-stage build, .dockerignore ✅ |
