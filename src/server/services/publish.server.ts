import '@tanstack/react-start/server-only'
import { createHash, randomUUID } from 'node:crypto'
import { and, eq, inArray } from 'drizzle-orm'
import { db } from '../db/index.server'
import { publications } from '../db/schema'
import { env } from '../env.server'
import { getWork, updateWork } from './work.server'

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number, label: string) {
  try {
    return await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) })
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === 'TimeoutError') throw new Error(`${label}超时，请稍后重试`, { cause })
    throw new Error(`${label}网络请求失败，请稍后重试`, { cause })
  }
}

async function isPublicImageAvailable(url: string) {
  const head = await fetchWithTimeout(url, { method: 'HEAD' }, 15_000, '图片链接校验')
  if (head.ok) return true
  if (head.status !== 405 && head.status !== 501) return false
  const get = await fetchWithTimeout(url, { headers: { Range: 'bytes=0-0' } }, 15_000, '图片链接校验')
  return get.ok
}

export function weightedTitleLength(value: string) {
  return [...value].reduce((total, char) => total + (/^[\x00-\x7f]$/.test(char) ? 0.5 : 1), 0)
}

export function publicationFingerprint(title: string, content: string, images: string[], transferToOss?: boolean) {
  const value = transferToOss === undefined ? { title, content, images } : { title, content, images, transferToOss }
  return createHash('sha256').update(JSON.stringify(value)).digest('hex')
}

export async function publishWork(workId: string, title: string, content: string) {
  if (!env.AICONDUCTOR_API_KEY) throw new Error('扫码发布 API Key 未配置')
  if (weightedTitleLength(title) > 20) throw new Error('标题超过 20 字限制')
  if (content.length > 1000) throw new Error('正文超过 1000 字限制')
  const work = await getWork(workId)
  if (work.images.length !== work.outlinePages.length || work.images.some(image => image.status !== 'done' || !image.inputFingerprint || !image.sourceUrl)) throw new Error('图片尚未完成或属于历史未校验结果，请重新生成后再发布')
  const images = work.images.map(image => image.sourceUrl).filter((url): url is string => Boolean(url))
  if (!images.length || images.length > 18) throw new Error('需要 1-18 张带公网 URL 的图片，旧作品请重新生成')
  const availability = await Promise.all(images.map(isPublicImageAvailable))
  if (availability.some(available => !available)) {
    await updateWork(workId, { status: 'unpublishable' })
    throw new Error('图片公网链接已失效。当前仅保留本地归档，请重新生成图片后再发布')
  }
  const fingerprint = publicationFingerprint(title, content, images)
  const compatibleFingerprints = [
    fingerprint,
    publicationFingerprint(title, content, images, false),
    publicationFingerprint(title, content, images, true),
  ]
  const [existing] = await db.select().from(publications).where(and(eq(publications.workId, workId), inArray(publications.fingerprint, compatibleFingerprints)))
  if (existing) return { ...existing, cached: true }
  const response = await fetchWithTimeout(env.XHS_PUBLISH_API_URL, { method: 'POST', headers: { Authorization: `Bearer ${env.AICONDUCTOR_API_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'normal', title, content, images, transfer_to_oss: false }) }, 60_000, '扫码发布服务')
  const result = await response.json().catch(() => { throw new Error('扫码发布服务返回了无法解析的响应') }) as { success?: boolean; message?: string; data?: { id?: string; url?: string; qrcode?: string }; billing?: { service_fee?: number; currency?: string; transaction_id?: string } }
  if (!response.ok || !result.success || !result.data?.url || !result.data.qrcode) throw new Error(result.message ?? '生成扫码发布页失败')
  const record = { id: result.data.id ?? randomUUID(), workId, fingerprint, h5Url: result.data.url, qrCode: result.data.qrcode, transferToOss: false, serviceFee: String(result.billing?.service_fee ?? ''), currency: result.billing?.currency ?? 'CNY', transactionId: result.billing?.transaction_id ?? null, createdAt: new Date() }
  await db.insert(publications).values(record)
  return { ...record, cached: false }
}
