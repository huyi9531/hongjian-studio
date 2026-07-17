import '@tanstack/react-start/server-only'
import { createHash, randomUUID } from 'node:crypto'
import { and, eq, ne } from 'drizzle-orm'
import { imagePromptModes, type ImagePromptMode, type SeedreamModel, type SeedreamSize } from '@/lib/studio-preferences'
import { db } from '../db/index.server'
import { generationJobs } from '../db/schema'
import { generateSeedreamImage } from './ai.server'
import { getReferenceDataUrls, getWork, setWorkStatus, upsertImage, type OutlinePage } from './work.server'

export type GenerationEvent = {
  event: 'progress' | 'complete' | 'error' | 'finish' | 'retry_start' | 'retry_finish'
  data: Record<string, unknown>
}

type PreparedGeneration = {
  work: Awaited<ReturnType<typeof getWork>>
  references: string[]
  referenceFingerprint: string
  taskFingerprint: string
  pageFingerprints: Map<number, string>
  model: SeedreamModel
  size: SeedreamSize
  promptMode: ImagePromptMode
}

type ClaimedGeneration = PreparedGeneration & { job: typeof generationJobs.$inferSelect }

export class GenerationInProgressError extends Error {
  constructor(public readonly job: typeof generationJobs.$inferSelect) {
    super('该作品正在后台生成图片')
  }
}

function hash(value: unknown) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex')
}

export function buildImagePrompt(page: OutlinePage, topic: string, outline: string, mode: ImagePromptMode) {
  if (mode === imagePromptModes.short) return `生成一张小红书风格的竖版图文内容图片（3:4）。
不要带有任何小红书 Logo、用户 ID 或水印；参考图片如有水印或 Logo，请勿复现。

页面类型：${page.type}
页面内容：
${page.content}

要求：清新精致，文字完整清晰，信息层次明确，排版美观并保留合理留白，适合手机阅读。不要生成手机边框或白色留边。`

  return `请生成一张小红书风格的图文内容图片。
不要带有任何小红书 Logo、用户 ID 或水印；参考图片如有水印或 Logo，请勿复现。

页面内容：
${page.content}

页面类型：${page.type}

如果当前页面不是封面，要参考最后一张图片的封面样式，严格保持配色、视觉元素和排版风格统一。
要求：竖版 3:4，高清，文字完整清晰，留白合理，适合手机阅读。封面标题醒目；内容页信息层次分明；总结页突出结论和行动提示。不要生成手机边框或白色留边。

用户原始需求：
${topic}

完整内容大纲：
${outline}`
}

async function claimGenerationJob(prepared: PreparedGeneration) {
  const now = new Date()
  const inserted = await db.insert(generationJobs).values({
    id: randomUUID(),
    workId: prepared.work.id,
    inputFingerprint: prepared.taskFingerprint,
    model: prepared.model,
    size: prepared.size,
    promptMode: prepared.promptMode,
    status: 'running',
    completedPages: 0,
    failedPages: 0,
    error: null,
    createdAt: now,
    updatedAt: now,
  }).onConflictDoUpdate({
    target: generationJobs.workId,
    set: {
      inputFingerprint: prepared.taskFingerprint,
      model: prepared.model,
      size: prepared.size,
      promptMode: prepared.promptMode,
      status: 'running',
      completedPages: 0,
      failedPages: 0,
      error: null,
      updatedAt: now,
    },
    where: ne(generationJobs.status, 'running'),
  }).returning()

  if (inserted[0]) return inserted[0]
  const [job] = await db.select().from(generationJobs).where(eq(generationJobs.workId, prepared.work.id)).limit(1)
  if (!job) throw new Error('无法创建图片生成任务')
  throw new GenerationInProgressError(job)
}

async function updateJob(job: typeof generationJobs.$inferSelect, status: 'running' | 'succeeded' | 'partial_failed' | 'interrupted', completedPages: number, failedPages: number, error: string | null = null) {
  await db.update(generationJobs).set({ status, completedPages, failedPages, error, updatedAt: new Date() }).where(and(eq(generationJobs.workId, job.workId), eq(generationJobs.id, job.id)))
}

export async function prepareGeneration(workId: string, model: SeedreamModel, size: SeedreamSize, promptMode: ImagePromptMode = imagePromptModes.short) {
  const [work, references] = await Promise.all([getWork(workId), getReferenceDataUrls(workId)])
  const referenceFingerprint = hash(references)
  const pageFingerprints = new Map(work.outlinePages.map(page => [page.index, hash({ page, referenceFingerprint, model, size, promptMode, outline: promptMode === imagePromptModes.long ? work.outlineRaw : undefined })]))
  const prepared: PreparedGeneration = {
    work,
    references,
    referenceFingerprint,
    taskFingerprint: hash({ pages: work.outlinePages, referenceFingerprint, model, size, promptMode }),
    pageFingerprints,
    model,
    size,
    promptMode,
  }
  const job = await claimGenerationJob(prepared)
  return { ...prepared, job }
}

async function generatePage(prepared: PreparedGeneration, page: OutlinePage, references: string[]) {
  const inputFingerprint = prepared.pageFingerprints.get(page.index)
  if (!inputFingerprint) throw new Error('页面生成指纹缺失')
  await upsertImage(prepared.work.id, page.index, { status: 'generating', error: null, inputFingerprint })
  try {
    const generated = await generateSeedreamImage(buildImagePrompt(page, prepared.work.topic, prepared.work.outlineRaw, prepared.promptMode), prepared.model, prepared.size, prepared.work.id, page.index, references)
    await upsertImage(prepared.work.id, page.index, { status: 'done', error: null, inputFingerprint, ...generated })
    const fresh = await getWork(prepared.work.id)
    return { ok: true as const, image: fresh.images.find(image => image.pageIndex === page.index) }
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause)
    await upsertImage(prepared.work.id, page.index, { status: 'error', error: message, inputFingerprint })
    return { ok: false as const, message }
  }
}

async function runConcurrent<T>(items: T[], limit: number, task: (item: T) => Promise<void>) {
  let cursor = 0
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const item = items[cursor]
      cursor += 1
      if (item !== undefined) await task(item)
    }
  }))
}

function doneEvent(index: number, imageId?: string, phase = 'content', cached = false): GenerationEvent {
  return { event: 'complete', data: { index, status: 'done', image_url: imageId ? `/api/work-images/${imageId}` : undefined, phase, cached } }
}

function errorEvent(index: number, message: string, phase = 'content'): GenerationEvent {
  return { event: 'error', data: { index, status: 'error', message, retryable: true, phase } }
}

export async function runPreparedGeneration(prepared: ClaimedGeneration, emit: (event: GenerationEvent) => void, options: { retryOnly?: boolean; forcePageIndexes?: number[] } = {}) {
  try {
  const currentImages = new Map(prepared.work.images.map(image => [image.pageIndex, image]))
  const shouldGenerate = (page: OutlinePage) => {
    if (options.forcePageIndexes?.includes(page.index)) return true
    const image = currentImages.get(page.index)
    const current = image?.status === 'done' && image.inputFingerprint === prepared.pageFingerprints.get(page.index)
    return options.retryOnly ? !current : !current
  }
  const pendingPages = prepared.work.outlinePages.filter(shouldGenerate)
  const completedCached = prepared.work.outlinePages.filter(page => !shouldGenerate(page))
  let completed = completedCached.length
  let failed = 0
  const failedIndexes: number[] = []

  await setWorkStatus(prepared.work.id, 'generating')
  for (const page of completedCached) emit(doneEvent(page.index, currentImages.get(page.index)?.id, 'cached', true))
  for (const page of pendingPages) await upsertImage(prepared.work.id, page.index, { status: 'pending', error: null, inputFingerprint: prepared.pageFingerprints.get(page.index) })

  const cover = prepared.work.outlinePages.find(page => page.type === 'cover') ?? prepared.work.outlinePages[0]
  let coverReference = currentImages.get(cover?.index ?? -1)?.sourceUrl ?? undefined
  if (cover && pendingPages.some(page => page.index === cover.index)) {
    emit({ event: 'progress', data: { index: cover.index, status: 'generating', message: '正在生成封面...', current: completed + 1, total: prepared.work.outlinePages.length, phase: 'cover' } })
    const result = await generatePage(prepared, cover, prepared.references)
    if (result.ok) {
      completed += 1
      coverReference = result.image?.sourceUrl ?? undefined
      emit(doneEvent(cover.index, result.image?.id, 'cover'))
    } else {
      failed += 1
      failedIndexes.push(cover.index)
      emit(errorEvent(cover.index, result.message, 'cover'))
    }
  }

  const otherPages = pendingPages.filter(page => page.index !== cover?.index)
  if (otherPages.length) {
    emit({ event: 'progress', data: { status: 'batch_start', message: `开始并发生成 ${otherPages.length} 页内容...`, current: completed, total: prepared.work.outlinePages.length, phase: 'content' } })
    await runConcurrent(otherPages, 3, async page => {
      emit({ event: 'progress', data: { index: page.index, status: 'generating', current: completed + 1, total: prepared.work.outlinePages.length, phase: 'content' } })
      const result = await generatePage(prepared, page, [...prepared.references, ...(coverReference ? [coverReference] : [])])
      if (result.ok) {
        completed += 1
        emit(doneEvent(page.index, result.image?.id))
      } else {
        failed += 1
        failedIndexes.push(page.index)
        emit(errorEvent(page.index, result.message))
      }
    })
  }

  const success = failed === 0
  await setWorkStatus(prepared.work.id, success ? 'result' : 'partial_failed')
  await updateJob(prepared.job, success ? 'succeeded' : 'partial_failed', completed, failed)
  emit({ event: options.retryOnly ? 'retry_finish' : 'finish', data: { success, task_id: prepared.job.id, total: prepared.work.outlinePages.length, completed, failed, failed_indices: failedIndexes } })
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause)
    try {
      await updateJob(prepared.job, 'interrupted', 0, 0, message)
      await setWorkStatus(prepared.work.id, 'partial_failed')
    } catch (statusCause) {
      console.error('Unable to persist interrupted generation state.', { workId: prepared.work.id, jobId: prepared.job.id, error: statusCause instanceof Error ? statusCause.message : String(statusCause) })
    }
    throw new Error(`图片生成任务中断：${message}`, { cause })
  }
}

export async function generateWorkImages(workId: string, model: SeedreamModel, size: SeedreamSize, emit: (event: GenerationEvent) => void, _force = false, promptMode: ImagePromptMode = imagePromptModes.short) {
  const prepared = await prepareGeneration(workId, model, size, promptMode)
  await runPreparedGeneration(prepared, emit)
}

export async function retryFailedWorkImages(workId: string, model: SeedreamModel, size: SeedreamSize, emit: (event: GenerationEvent) => void, promptMode: ImagePromptMode = imagePromptModes.short) {
  const prepared = await prepareGeneration(workId, model, size, promptMode)
  emit({ event: 'retry_start', data: { total: prepared.work.outlinePages.length, message: '开始补全未完成或已失效的图片' } })
  await runPreparedGeneration(prepared, emit, { retryOnly: true })
}

export async function regenerateWorkImage(workId: string, pageIndex: number, model: SeedreamModel, size: SeedreamSize, promptMode: ImagePromptMode = imagePromptModes.short) {
  const prepared = await prepareGeneration(workId, model, size, promptMode)
  const page = prepared.work.outlinePages.find(item => item.index === pageIndex)
  if (!page) throw new Error('大纲中不存在该页面')
  await runPreparedGeneration(prepared, () => {}, { forcePageIndexes: [pageIndex] })
  return getWork(workId)
}
