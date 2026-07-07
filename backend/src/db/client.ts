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

 // Benchmark tables — LLM Bench Dashboard
  await db`CREATE TABLE IF NOT EXISTS bench_runs (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    model_name       TEXT NOT NULL,
    hardware         TEXT,
    runtime          TEXT,
    speed_prompt_tps REAL NOT NULL DEFAULT 0,
    speed_gen_tps    REAL NOT NULL DEFAULT 0,
    speed_ttft_ms    REAL NOT NULL DEFAULT 0,
    retention_pct    REAL NOT NULL DEFAULT 0,
    accuracy_pct     REAL NOT NULL DEFAULT 0,
    created_at       TEXT NOT NULL DEFAULT (datetime('now'))
    )`;

  await db`CREATE TABLE IF NOT EXISTS bench_tests (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id      INTEGER NOT NULL REFERENCES bench_runs(id),
    category    TEXT NOT NULL,
    name        TEXT NOT NULL,
    passed      INTEGER NOT NULL DEFAULT 0,
    details     TEXT,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    )`;
}

// Auto-init on import so tests don't need to call initDb() manually
initDb();

export default db;
