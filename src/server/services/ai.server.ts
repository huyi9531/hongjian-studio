import '@tanstack/react-start/server-only'
import { randomUUID } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { z } from 'zod'
import { env } from '../env.server'
import { getModelCredentials, getStudioPreferences } from './settings.server'
import type { OutlinePage } from './work.server'
import type { SeedreamModel, SeedreamSize } from '@/lib/studio-preferences'

export type OutlinePagePlan =
  | { mode: 'smart'; minPages: number; maxPages: number }
  | { mode: 'exact'; exactPages: number }

const defaultOutlinePagePlan: OutlinePagePlan = { mode: 'smart', minPages: 3, maxPages: 8 }

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number, label: string) {
  try {
    return await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) })
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === 'TimeoutError') throw new Error(`${label}超时，请稍后重试`, { cause })
    throw new Error(`${label}网络请求失败，请稍后重试`, { cause })
  }
}

async function textCompletion(prompt: string, images: string[] = []) {
  const [preferences, credentials] = await Promise.all([getStudioPreferences(), getModelCredentials()])
  if (!credentials.textApiKey) throw new Error('请先在设置中配置文本模型 API Key')
  const content = images.length ? [{ type: 'text', text: prompt }, ...images.map(imageUrl => ({ type: 'image_url', image_url: { url: imageUrl } }))] : prompt
  const response = await fetchWithTimeout('https://ark.cn-beijing.volces.com/api/v3/chat/completions', { method: 'POST', headers: { Authorization: `Bearer ${credentials.textApiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model: preferences.textModel, messages: [{ role: 'user', content }], thinking: { type: preferences.textThinkingEnabled ? 'enabled' : 'disabled' }, temperature: 0.8 }) }, 60_000, '文本模型请求')
  if (!response.ok) throw new Error(`文本模型请求失败: ${response.status}`)
  const json = await response.json().catch(() => { throw new Error('文本模型返回了无法解析的响应') }) as { choices?: Array<{ message?: { content?: string } }> }
  return json.choices?.[0]?.message?.content?.trim() ?? ''
}

export async function generateOutline(topic: string, images: string[] = [], pagePlan: OutlinePagePlan = defaultOutlinePagePlan): Promise<{ raw: string; pages: OutlinePage[] }> {
  const pageRequirement = pagePlan.mode === 'exact'
    ? `必须严格生成 ${pagePlan.exactPages} 页。`
    : `请根据主题复杂度智能规划，在 ${pagePlan.minPages}-${pagePlan.maxPages} 页之间生成。`
  const raw = await textCompletion(`你是一个小红书内容创作专家。请根据用户要求生成图文内容大纲。\n\n用户的要求以及说明：\n${topic}\n\n要求：第一页必须是封面；${pageRequirement} 每页内容具体、适合后续生成图片；严格用 <page> 分隔，每页第一行标注 [封面]、[内容] 或 [总结]；直接从大纲开始，不要解释。${images.length ? '\n用户同时提供了参考图片，请结合图片内容理解主题和视觉方向。' : ''}`, images)
  const parts = raw.split(/<page>/i).map(item => item.trim()).filter(Boolean)
  const pages = parts.map((content, index) => ({ index, type: content.startsWith('[封面]') ? 'cover' : content.startsWith('[总结]') ? 'summary' : 'content', content }))
  const parsed = z.array(z.object({ index: z.number().int().min(0), type: z.enum(['cover', 'content', 'summary']), content: z.string().min(1).max(5000) })).min(1).max(18).safeParse(pages)
  const pageCountMatchesPlan = parsed.success && (pagePlan.mode === 'exact' ? parsed.data.length === pagePlan.exactPages : parsed.data.length >= pagePlan.minPages && parsed.data.length <= pagePlan.maxPages)
  if (!pageCountMatchesPlan || parsed.data[0]?.type !== 'cover') throw new Error('文本模型返回的大纲页数或格式不符合本次页数规划，请重试')
  return { raw, pages: parsed.data }
}

export async function generateNoteContent(topic: string, outline: string) {
  const raw = await textCompletion(`根据主题“${topic}”和大纲生成小红书图文笔记。严格返回 JSON：{"titles":["标题1","标题2","标题3"],"copywriting":"正文","tags":["标签1","标签2"]}。标题适合 20 字内，正文不超过 850 字。大纲：${outline}`)
  const match = raw.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('文本模型未返回可解析的笔记内容')
  let data: unknown
  try { data = JSON.parse(match[0]) } catch (cause) { throw new Error('文本模型返回了无法解析的笔记内容', { cause }) }
  const parsed = z.object({
    titles: z.array(z.string().trim().min(1).max(80)).min(1).max(5),
    copywriting: z.string().max(1000),
    tags: z.array(z.string().trim().min(1).max(32)).max(12),
  }).safeParse(data)
  if (!parsed.success) throw new Error('文本模型返回的标题、正文或标签不符合发布要求')
  return parsed.data
}

export async function generateSeedreamImage(prompt: string, model: SeedreamModel, size: SeedreamSize, workId: string, pageIndex: number, referenceImages: string[] = []) {
  const credentials = await getModelCredentials()
  if (!credentials.imageApiKey) throw new Error('请先在设置中配置图片模型 API Key')
  const maxReferences = model.includes('5-0-pro') ? 10 : 14
  const response = await fetchWithTimeout('https://ark.cn-beijing.volces.com/api/v3/images/generations', { method: 'POST', headers: { Authorization: `Bearer ${credentials.imageApiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model, prompt, size, watermark: false, ...(referenceImages.length ? { image: referenceImages.slice(0, maxReferences) } : {}) }) }, 90_000, '图片模型请求')
  if (!response.ok) {
    const detail = (await response.text()).slice(0, 500).replace(/\s+/g, ' ').trim()
    throw new Error(`图片模型请求失败: ${response.status}${detail ? ` - ${detail}` : ''}`)
  }
  const data = await response.json().catch(() => { throw new Error('图片模型返回了无法解析的响应') }) as { data?: Array<{ url?: string }> }
  const sourceUrl = data.data?.[0]?.url
  if (!sourceUrl) throw new Error('图片模型未返回公网 URL')
  let archivePath: string | undefined
  let archiveStatus: 'archived' | 'unavailable' = 'unavailable'
  let archiveError: string | undefined
  let archiveMimeType: string | undefined
  try {
    const image = await fetchWithTimeout(sourceUrl, {}, 30_000, '图片归档下载')
    if (image.ok) {
      const contentType = image.headers.get('content-type')?.split(';')[0]
      if (!contentType || !['image/png', 'image/jpeg', 'image/webp'].includes(contentType)) throw new Error('图片归档下载返回了不支持的文件类型')
      const dir = join(env.DATA_DIR, 'images', workId)
      await mkdir(dir, { recursive: true })
      const extension = contentType === 'image/jpeg' ? 'jpg' : contentType === 'image/webp' ? 'webp' : 'png'
      archivePath = join('images', workId, `${pageIndex}-${randomUUID()}.${extension}`)
      await writeFile(join(env.DATA_DIR, archivePath), Buffer.from(await image.arrayBuffer()))
      archiveStatus = 'archived'
      archiveMimeType = contentType
    } else {
      archiveError = `图片归档下载失败: ${image.status}`
    }
  } catch (error) {
    archiveError = error instanceof Error ? error.message : String(error)
    console.warn('Image archive failed; retaining the original provider URL.', { workId, pageIndex, error: error instanceof Error ? error.message : String(error) })
  }
  return { sourceUrl, archivePath, archiveStatus, archiveError, archiveMimeType }
}
