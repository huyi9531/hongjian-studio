import '@tanstack/react-start/server-only'
import { randomUUID } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { env } from '../env.server'
import { getModelCredentials, getStudioPreferences } from './settings.server'
import type { OutlinePage } from './work.server'
import type { SeedreamModel, SeedreamSize } from '@/lib/studio-preferences'

async function textCompletion(prompt: string, images: string[] = []) {
  const [preferences, credentials] = await Promise.all([getStudioPreferences(), getModelCredentials()])
  if (!credentials.textApiKey) throw new Error('请先在设置中配置文本模型 API Key')
  const content = images.length ? [{ type: 'text', text: prompt }, ...images.map(imageUrl => ({ type: 'image_url', image_url: { url: imageUrl } }))] : prompt
  const response = await fetch('https://ark.cn-beijing.volces.com/api/v3/chat/completions', { method: 'POST', headers: { Authorization: `Bearer ${credentials.textApiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model: preferences.textModel, messages: [{ role: 'user', content }], thinking: { type: preferences.textThinkingEnabled ? 'enabled' : 'disabled' }, temperature: 0.8 }) })
  if (!response.ok) throw new Error(`文本模型请求失败: ${response.status}`)
  const json = await response.json() as { choices?: Array<{ message?: { content?: string } }> }
  return json.choices?.[0]?.message?.content?.trim() ?? ''
}

export async function generateOutline(topic: string, images: string[] = []): Promise<{ raw: string; pages: OutlinePage[] }> {
  const raw = await textCompletion(`你是一个小红书内容创作专家。请根据用户要求生成图文内容大纲。\n\n用户的要求以及说明：\n${topic}\n\n要求：第一页必须是封面；用户未指定时默认 5 页，允许 2-18 页；每页内容具体、适合后续生成图片；严格用 <page> 分隔，每页第一行标注 [封面]、[内容] 或 [总结]；直接从大纲开始，不要解释。${images.length ? '\n用户同时提供了参考图片，请结合图片内容理解主题和视觉方向。' : ''}`, images)
  const parts = raw.split(/<page>/i).map(item => item.trim()).filter(Boolean)
  const pages = parts.map((content, index) => ({ index, type: content.startsWith('[封面]') ? 'cover' : content.startsWith('[总结]') ? 'summary' : 'content', content })) as OutlinePage[]
  if (!pages.length) throw new Error('文本模型未返回可用大纲')
  return { raw, pages }
}

export async function generateNoteContent(topic: string, outline: string) {
  const raw = await textCompletion(`根据主题“${topic}”和大纲生成小红书图文笔记。严格返回 JSON：{"titles":["标题1","标题2","标题3"],"copywriting":"正文","tags":["标签1","标签2"]}。标题适合 20 字内，正文不超过 850 字。大纲：${outline}`)
  const match = raw.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('文本模型未返回可解析的笔记内容')
  const data = JSON.parse(match[0]) as { titles?: string[]; copywriting?: string; tags?: string[] }
  return { titles: data.titles?.filter(Boolean).slice(0, 5) ?? [], copywriting: data.copywriting ?? '', tags: data.tags?.filter(Boolean).slice(0, 12) ?? [] }
}

export async function generateSeedreamImage(prompt: string, model: SeedreamModel, size: SeedreamSize, workId: string, pageIndex: number, referenceImages: string[] = []) {
  const credentials = await getModelCredentials()
  if (!credentials.imageApiKey) throw new Error('请先在设置中配置图片模型 API Key')
  const maxReferences = model.includes('5-0-pro') ? 10 : 14
  const response = await fetch('https://ark.cn-beijing.volces.com/api/v3/images/generations', { method: 'POST', headers: { Authorization: `Bearer ${credentials.imageApiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model, prompt, size, ...(referenceImages.length ? { image: referenceImages.slice(0, maxReferences) } : {}) }) })
  if (!response.ok) {
    const detail = (await response.text()).slice(0, 500).replace(/\s+/g, ' ').trim()
    throw new Error(`图片模型请求失败: ${response.status}${detail ? ` - ${detail}` : ''}`)
  }
  const data = await response.json() as { data?: Array<{ url?: string }> }
  const sourceUrl = data.data?.[0]?.url
  if (!sourceUrl) throw new Error('图片模型未返回公网 URL')
  let archivePath: string | undefined
  try {
    const image = await fetch(sourceUrl)
    if (image.ok) {
      const dir = join(env.DATA_DIR, 'images', workId)
      await mkdir(dir, { recursive: true })
      archivePath = join('images', workId, `${pageIndex}-${randomUUID()}.png`)
      await writeFile(join(env.DATA_DIR, archivePath), Buffer.from(await image.arrayBuffer()))
    }
  } catch (error) {
    console.warn('Image archive failed; retaining the original provider URL.', { workId, pageIndex, error: error instanceof Error ? error.message : String(error) })
  }
  return { sourceUrl, archivePath }
}
