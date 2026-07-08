// src/db/client.ts — Bun:SQLite (built-in, zero extra deps)
import { SQL } from 'bun';

const url = process.env.DATABASE_URL ?? process.env.DB_PATH ?? 'data.db';
let connectionString: string;
if (url.startsWith('file://') || url === 'file::memory:') {
  connectionString = url;
} else {
  connectionString = 'sqlite://' + url;
}
const db = new SQL(connectionString);

export async function initDb() {
  // Core table for sample tasks (legacy)
  await db`CREATE TABLE IF NOT EXISTS sample_task (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    title          TEXT NOT NULL,
    status         TEXT NOT NULL DEFAULT 'backlog',
    created_at     TEXT NOT NULL DEFAULT (datetime('now')),
    customer_request  TEXT,
    requested_work    TEXT,
    target_delivery_date TEXT,
    build_estimate    TEXT,
    owner_name      TEXT
        )`;

  // Refined Benchmark tables following GPT-5.5's high-precision feedback
  await db`CREATE TABLE IF NOT EXISTS bench_runs (
    id               INTEGER PRIMARY KEY AUTO-INCREMENT,
    model_name       TEXT NOT NULL,
    engine_type      TEXT,           -- e.g., 'ollama', 'mlx'
    hardware_info    TEXT,           -- hardware details for reproducibility
    prefill_tps      REAL,           -- Prompt throughput (tokens/s) - Nullable for precision handling
    decode_tps       REAL,           -- Generation throughput (tokens/s)
    prompt_eval_ms   REAL,           -- Engine-level prefill latency in ms
    retention_pct    REAL DEFAULT 0, -- Percentage of retained context
    accuracy_pct     REAL DEFAULT 0, -- Accuracy score percentage
    engine_version   TEXT,          -- Specific version for reproducibility
    created_at       TEXT NOT NULL DEFAULT (datetime('now'))
    )`;

  await db`CREATE TABLE IF NOT EXISTS bench_tests (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id      INTEGER NOT NULL REFERENCES bench_runs(id),
    category    TEXT NOT NULL,      -- 'speed', 'retention', 'accuracy'
    name        TEXT NOT NULL,
    passed      INTEGER NOT NULL DEFAULT 0,
    details     TEXT,                -- JSON string including full engine metadata (spec-aligned)
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    )`;
}

// Auto-init on import so tests don't need to call initDb() manually
initDb();

export default db;
