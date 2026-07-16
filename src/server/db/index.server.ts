import '@tanstack/react-start/server-only'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { env } from '../env.server'
import * as schema from './schema'

const databasePath = resolve(env.DATABASE_URL.replace(/^file:/, ''))
mkdirSync(dirname(databasePath), { recursive: true })
const sqlite = new Database(databasePath)
sqlite.pragma('journal_mode = WAL')
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS works (id TEXT PRIMARY KEY, topic TEXT NOT NULL, outline_raw TEXT NOT NULL DEFAULT '', outline_pages TEXT NOT NULL DEFAULT '[]', titles TEXT NOT NULL DEFAULT '[]', selected_title TEXT NOT NULL DEFAULT '', copywriting TEXT NOT NULL DEFAULT '', tags TEXT NOT NULL DEFAULT '[]', status TEXT NOT NULL DEFAULT 'draft', created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL);
  CREATE TABLE IF NOT EXISTS work_images (id TEXT PRIMARY KEY, work_id TEXT NOT NULL, page_index INTEGER NOT NULL, source_url TEXT, archive_path TEXT, status TEXT NOT NULL DEFAULT 'pending', error TEXT, input_fingerprint TEXT, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, UNIQUE(work_id, page_index));
  CREATE TABLE IF NOT EXISTS work_references (id TEXT PRIMARY KEY, work_id TEXT NOT NULL, filename TEXT NOT NULL, mime_type TEXT NOT NULL, archive_path TEXT NOT NULL, created_at INTEGER NOT NULL);
  CREATE TABLE IF NOT EXISTS publications (id TEXT PRIMARY KEY, work_id TEXT NOT NULL, fingerprint TEXT NOT NULL, h5_url TEXT NOT NULL, qr_code TEXT NOT NULL, transfer_to_oss INTEGER NOT NULL, service_fee TEXT, currency TEXT, transaction_id TEXT, created_at INTEGER NOT NULL, UNIQUE(work_id, fingerprint));
  CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS schema_migrations (id TEXT PRIMARY KEY, applied_at INTEGER NOT NULL);
`)

const appliedMigrations = new Set((sqlite.prepare('SELECT id FROM schema_migrations').all() as Array<{ id: string }>).map(row => row.id))
if (!appliedMigrations.has('20260716_generation_jobs')) {
  sqlite.transaction(() => {
    const columns = sqlite.prepare('PRAGMA table_info(work_images)').all() as Array<{ name: string }>
    if (!columns.some(column => column.name === 'input_fingerprint')) sqlite.exec('ALTER TABLE work_images ADD COLUMN input_fingerprint TEXT')
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS generation_jobs (
        id TEXT PRIMARY KEY,
        work_id TEXT NOT NULL UNIQUE,
        input_fingerprint TEXT NOT NULL,
        model TEXT NOT NULL,
        size TEXT NOT NULL,
        prompt_mode TEXT NOT NULL,
        status TEXT NOT NULL,
        completed_pages INTEGER NOT NULL DEFAULT 0,
        failed_pages INTEGER NOT NULL DEFAULT 0,
        error TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
      INSERT INTO schema_migrations (id, applied_at) VALUES ('20260716_generation_jobs', ${Date.now()});
    `)
  })()
}
sqlite.prepare("UPDATE generation_jobs SET status = 'interrupted', updated_at = ? WHERE status = 'running'").run(Date.now())

export const db = drizzle(sqlite, { schema })
