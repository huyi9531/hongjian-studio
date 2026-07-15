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
  CREATE TABLE IF NOT EXISTS work_images (id TEXT PRIMARY KEY, work_id TEXT NOT NULL, page_index INTEGER NOT NULL, source_url TEXT, archive_path TEXT, status TEXT NOT NULL DEFAULT 'pending', error TEXT, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, UNIQUE(work_id, page_index));
  CREATE TABLE IF NOT EXISTS work_references (id TEXT PRIMARY KEY, work_id TEXT NOT NULL, filename TEXT NOT NULL, mime_type TEXT NOT NULL, archive_path TEXT NOT NULL, created_at INTEGER NOT NULL);
  CREATE TABLE IF NOT EXISTS publications (id TEXT PRIMARY KEY, work_id TEXT NOT NULL, fingerprint TEXT NOT NULL, h5_url TEXT NOT NULL, qr_code TEXT NOT NULL, transfer_to_oss INTEGER NOT NULL, service_fee TEXT, currency TEXT, transaction_id TEXT, created_at INTEGER NOT NULL, UNIQUE(work_id, fingerprint));
  CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
`)

export const db = drizzle(sqlite, { schema })
