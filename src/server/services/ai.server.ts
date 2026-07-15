import '@tanstack/react-start/server-only'
import { randomUUID } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { env } from '../env.server'
import type { OutlinePage } from './work.server'
import type { SeedreamModel, SeedreamSize } from '@/lib/studio-preferences'

async function textCompletion(prompt: string) {
  if (!env.TEXT_API_KEY || !env.TEXT_BASE_URL || !env.TEXT_MODEL) throw new Error('文本模型环境变量未配置')
  const endpoint = env.TEXT_ENDPOINT.startsWith('/') ? env.TEXT_ENDPOINT : `/${env.TEXT_ENDPOINT}`
  const response = await fetch(`${env.TEXT_BASE_URL.replace(/\/$/, '')}${endpoint}`, { method: 'POST', headers: { Authorization: `Bearer ${env.TEXT_API_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model: env.TEXT_MODEL, messages: [{ role: 'user', content: prompt }], temperature: 0.8 }) })
  if (!response.ok) throw new Error(`文本模型请求失败: ${response.status}`)
  const json = await response.json() as { choices?: Array<{ message?: { content?: string } }> }
  return json.choices?.[0]?.message?.content?.trim() ?? ''
}

export async function generateOutline(topic: string): Promise<{ raw: string; pages: OutlinePage[] }> {
  const raw = await textCompletion(`请为小红书图文主题“${topic}”生成 5 页内容大纲。每页以 <page> 分隔，首行使用 [封面]、[内容] 或 [总结]，每页包含适合图文卡片的中文文案。`)
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

export async function generateSeedreamImage(prompt: string, model: SeedreamModel, size: SeedreamSize, workId: string, pageIndex: number) {
  if (!env.VOLCENGINE_API_KEY) throw new Error('火山引擎 API Key 未配置')
  const response = await fetch('https://ark.cn-beijing.volces.com/api/v3/images/generations', { method: 'POST', headers: { Authorization: `Bearer ${env.VOLCENGINE_API_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model, prompt, size }) })
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
