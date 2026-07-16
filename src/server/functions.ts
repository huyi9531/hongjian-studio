import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { isAuthenticated, requireAuth, signIn } from './auth.server'
import { generateNoteContent, generateOutline } from './services/ai.server'
import { regenerateWorkImage } from './services/generation.server'
import { publishWork } from './services/publish.server'
import { getModelCapabilities, getStudioPreferences, saveStudioPreferences } from './services/settings.server'
import { createWork, deleteWork, getWork, listWorks, updateWork } from './services/work.server'
import { imagePromptModes, seedreamModels, supportedSeedreamSizes, textModels } from '@/lib/studio-preferences'

const pageSchema = z.object({ index: z.number().int().min(0), type: z.enum(['cover', 'content', 'summary']), content: z.string().min(1).max(5000) })
const workIdSchema = z.object({ workId: z.string().uuid() })
const studioPreferencesSchema = z.object({
  textModel: z.enum([textModels.pro, textModels.turbo]),
  textThinkingEnabled: z.boolean(),
  imageModel: z.enum([seedreamModels.standard, seedreamModels.pro]),
  imageSize: z.enum(['1K', '2K', '4K']),
  imagePromptMode: z.enum([imagePromptModes.short, imagePromptModes.long]),
  textApiKey: z.string().trim().min(8).max(512).optional(),
  imageApiKey: z.string().trim().min(8).max(512).optional(),
}).superRefine((value, context) => {
  const supported = supportedSeedreamSizes(value.imageModel)
  if (!supported.includes(value.imageSize)) context.addIssue({ code: 'custom', path: ['imageSize'], message: '该模型不支持所选清晰度' })
})

export const sessionFn = createServerFn({ method: 'GET' }).handler(() => ({ authenticated: isAuthenticated() }))
export const signInFn = createServerFn({ method: 'POST' }).validator(z.object({ password: z.string().min(1).max(256) })).handler(({ data }) => { signIn(data.password); return { ok: true } })
export const listWorksFn = createServerFn({ method: 'GET' }).validator(z.object({ query: z.string().max(120).optional() })).handler(async ({ data }) => { requireAuth(); return listWorks(data.query ?? '') })
export const getWorkFn = createServerFn({ method: 'GET' }).validator(workIdSchema).handler(async ({ data }) => { requireAuth(); return getWork(data.workId) })
export const deleteWorkFn = createServerFn({ method: 'POST' }).validator(workIdSchema).handler(async ({ data }) => { requireAuth(); await deleteWork(data.workId); return { ok: true } })
export const getStudioPreferencesFn = createServerFn({ method: 'GET' }).handler(async () => {
  requireAuth()
  const [preferences, modelCapabilities] = await Promise.all([getStudioPreferences(), getModelCapabilities()])
  return { preferences, capabilities: modelCapabilities }
})
export const saveStudioPreferencesFn = createServerFn({ method: 'POST' }).validator(studioPreferencesSchema).handler(async ({ data }) => {
  requireAuth()
  const { textApiKey, imageApiKey, ...preferences } = data
  const saved = await saveStudioPreferences(preferences, { textApiKey, imageApiKey })
  return saved
})
const referenceSchema = z.object({
  filename: z.string().trim().min(1).max(255),
  mimeType: z.enum(['image/png', 'image/jpeg', 'image/webp']),
  dataUrl: z.string().max(12_000_000).refine(value => /^data:image\/(png|jpeg|webp);base64,/.test(value), '参考图片格式无效'),
})

export const createWorkFn = createServerFn({ method: 'POST' }).validator(z.object({ topic: z.string().trim().min(2).max(300), references: z.array(referenceSchema).max(5).optional() })).handler(async ({ data }) => {
  requireAuth()
  const references = data.references ?? []
  const outline = await generateOutline(data.topic, references.map(reference => reference.dataUrl))
  const id = await createWork(data.topic, outline.pages, outline.raw, references)
  return getWork(id)
})
export const updateWorkFn = createServerFn({ method: 'POST' }).validator(workIdSchema.extend({ topic: z.string().trim().min(2).max(300).optional(), outlineRaw: z.string().max(30000).optional(), pages: z.array(pageSchema).min(1).max(18).optional(), selectedTitle: z.string().max(80).optional(), copywriting: z.string().max(1000).optional(), tags: z.array(z.string().trim().min(1).max(32)).max(12).optional(), status: z.enum(['draft', 'outline', 'generating', 'partial_failed', 'result', 'unpublishable']).optional() })).handler(async ({ data }) => { requireAuth(); const { workId, pages, ...payload } = data; return updateWork(workId, { ...payload, outlinePages: pages }) })
export const generateContentFn = createServerFn({ method: 'POST' }).validator(workIdSchema).handler(async ({ data }) => {
  requireAuth()
  const work = await getWork(data.workId)
  const content = await generateNoteContent(work.topic, work.outlineRaw)
  return updateWork(data.workId, { titles: content.titles, selectedTitle: content.titles[0] ?? '', copywriting: content.copywriting, tags: content.tags })
})
export const regenerateImageFn = createServerFn({ method: 'POST' }).validator(workIdSchema.extend({ pageIndex: z.number().int().min(0).max(17), model: z.enum([seedreamModels.standard, seedreamModels.pro]), size: z.enum(['1K', '2K', '4K']), promptMode: z.enum([imagePromptModes.short, imagePromptModes.long]) })).handler(async ({ data }) => {
  requireAuth()
  if (!supportedSeedreamSizes(data.model).includes(data.size)) throw new Error('该模型不支持所选清晰度')
  return regenerateWorkImage(data.workId, data.pageIndex, data.model, data.size, data.promptMode)
})
export const publishWorkFn = createServerFn({ method: 'POST' }).validator(workIdSchema.extend({ title: z.string().trim().min(1).max(80), content: z.string().max(1000) })).handler(async ({ data }) => { requireAuth(); return publishWork(data.workId, data.title, data.content) })
