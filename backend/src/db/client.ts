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
		id              INTEGER PRIMARY KEY AUTOINCREMENT,
		title           TEXT NOT NULL,
		status          TEXT NOT NULL DEFAULT 'backlog',
		created_at      TEXT NOT NULL DEFAULT (datetime('now')),
		customer_request  TEXT,
		requested_work    TEXT,
		target_delivery_date TEXT,
		build_estimate    TEXT,
		owner_name      TEXT
	)`;

   // Refined Benchmark tables following GPT-5.5's high-precision feedback
	await db`CREATE TABLE IF NOT EXISTS bench_runs (
		id               INTEGER PRIMARY KEY AUTOINCREMENT,
		model_name       TEXT NOT NULL,
		runtime          TEXT,
		hardware         TEXT,
		speed_prompt_tps REAL,
		speed_gen_tps    REAL,
		speed_ttft_ms    REAL,
		retention_pct    REAL DEFAULT 0,
		accuracy_pct     REAL DEFAULT 0,
		engine_version   TEXT,
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

// Indexes
export async function ensureIndexes() {
	await db`CREATE INDEX IF NOT EXISTS idx_bench_model ON bench_runs(model_name)`;
	await db`CREATE INDEX IF NOT EXISTS idx_bench_created ON bench_runs(created_at DESC)`;
	await db`CREATE INDEX IF NOT EXISTS idx_bench_tests_run ON bench_tests(run_id)`;
}

// Auto-init on import so tests don't need to call initDb() manually
await initDb();
await ensureIndexes();

export default db;
