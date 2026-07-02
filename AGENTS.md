# AGENTS.md — PRD-Driven Delivery (Lightweight Agent Scaffold)

PRD 를 `docs/prd/` 에 두면 agent 가 backend / frontend / e2e-test 까지 구현하는 docs-first 워크플로우입니다.

## 스택

| 레이어 | 선택 |
|--------|------|
| Backend | Hono + Bun (TypeScript) |
| Frontend | React 19 + Vite + Tailwind CSS v4 |
| DB | SQLite (`bun:sqlite`) — prepared statements 로 SQL injection 방어 |
| E2E Test | Vitest API smoke test + browser mode (Chromium headless) |
| CI | GitHub Actions (push / PR on `main`) |

## 스택 제약 (Violating this is an error)

1. **ORM 사용 금지** — `bun:sqlite` prepared statements 를 직접 사용하거나, 정말 가볍게는 `better-sqlite3`. Drizzle 이나 Prisma 는太重합니다.
2. **Next.js/LNPM 사용 금지** — 백엔드와 중복되는 라우팅 시스템은 배제됩니다.
3. **Docker/Kubernetes 의존성 제거** — 로컬 개발 + CI 기반検証으로 충분합니다.

## 디렉토리 구조

```
docs/           ← PRD / Spec 이 들어가는 곳
backend/        ← Hono + Bun (src/, __tests__/, vite.config.ts)
frontend/       ← React + Vite (src/, vite.config.ts)
```

## Workflow: PRD → CODE

1. **PRD 작성** — `docs/prd/<feature>.md` 에 기능 명세를 Markdown 으로 작성합니다.
2. **구현 순서** — agent 가 아래 순서대로 구현합니다.
   1. DB schema (SQLite table migration)
   2. Backend routes + tests (`backend/src/routes/`, `backend/src/__tests__/`)
   3. Frontend pages + API hooks (`frontend/src/pages/`, `frontend/src/lib/api.ts`)
   4. E2E smoke test (`backend/src/__tests__/e2e-*.ts`)
3. **검증** — `make verify` 또는 아래 커맨드 수동 실행

## Local LLM Loop 구성

Agent 는 Ollama / MLX 모델을 loop 로 돌며 PRD 를 code 로 변환합니다. 각 단계는 **자기 검증(self-check)** 필수:

```bash
# 1. Backend 타입 체크 + 빌드 + 테스트
cd backend && bun run build && bun run test

# 2. Frontend 타입 체크 + 빌드
cd frontend && tsc --noEmit && vite build

# 3. Integration (전체)
make verify
```

### Loop 전략 (중요 — Reasoning Loop 회피 필수)

| Model | 설정 |
|---|---|
| Qwen3 | `temperature 0.6-0.7`, `repeat_penalty 1.15` |
| Gemma4 | `temperature 1.0`, `top_k 40`, `--jinja` |

**절대로** `repeat_penalty` + `frequency_penalty` 를 겹치게 하지 마세요.

### PRD 기반 코드 생성 순서

Agent 가 PRD를 읽고 code 를 작성할 때:

1. **Schema first** — SQLite 테이블/컬럼을 먼저 설계하고 검증
2. **API layer** — route 정의 → test 작성 → 즉시 `bun run test` 로 pass 확인
3. **Frontend layer** — page 컴포넌트 → api.ts hook → 빌드 검증
4. **모듈 분리 의무** — 1 feature = 1 routes file + 1 test file

### 코드 스타일

- TypeScript strict mode
- Tailwind CSS (utility-first)
- KISS/DRY: 테스트는 최소한으로, 핵심 흐름만 assert
- 불필요한 boilerplate 제거

## Common Commands

```bash
# Backend
cd backend && bun run build      # Bundled ~25KB
cd backend && bun run test        # Vitest smoke tests

# Frontend
cd frontend && tsc --noEmit      # Type check only
cd frontend && vite build        # Production build

# All at once
make verify                      # Backend + Frontend 빌드 + 테스트 (Makefile 에 정의)
```

## Goal

PRD -> CODE -> TEST 흐름이 agent 가 자율적으로 완주하도록 유지하세요. 불필요한 도구 없이 가장 가벼운 스택으로 전달합니다.
