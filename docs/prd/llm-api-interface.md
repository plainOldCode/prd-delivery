---
title: "LLM-Centric Benchmark API Interface"
status: "draft"
created: 2026-07-06
depends_on: ["llm-bench"]
---

# LLM-Centric Benchmark API Interface

## Overview
- **What**: 현재 GUI 중심의 벤치마크 도구를 LLM-agent가 직접 programmable하게 사용할 수 있는 JSON API 인터페이스로 개편. SOTA API (Claude, GPT)와 작은 SLM 모두 동일한 엔드포인트를 호출하여 벤치를 실행하고 결과를 해석할 수 있음.
- **Why**: 현재 프로젝트는 사람이 웹 대시보드에서 클릭해야 해서 LLM-agent가 autonomous하게 모델 평가·비교하는Workflow에 포함되지 못함. API-first로 개편하여 AI-agent가 "어떤 모델을 써야 할지" bench 결과를 바탕으로 decide하게 함.

## Design Principles

| Principle | Description |
|-----------|-------------|
| **JSON In/Out** | 모든 endpoint는 structured JSON만 주고받음 (HTML 응답 없음) |
| **Prompt-Ready Output** | API 응답은 LLM이 그대로 prompt에 embed하기 좋은 형식 (compact, token-efficient) |
| **Agent-Actionable** | 추천 모델 선택 시 `GET /api/bench/recommend`가 JSON 객체로 반환 (추론용) |
| **Backward Compatible** | 기존 REST API는 유지하되 agent-oriented wrappers 추가 |

## User Stories (Agent-Centric)

- As an AI agent orchestrator, I want to call a benchmark API programmatically so that I can evaluate which model to delegate a task to.
- As a small local SLM, I want compact JSON responses so that I don't blow my context window reading results.
- As a benchmark pipeline, I want batch endpoints so that I can compare 5+ models in one call.

## API Endpoints (New)

### Benchmark Execution

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/bench/run` | 벤치 실행 (기존 유지, SSE + JSON fallback) |
| `POST` | `/api/bench/run/compact` | **Compact mode** — bench 돌되 요약만 JSON 반환 (SLM용) |
| `GET`  | `/api/bench/history` | 결과 목록 (기존 유지) |
| `GET`  | `/api/bench/recent?limit=N` | **Recent runs only** — agent용 compact list |
| `POST` | `/api/bench/compare` | **Batch compare** — 여러 run ID를 받아 비교 테이블 JSON 반환 |

### Agent Recommendations

| Method | Path | Description |
|--------|------|-------------|
| `GET`  | `/api/bench/recommend?task={coding/math/reasoning}` | **Task-based model recommendation** — bench 결과 기반 추천 모델 |
| `POST` | `/api/bench/score` | **Composite score** — weights (speed/retention/accuracy)를 받아 가중 점수 계산 |

### Model Discovery

| Method | Path | Description |
|--------|------|-------------|
| `GET`  | `/api/models` | 모델 목록 (기존 유지) |
| `GET`  | `/api/models/suitable?min_context=N` | **Suitable models** — 최소 컨텍스트 기준 필터링 |

### Response Formats

#### Compact Mode (`POST /bench/run/compact`)

Request:
```json
{
  "model": "llama3.2:1b",
  "mode": "speed|full"
}
```

Response (JSON, not SSE):
```json
{
  "runId": 42,
  "model": "llama3.2:1b",
  "score": {
    "speed": {"gen_tps": 12.8, "ttft_ms": 140},
    "retention": 85,
    "accuracy": 70,
    "composite": 78.3
  },
  "recommendation": "suitable_for: reasoning tasks under 4k context"
}
```

#### Recommendation (`GET /bench/recommend`)

Request query params: `task=coding|math|reasoning`, `max_cost=low|medium|high`

Response:
```json
{
  "recommended": [
    {"model": "qwen2:7b", "score": 85, "reason": "best accuracy/retention trade-off"},
    {"model": "llama3.2:1b", "score": 70, "reason": "fastest for small context"}
  ],
  "based_on": 5
}
```

## Database Changes
No schema changes required — 기존 `bench_runs`, `bench_tests` 테이블을 그대로 사용.

### New Indexes (for query performance)
```sql
CREATE INDEX IF NOT EXISTS idx_bench_model ON bench_runs(model_name);
CREATE INDEX IF NOT EXISTS idx_bench_created ON bench_runs(created_at DESC);
```

## Frontend Changes
GUI 대시보드는 유지하되 **agent API를 우선으로 재구성**:
- `/bench` — 기존 UI 유지 (backward compat)
- 프론트엔드 빌드가 API endpoint에 영향주지 않도록 분리

## Backend Structure (New)

```
backend/src/
├── routes/
│   ├── bench.ts          # 기존 엔드포인트 유지
│   └── bench-agent.ts    # ✨ Agent-oriented wrappers (compact, recommend, compare)
├── services/
│   ├── bench.ts         # 기존 bench runner 유지
│   └── advisor.ts       # ✨ Recommendation engine (rule-based scoring)
```

## Acceptance Criteria

- [ ] `POST /api/bench/run/compact` — JSON-only 응답 (SSE 없이 요약만)
- [ ] `GET /api/bench/recommend?task=X` — bench 결과 기반 모델 추천 반환
- [ ] `POST /api/bench/compare` — 여러 run ID 받아 비교 테이블(JSON) 반환
- [ ] `POST /api/bench/score` — 가중치 기반 composite score 계산
- [ ] Backend tests for new endpoints (in-memory SQLite)
- [ ] E2E 테스트: agent flow (JSON API → bench → recommendation) 
- [ ] 기존 GUI backward compatible 유지
- [ ] `make verify` + `make e2e` 통과

## Test Requirements

- **Compact mode**: stub 모델로 compact JSON 반환 테스트
- **Recommendation engine**: mock bench data 3개 이상으로 추천 로직 검증
- **Compare endpoint**: 동시에 여러 run 비교 시 정렬/필터링 정확도 확인
- In-memory SQLite (`file::memory:`) 사용 — agent test는 mock mode에서 실행

## Out of Scope

- Live streaming SSE로 agent 응답 (compact JSON만 지원, SLMS context 효율)
- GUI 대시보드 기능 확장 (기존 유지하는 선에서만)
- Public leaderboard / multi-user
