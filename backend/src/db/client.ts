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

  await db`CREATE TABLE IF NOT EXISTS users (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    username       TEXT UNIQUE NOT NULL COLLATE NOCASE,
    password_hash  TEXT NOT NULL,
    created_at     TEXT NOT NULL DEFAULT (datetime('now'))
  )`;
}

// Auto-init on import so tests don't need to call initDb() manually
initDb();

export default db;
