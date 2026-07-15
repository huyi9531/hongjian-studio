import { integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'

export const works = sqliteTable('works', {
  id: text('id').primaryKey(),
  topic: text('topic').notNull(),
  outlineRaw: text('outline_raw').notNull().default(''),
  outlinePages: text('outline_pages', { mode: 'json' }).notNull().$type<Array<{ index: number; type: 'cover' | 'content' | 'summary'; content: string }>>().default([]),
  titles: text('titles', { mode: 'json' }).notNull().$type<string[]>().default([]),
  selectedTitle: text('selected_title').notNull().default(''),
  copywriting: text('copywriting').notNull().default(''),
  tags: text('tags', { mode: 'json' }).notNull().$type<string[]>().default([]),
  status: text('status').notNull().default('draft'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
})

export const workImages = sqliteTable('work_images', {
  id: text('id').primaryKey(),
  workId: text('work_id').notNull().references(() => works.id, { onDelete: 'cascade' }),
  pageIndex: integer('page_index').notNull(),
  sourceUrl: text('source_url'),
  archivePath: text('archive_path'),
  status: text('status').notNull().default('pending'),
  error: text('error'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
}, table => [uniqueIndex('work_images_work_page').on(table.workId, table.pageIndex)])

export const workReferences = sqliteTable('work_references', {
  id: text('id').primaryKey(),
  workId: text('work_id').notNull().references(() => works.id, { onDelete: 'cascade' }),
  filename: text('filename').notNull(),
  mimeType: text('mime_type').notNull(),
  archivePath: text('archive_path').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
})

export const publications = sqliteTable('publications', {
  id: text('id').primaryKey(),
  workId: text('work_id').notNull().references(() => works.id, { onDelete: 'cascade' }),
  fingerprint: text('fingerprint').notNull(),
  h5Url: text('h5_url').notNull(),
  qrCode: text('qr_code').notNull(),
  transferToOss: integer('transfer_to_oss', { mode: 'boolean' }).notNull(),
  serviceFee: text('service_fee'),
  currency: text('currency'),
  transactionId: text('transaction_id'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
}, table => [uniqueIndex('publication_fingerprint').on(table.workId, table.fingerprint)])

export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value', { mode: 'json' }).notNull(),
})
