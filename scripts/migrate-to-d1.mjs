// 本地 SQLite 数据迁移到 Cloudflare D1：图片上传 R2 换取长期公网链接，作品与设置写入 D1。
// 用法：node scripts/migrate-to-d1.mjs
// 说明：生成临时 SQL 文件（含模型密钥），执行后立即删除；不要提交该文件。
import { createHash, createHmac, randomUUID } from 'node:crypto'
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { join } from 'node:path'
import Database from 'better-sqlite3'

const DB_PATH = 'data/hongjian.db'
const SQL_PATH = join(process.cwd(), '.tmp-migrate.sql')

function parseEnvFile(path) {
  const result = {}
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq <= 0) continue
    const key = trimmed.slice(0, eq).trim()
    const value = trimmed.slice(eq + 1).trim()
    if (key && value) result[key] = value
  }
  return result
}

const env = parseEnvFile('.env.local')
const R2 = {
  accessKey: env.R2_ACCESS_KEY_ID,
  secret: env.R2_SECRET_ACCESS_KEY,
  endpoint: env.R2_ENDPOINT,
  bucket: env.R2_BUCKET_NAME,
  publicUrl: env.R2_PUBLIC_URL,
}
if (!R2.accessKey || !R2.secret || !R2.endpoint || !R2.bucket || !R2.publicUrl) {
  console.error('缺少 R2 配置（R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY / R2_ENDPOINT / R2_BUCKET_NAME / R2_PUBLIC_URL），请先设置环境变量')
  process.exit(1)
}

function archiveMime(path) {
  if (path.toLowerCase().endsWith('.jpg') || path.toLowerCase().endsWith('.jpeg')) return 'image/jpeg'
  if (path.toLowerCase().endsWith('.webp')) return 'image/webp'
  return 'image/png'
}

async function uploadToR2(key, body, contentType) {
  const host = new URL(R2.endpoint).host
  const now = new Date()
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '')
  const dateStamp = amzDate.slice(0, 8)
  const payloadHash = createHash('sha256').update(body).digest('hex')
  const canonicalUri = `/${R2.bucket}/${key.split('/').map(s => encodeURIComponent(s)).join('/')}`
  const canonicalHeaders = `content-type:${contentType}\nhost:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`
  const signedHeaders = 'content-type;host;x-amz-content-sha256;x-amz-date'
  const canonicalRequest = `PUT\n${canonicalUri}\n\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`
  const scope = `${dateStamp}/auto/s3/aws4_request`
  const stringToSign = `AWS4-HMAC-SHA256\n${amzDate}\n${scope}\n${createHash('sha256').update(canonicalRequest).digest('hex')}`
  const kDate = createHmac('sha256', `AWS4${R2.secret}`).update(dateStamp).digest()
  const kRegion = createHmac('sha256', kDate).update('auto').digest()
  const kService = createHmac('sha256', kRegion).update('s3').digest()
  const kSigning = createHmac('sha256', kService).update('aws4_request').digest()
  const signature = createHmac('sha256', kSigning).update(stringToSign).digest('hex')
  const authorization = `AWS4-HMAC-SHA256 Credential=${R2.accessKey}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`
  const url = `https://${host}/${R2.bucket}/${key.split('/').map(s => encodeURIComponent(s)).join('/')}`
  const response = await fetch(url, {
    method: 'PUT',
    headers: { Authorization: authorization, 'Content-Type': contentType, 'X-Amz-Content-Sha256': payloadHash, 'X-Amz-Date': amzDate },
    body: new Uint8Array(body),
  })
  if (!response.ok) throw new Error(`R2 上传失败 ${response.status}: ${(await response.text()).slice(0, 200)}`)
  return `${R2.publicUrl.replace(/\/+$/, '')}/${key}`
}

function escapeSql(value) {
  if (value === null || value === undefined) return 'NULL'
  return `'${String(value).replace(/'/g, "''")}'`
}

const sqlite = new Database(DB_PATH, { readonly: true })
const lines = []

// works
const works = sqlite.prepare('SELECT * FROM works').all()
for (const work of works) {
  lines.push(`INSERT INTO works (id, topic, outline_raw, outline_pages, titles, selected_title, copywriting, tags, status, created_at, updated_at) VALUES (${[work.id, work.topic, work.outline_raw, work.outline_pages, work.titles, work.selected_title, work.copywriting, work.tags, work.status, work.created_at, work.updated_at].map(escapeSql).join(', ')});`)
}

// work_images：图片上传 R2，archive_path 置空（线上无本地归档），public_url_status 标记可用
// 仅迁移仍存在于 works 表中的图片（跳过已删除作品的孤儿记录）
const workIds = new Set(works.map(work => work.id))
const images = sqlite.prepare('SELECT * FROM work_images').all()
for (const image of images) {
  if (!workIds.has(image.work_id)) {
    console.warn(`跳过孤儿图片记录：${image.work_id}/${image.page_index}（作品已删除）`)
    continue
  }
  const archiveFile = join(process.cwd(), 'data', image.archive_path)
  const body = readFileSync(archiveFile)
  const mime = image.archive_mime_type ?? archiveMime(image.archive_path)
  const extension = mime === 'image/jpeg' ? 'jpg' : mime === 'image/webp' ? 'webp' : 'png'
  const key = `temporary_365/redink/${image.work_id}/${image.page_index}-${randomUUID()}.${extension}`
  const sourceUrl = await uploadToR2(key, body, mime)
  console.log(`上传图片 ${image.work_id}/${image.page_index} -> ${sourceUrl}`)
  lines.push(`INSERT INTO work_images (id, work_id, page_index, source_url, archive_path, status, error, input_fingerprint, archive_status, archive_error, archive_mime_type, public_url_status, public_url_checked_at, created_at, updated_at) VALUES (${[image.id, image.work_id, image.page_index, sourceUrl, null, image.status, null, image.input_fingerprint, 'unavailable', null, mime, 'available', null, image.created_at, image.updated_at].map(escapeSql).join(', ')});`)
}

// settings（含模型密钥）
const settings = sqlite.prepare('SELECT * FROM settings').all()
for (const setting of settings) {
  lines.push(`INSERT INTO settings (key, value) VALUES (${[setting.key, setting.value].map(escapeSql).join(', ')});`)
}

sqlite.close()

writeFileSync(SQL_PATH, lines.join('\n'), 'utf8')
console.log(`已生成 ${lines.length} 条 SQL -> ${SQL_PATH}`)
try {
  execFileSync('npx', ['wrangler', 'd1', 'execute', 'xhs_note_creator', '--remote', '--file', SQL_PATH], { stdio: 'inherit', shell: true })
} finally {
  unlinkSync(SQL_PATH)
  console.log('临时 SQL 文件已删除')
}
