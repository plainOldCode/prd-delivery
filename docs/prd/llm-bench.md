---
title: "LLM Benchmark Dashboard"
status: "draft"
created: 2026-07-03
---

# LLM Benchmark Dashboard

## Overview
- **What**: 웹 대시보드를 통해 로컬 LLM의 성능(속도, 컨텍스트 유지력, 정확도)을 측정·비교할 수 있는 벤치마킹 도구. LocalScore 호환 tok/s + TTFT 측정과 함께 needle-in-haystack 컨텍스트 테스트를 추가 제공하며, 결과 시각화/공유 기능을 포함함.
- **Why**: 로컬 LLM 커뮤니티는 속도는 측정하지만 컨텍스트 유지력(context retention)과 실제 메모리 사용량을 공개적으로 비교할 수단이 부족함. 이 도구는 브라우저에서 한 번의 클릭으로 벤치를 실행하고 결과를 공유할 수 있게 함.

## User Stories
- As a local LLM user, I want to run benchmarks on my models from a web dashboard so that I don't need CLI arguments or config files.
- As a researcher, I want to compare context retention across model sizes (1B–14B) so that I can pick the right model for my use case.
- As a community member, I want to share benchmark results via URL or submit them publicly so others can reference my hardware setup.

## Architecture

### Bench Runner (Backend)
- **Hono + Bun** 서버가 벤치 실행을 orchestrate함.
- 벤치는 HTTP API를 호출하여 모델(LLMs running via Ollama / llama.cpp / MLX 등)과 통신.

### Hardware Detection
- 첫 시작 또는 명시적 요청 시 시스템 하드웨어 정보를 자동 수집:
  - **Chip**: e.g. `Apple M2 Max`, `Intel Core i7-13700K`, `AMD Ryzen 9 7950X`
  - **CPU 코어**: physical / logical cores
  - **RAM**: total system memory (GB)
  - **GPU**: discrete + integrated GPU 모델명, VRAM
  - **SSD**: storage type (NVMe/SATA), available capacity
- macOS에서는 `sysctl`/`system_profiler`로, Linux에서는 `lscpu`/`free`/`lspci`로 감지
- 수집된 정보는 벤치 결과와 함께 저장되어 재현성(reproducibility)을 보장함.
- 측정 항목:
    1. **Speed**: prompt tok/s, generation tok/s, TTFT (LocalScore 호환)
    2. **Context Retention**: needle-in-haystack 테스트 (500/1k/4k 토큰 컨텍스트에 hidden needle 위치 변형)
    3. **Accuracy**: 정답-known QA 세트에 대해 규칙 기반 채점 (예: 숫자, 단어 추출 정확도)

### Dashboard (Frontend)
| Page | Route | Description |
|------|-------|-------------|
| Dashboard | `/` | 모델 선택 → 벤치 시작 버튼 → 실시간 결과 차트 |
| Results | `/results/:id` | 개별 벤치 결과 상세 보기 + compare |

- 모델 목록은 local Ollama/LLM endpoint에서 자동 discovery (예: `http://localhost:11434/api/tags`)
- 벤치 실행 시 realtime progress 바 + 토큰 속도 live 그래프
-完成后: 요약 테이블 (tok/s, TTFT, retention score, accuracy %)

## Database Schema
```sql
-- Benchmark execution records
CREATE TABLE IF NOT EXISTS bench_runs (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    model_name    TEXT NOT NULL,
    hardware      TEXT,              -- e.g. "M2 MAX, 32GB"
    runtime       TEXT,              -- e.g. "Ollama", "MLX", "llama.cpp"
    speed_prompt_tps REAL NOT NULL DEFAULT 0,
    speed_gen_tps    REAL NOT NULL DEFAULT 0,
    speed_ttft_ms    REAL NOT NULL DEFAULT 0,
    retention_pct    REAL NOT NULL DEFAULT 0,   -- needle-in-haystack pass rate
    accuracy_pct     REAL NOT NULL DEFAULT 0,   -- rule-based QA score
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Individual test runs within a bench session
CREATE TABLE IF NOT EXISTS bench_tests (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id        INTEGER NOT NULL REFERENCES bench_runs(id),
    category      TEXT NOT NULL,     -- 'speed' | 'retention' | 'accuracy'
    name          TEXT NOT NULL,
    passed        INTEGER NOT NULL,  -- 0 or 1
    details       TEXT,              -- JSON string with timing/context info
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
```

## API Endpoints

| Method | Path | Request Body | Response | Description |
|--------|------|-------------|----------|-------------|
| `GET`  | `/api/models` | — | `200 { models: ModelInfo[] }` | Available local models 목록 |
| `POST` | `/api/bench/run` | `{ model, tests[] }` | `200 { runId, progress… (SSE) }` | 벤치 실행 시작 (progress 스트림) |
| `GET`  | `/api/bench/results` | — | `200 { runs: BenchRun[] }` | 과거 결과 목록 |
| `GET`  | `/api/bench/:id` | — | `200 { run, tests: [] }` | 개별 결과 상세 |

## Frontend Pages
- **Dashboard** — 모델 드롭다운 + 벤치 시작 버튼. live progress 차트 (tok/s 라인).完成后 결과 요약 테이블.
- **Results Detail** — 개별 실행의 모든 테스트 결과 보기. compare 버튼으로 2개 이상 실행을 나란히 비교 가능.

## Acceptance Criteria
- [ ] Local LLM models가 자동으로 discovery됨 (Ollama/MLX endpoint)
- [ ] Speed 토큰 메트릭이 LocalScore 공식 테스트 세가와 동일한 spec으로 측정됨
- [ ] Needle-in-haystack 컨텍스트 테스트: 500/1k/4k 토큰에서 >=3 위치(test/beginning/middle/end) 검증
- [ ] Accuracy QA 세트 최소 10문제 규칙 기반 채점 자동화
- [ ] 벤치 결과를 SQLite에 저장하고 대시보드에서 시각화
- [ ] `make verify` 통과 (build + test)

## Test Requirements
- **Backend**: `/api/models` GET 테스트 (모델 리스트 반환), `/api/bench/run` POST 테스트 (stub model로 mock 실행)
- In-memory SQLite 사용 (`file::memory:`)
- Bench runner는 실제 모델 없어도 stub 응답으로 테스트 가능하도록 abstract layer 구성

## Out of Scope (Phase 1 제외)
- Multi-user auth — 단일 사용자 local tool이므로 AuthContext 생략 권장. `v0.0.1`의 auth 코드는 유지하되 이 프로젝트에서 사용하지 않음.
- Public leaderboard — 향후 확장 사항. Phase 1은 local-first.
- Vision/audio 모델 벤치 — 텍스트 모델만 대상
