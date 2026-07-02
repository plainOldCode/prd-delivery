// src/db/client.ts — Bun:SQLite (built-in, zero extra deps)
import { SQL } from 'bun';

const dbPath = process.env.DB_PATH ?? 'data.db';
const db = new SQL('sqlite://' + dbPath);

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
}

export default db;