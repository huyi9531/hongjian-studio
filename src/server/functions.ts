import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { isAuthenticated, requireAuth, signIn } from './auth.server'
import { generateNoteContent, generateOutline, generateSeedreamImage } from './services/ai.server'
import { publishWork } from './services/publish.server'
import { getStudioPreferences, saveStudioPreferences } from './services/settings.server'
import { createWork, getWork, listWorks, updateWork, upsertImage } from './services/work.server'
import { configuredCapabilities } from './env.server'

const pageSchema = z.object({ index: z.number().int().min(0), type: z.enum(['cover', 'content', 'summary']), content: z.string().min(1).max(5000) })
const workIdSchema = z.object({ workId: z.string().uuid() })
const studioPreferencesSchema = z.object({
  imageModel: z.enum(['seedream-4-5-251128', 'seedream-5-0-pro-260128']),
  imageSize: z.enum(['1K', '2K', '4K']),
  transferToOss: z.boolean(),
}).superRefine((value, context) => {
  const supported = value.imageModel === 'seedream-4-5-251128' ? ['2K', '4K'] : ['1K', '2K']
  if (!supported.includes(value.imageSize)) context.addIssue({ code: 'custom', path: ['imageSize'], message: '该模型不支持所选清晰度' })
})

export const sessionFn = createServerFn({ method: 'GET' }).handler(() => ({ authenticated: isAuthenticated() }))
export const signInFn = createServerFn({ method: 'POST' }).validator(z.object({ password: z.string().min(1).max(256) })).handler(({ data }) => { signIn(data.password); return { ok: true } })
export const listWorksFn = createServerFn({ method: 'GET' }).validator(z.object({ query: z.string().max(120).optional() })).handler(async ({ data }) => { requireAuth(); return listWorks(data.query ?? '') })
export const getWorkFn = createServerFn({ method: 'GET' }).validator(workIdSchema).handler(async ({ data }) => { requireAuth(); return getWork(data.workId) })
export const getStudioPreferencesFn = createServerFn({ method: 'GET' }).handler(async () => { requireAuth(); return { preferences: await getStudioPreferences(), capabilities: configuredCapabilities() } })
export const saveStudioPreferencesFn = createServerFn({ method: 'POST' }).validator(studioPreferencesSchema).handler(async ({ data }) => { requireAuth(); return saveStudioPreferences(data) })
export const createWorkFn = createServerFn({ method: 'POST' }).validator(z.object({ topic: z.string().trim().min(2).max(300) })).handler(async ({ data }) => { requireAuth(); const outline = await generateOutline(data.topic); const id = await createWork(data.topic, outline.pages, outline.raw); return getWork(id) })
export const updateWorkFn = createServerFn({ method: 'POST' }).validator(workIdSchema.extend({ topic: z.string().trim().min(2).max(300).optional(), outlineRaw: z.string().max(30000).optional(), pages: z.array(pageSchema).min(1).max(18).optional(), selectedTitle: z.string().max(80).optional(), copywriting: z.string().max(1000).optional(), tags: z.array(z.string().trim().min(1).max(32)).max(12).optional() })).handler(async ({ data }) => { requireAuth(); const { workId, pages, ...payload } = data; return updateWork(workId, { ...payload, outlinePages: pages }) })
export const generateAssetsFn = createServerFn({ method: 'POST' }).validator(workIdSchema.extend({ model: z.enum(['seedream-4-5-251128', 'seedream-5-0-pro-260128']), size: z.enum(['1K', '2K', '4K']) })).handler(async ({ data }) => {
  requireAuth()
  if ((data.model === 'seedream-4-5-251128' && !['2K', '4K'].includes(data.size)) || (data.model === 'seedream-5-0-pro-260128' && !['1K', '2K'].includes(data.size))) throw new Error('该模型不支持所选清晰度')
  const work = await getWork(data.workId)
  const contentResult = generateNoteContent(work.topic, work.outlineRaw).then(async content => updateWork(data.workId, { titles: content.titles, selectedTitle: content.titles[0] ?? '', copywriting: content.copywriting, tags: content.tags })).catch(error => ({ contentError: error instanceof Error ? error.message : String(error) }))
  const imageResults = await Promise.allSettled(work.outlinePages.map(async page => { await upsertImage(data.workId, page.index, { status: 'generating', error: null }); const image = await generateSeedreamImage(`${work.topic}\n${page.content}`, data.model, data.size, data.workId, page.index); await upsertImage(data.workId, page.index, { status: 'done', ...image }); return page.index }))
  for (const [index, result] of imageResults.entries()) if (result.status === 'rejected') await upsertImage(data.workId, work.outlinePages[index]!.index, { status: 'error', error: result.reason instanceof Error ? result.reason.message : String(result.reason) })
  await contentResult
  return getWork(data.workId)
})
export const publishWorkFn = createServerFn({ method: 'POST' }).validator(workIdSchema.extend({ title: z.string().trim().min(1).max(80), content: z.string().max(1000), transferToOss: z.boolean(), force: z.boolean().optional() })).handler(async ({ data }) => { requireAuth(); return publishWork(data.workId, data.title, data.content, data.transferToOss) })
