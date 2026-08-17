import '@tanstack/react-start/server-only'
import { drizzle as createSqliteDrizzle } from 'drizzle-orm/better-sqlite3'
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import { drizzle as createD1Drizzle, type DrizzleD1Database } from 'drizzle-orm/d1'
import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { env } from '../env.server'
import * as schema from './schema'

async function createLocalDatabase() {
  // 动态导入：better-sqlite3 为原生模块，Cloudflare bundle 不得静态包含
  const { default: Database } = await import('better-sqlite3')
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
  if (!appliedMigrations.has('20260717_image_reliability')) {
    sqlite.transaction(() => {
      const columns = sqlite.prepare('PRAGMA table_info(work_images)').all() as Array<{ name: string }>
      const addColumn = (name: string, definition: string) => {
        if (!columns.some(column => column.name === name)) sqlite.exec(`ALTER TABLE work_images ADD COLUMN ${definition}`)
      }
      addColumn('archive_status', "archive_status TEXT NOT NULL DEFAULT 'unavailable'")
      addColumn('archive_error', 'archive_error TEXT')
      addColumn('archive_mime_type', 'archive_mime_type TEXT')
      addColumn('public_url_status', "public_url_status TEXT NOT NULL DEFAULT 'unknown'")
      addColumn('public_url_checked_at', 'public_url_checked_at INTEGER')
      sqlite.exec(`
        UPDATE work_images
        SET archive_status = CASE WHEN archive_path IS NULL THEN 'unavailable' ELSE 'archived' END;
        INSERT INTO schema_migrations (id, applied_at) VALUES ('20260717_image_reliability', ${Date.now()});
      `)
    })()
  }
  sqlite.prepare("UPDATE generation_jobs SET status = 'interrupted', updated_at = ? WHERE status = 'running'").run(Date.now())

  return createSqliteDrizzle(sqlite, { schema })
}

/** Cloudflare Workers 上通过 D1 binding 访问数据库，表结构由 wrangler d1 migrations 管理 */
async function createCloudflareDatabase() {
  const { env: cfEnv } = await import('cloudflare:workers')
  return createD1Drizzle(cfEnv.DB, { schema })
}

// 统一以 D1（异步）类型导出，服务代码全部 await；本地节点部署通过 cast 使用同步事务
// （better-sqlite3 原生事务要求同步回调，异步事务仅在 Cloudflare D1 上可用）
export const db = (env.PLATFORM === 'cloudflare' ? await createCloudflareDatabase() : await createLocalDatabase()) as unknown as DrizzleD1Database<typeof schema>

export type LocalDatabase = BetterSQLite3Database<typeof schema>
