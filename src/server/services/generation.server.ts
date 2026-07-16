import '@tanstack/react-start/server-only'
import { imagePromptModes, type ImagePromptMode, type SeedreamModel, type SeedreamSize } from '@/lib/studio-preferences'
import { generateSeedreamImage } from './ai.server'
import { getReferenceDataUrls, getWork, updateWork, upsertImage, type OutlinePage } from './work.server'

export type GenerationEvent = {
  event: 'progress' | 'complete' | 'error' | 'finish' | 'retry_start' | 'retry_finish'
  data: Record<string, unknown>
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

async function generatePage(workId: string, page: OutlinePage, model: SeedreamModel, size: SeedreamSize, references: string[], promptMode: ImagePromptMode) {
  await upsertImage(workId, page.index, { status: 'generating', error: null })
  try {
    const work = await getWork(workId)
    const generated = await generateSeedreamImage(buildImagePrompt(page, work.topic, work.outlineRaw, promptMode), model, size, workId, page.index, references)
    await upsertImage(workId, page.index, { status: 'done', error: null, ...generated })
    const refreshed = await getWork(workId)
    const image = refreshed.images.find(item => item.pageIndex === page.index)
    return { ok: true as const, image }
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause)
    await upsertImage(workId, page.index, { status: 'error', error: message })
    return { ok: false as const, message }
  }
}

async function runConcurrent<T>(items: T[], limit: number, task: (item: T) => Promise<void>) {
  let cursor = 0
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const item = items[cursor]
      cursor += 1
      if (item !== undefined) await task(item)
    }
  })
  await Promise.all(workers)
}

function doneEvent(index: number, imageId?: string, phase = 'content', cached = false): GenerationEvent {
  return { event: 'complete', data: { index, status: 'done', image_url: imageId ? `/api/work-images/${imageId}` : undefined, phase, cached } }
}

function errorEvent(index: number, message: string, phase = 'content', cached = false): GenerationEvent {
  return { event: 'error', data: { index, status: 'error', message, retryable: true, phase, cached } }
}

export async function generateWorkImages(workId: string, model: SeedreamModel, size: SeedreamSize, emit: (event: GenerationEvent) => void, force = false, promptMode: ImagePromptMode = imagePromptModes.short) {
  const work = await getWork(workId)
  const completedImages = work.images.filter(image => image.status === 'done')
  if (!force && completedImages.length) {
    for (const page of work.outlinePages) {
      const image = work.images.find(item => item.pageIndex === page.index)
      emit(image?.status === 'done' ? doneEvent(page.index, image.id, 'cached', true) : errorEvent(page.index, image?.error || '历史记录中缺少该页图片，可手动补全', 'cached', true))
    }
    const failed = work.outlinePages.length - completedImages.length
    emit({ event: 'finish', data: { success: failed === 0, task_id: workId, total: work.outlinePages.length, completed: completedImages.length, failed, failed_indices: work.outlinePages.filter(page => !completedImages.some(image => image.pageIndex === page.index)).map(page => page.index), cached: true } })
    return
  }

  await updateWork(workId, { status: 'generating' })
  for (const page of work.outlinePages) await upsertImage(workId, page.index, { status: 'pending', error: null, ...(force ? { sourceUrl: null, archivePath: null } : {}) })
  const userReferences = await getReferenceDataUrls(workId)
  const cover = work.outlinePages.find(page => page.type === 'cover') ?? work.outlinePages[0]
  const otherPages = work.outlinePages.filter(page => page.index !== cover?.index)
  let coverReference: string | undefined
  let completed = 0
  const failedIndices: number[] = []

  if (cover) {
    emit({ event: 'progress', data: { index: cover.index, status: 'generating', message: '正在生成封面...', current: 1, total: work.outlinePages.length, phase: 'cover' } })
    const result = await generatePage(workId, cover, model, size, userReferences, promptMode)
    if (result.ok) {
      completed += 1
      coverReference = result.image?.sourceUrl ?? undefined
      emit(doneEvent(cover.index, result.image?.id, 'cover'))
    } else {
      failedIndices.push(cover.index)
      emit(errorEvent(cover.index, result.message, 'cover'))
    }
  }

  if (otherPages.length) {
    emit({ event: 'progress', data: { status: 'batch_start', message: `开始并发生成 ${otherPages.length} 页内容...`, current: completed, total: work.outlinePages.length, phase: 'content' } })
    for (const page of otherPages) emit({ event: 'progress', data: { index: page.index, status: 'generating', current: completed + 1, total: work.outlinePages.length, phase: 'content' } })
    await runConcurrent(otherPages, 3, async page => {
      const result = await generatePage(workId, page, model, size, [...userReferences, ...(coverReference ? [coverReference] : [])], promptMode)
      if (result.ok) {
        completed += 1
        emit(doneEvent(page.index, result.image?.id))
      } else {
        failedIndices.push(page.index)
        emit(errorEvent(page.index, result.message))
      }
    })
  }

  if (!failedIndices.length) await updateWork(workId, { status: 'result' })
  emit({ event: 'finish', data: { success: failedIndices.length === 0, task_id: workId, total: work.outlinePages.length, completed, failed: failedIndices.length, failed_indices: failedIndices } })
}

export async function retryFailedWorkImages(workId: string, model: SeedreamModel, size: SeedreamSize, emit: (event: GenerationEvent) => void, promptMode: ImagePromptMode = imagePromptModes.short) {
  const work = await getWork(workId)
  const pages = work.outlinePages.filter(page => work.images.find(image => image.pageIndex === page.index)?.status !== 'done')
  emit({ event: 'retry_start', data: { total: pages.length, message: `开始重试 ${pages.length} 张失败的图片` } })
  const references = await getReferenceDataUrls(workId)
  const coverPage = work.outlinePages.find(page => page.type === 'cover') ?? work.outlinePages[0]
  const coverImage = work.images.find(image => image.pageIndex === coverPage?.index && image.status === 'done')?.sourceUrl
  let completed = 0
  let failed = 0
  await runConcurrent(pages, 3, async page => {
    const result = await generatePage(workId, page, model, size, [...references, ...(coverImage && page.index !== coverPage?.index ? [coverImage] : [])], promptMode)
    if (result.ok) {
      completed += 1
      emit(doneEvent(page.index, result.image?.id))
    } else {
      failed += 1
      emit(errorEvent(page.index, result.message))
    }
  })
  if (!failed) await updateWork(workId, { status: 'result' })
  emit({ event: 'retry_finish', data: { success: failed === 0, total: pages.length, completed, failed } })
}

export async function regenerateWorkImage(workId: string, pageIndex: number, model: SeedreamModel, size: SeedreamSize, promptMode: ImagePromptMode = imagePromptModes.short) {
  const work = await getWork(workId)
  const page = work.outlinePages.find(item => item.index === pageIndex)
  if (!page) throw new Error('大纲中不存在该页面')
  const references = await getReferenceDataUrls(workId)
  const coverPage = work.outlinePages.find(item => item.type === 'cover') ?? work.outlinePages[0]
  const coverImage = work.images.find(image => image.pageIndex === coverPage?.index && image.status === 'done')?.sourceUrl
  const result = await generatePage(workId, page, model, size, [...references, ...(coverImage && page.index !== coverPage?.index ? [coverImage] : [])], promptMode)
  if (!result.ok) throw new Error(result.message)
  return getWork(workId)
}
