import '@tanstack/react-start/server-only'
import { and, asc, desc, eq, inArray, like, notInArray } from 'drizzle-orm'
import { randomUUID } from 'node:crypto'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { extname, join, resolve, sep } from 'node:path'
import { db } from '../db/index.server'
import { generationJobs, publications, workImages, workReferences, works } from '../db/schema'
import { env } from '../env.server'

export type OutlinePage = { index: number; type: 'cover' | 'content' | 'summary'; content: string }

export type ReferenceInput = { filename: string; mimeType: string; dataUrl: string }

export async function createWork(topic: string, pages: OutlinePage[], raw: string, references: ReferenceInput[] = []) {
  const now = new Date()
  const id = randomUUID()
  const preparedReferences = references.map(reference => {
    const match = reference.dataUrl.match(/^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/)
    if (!match) throw new Error('参考图片格式无效')
    const extension = extname(reference.filename).replace(/[^.a-zA-Z0-9]/g, '') || '.png'
    return { ...reference, mimeType: match[1], bytes: Buffer.from(match[2], 'base64'), archivePath: join('references', id, `${randomUUID()}${extension}`) }
  })

  try {
    await db.insert(works).values({ id, topic, outlineRaw: raw, outlinePages: pages, status: 'outline', createdAt: now, updatedAt: now })
    if (preparedReferences.length) {
      await mkdir(join(env.DATA_DIR, 'references', id), { recursive: true })
      for (const reference of preparedReferences) {
        await writeFile(join(env.DATA_DIR, reference.archivePath), reference.bytes)
        await db.insert(workReferences).values({ id: randomUUID(), workId: id, filename: reference.filename, mimeType: reference.mimeType, archivePath: reference.archivePath, createdAt: now })
      }
    }
  } catch (cause) {
    await Promise.allSettled([
      db.delete(workReferences).where(eq(workReferences.workId, id)),
      db.delete(works).where(eq(works.id, id)),
      rm(join(env.DATA_DIR, 'references', id), { recursive: true, force: true }),
    ])
    throw new Error('创建作品时保存参考图片失败', { cause })
  }
  return id
}

export async function getWork(id: string) {
  const [work] = await db.select().from(works).where(eq(works.id, id))
  if (!work) throw new Error('作品不存在')
  const images = await db.select().from(workImages).where(eq(workImages.workId, id)).orderBy(asc(workImages.pageIndex))
  const references = await db.select().from(workReferences).where(eq(workReferences.workId, id)).orderBy(asc(workReferences.createdAt))
  const [publication] = await db.select().from(publications).where(eq(publications.workId, id)).orderBy(desc(publications.createdAt)).limit(1)
  const [generationJob] = await db.select().from(generationJobs).where(eq(generationJobs.workId, id)).limit(1)
  return { ...work, images, references: references.map(({ archivePath: _archivePath, ...reference }) => reference), publication: publication ?? null, generationJob: generationJob ?? null }
}

export async function listWorks(query = '') {
  const items = query ? await db.select().from(works).where(like(works.topic, `%${query}%`)).orderBy(desc(works.updatedAt)) : await db.select().from(works).orderBy(desc(works.updatedAt))
  if (!items.length) return []
  const [images, jobs, publicationRows] = await Promise.all([
    db.select({ id: workImages.id, workId: workImages.workId, pageIndex: workImages.pageIndex, sourceUrl: workImages.sourceUrl, archivePath: workImages.archivePath, status: workImages.status, inputFingerprint: workImages.inputFingerprint }).from(workImages).where(inArray(workImages.workId, items.map(item => item.id))),
    db.select().from(generationJobs).where(inArray(generationJobs.workId, items.map(item => item.id))),
    db.select().from(publications).where(inArray(publications.workId, items.map(item => item.id))),
  ])
  const covers = images
    .filter(image => image.pageIndex === 0 && image.status === 'done')
  const coverByWork = new Map(covers.map(cover => [cover.workId, cover.archivePath ? `/api/work-images/${cover.id}` : cover.sourceUrl ?? '']))
  const imagesByWork = new Map(items.map(item => [item.id, images.filter(image => image.workId === item.id)]))
  const jobsByWork = new Map(jobs.map(job => [job.workId, job]))
  const publicationByWork = new Map(publicationRows.map(publication => [publication.workId, publication]))
  return items.map(item => {
    const workImagesForItem = imagesByWork.get(item.id) ?? []
    const job = jobsByWork.get(item.id)
    const publication = publicationByWork.get(item.id)
    const currentImages = workImagesForItem.length === item.outlinePages.length && workImagesForItem.every(image => image.status === 'done' && Boolean(image.inputFingerprint))
    const published = publication && publication.createdAt >= item.updatedAt
    const status = published ? 'published' : job?.status === 'running' ? 'generating' : job?.status === 'partial_failed' || item.status === 'partial_failed' ? 'partial_failed' : item.status === 'unpublishable' ? 'unpublishable' : currentImages ? 'publishable' : item.status === 'result' ? 'unpublishable' : item.status
    return { ...item, status, coverImageUrl: coverByWork.get(item.id) ?? '' }
  })
}

export async function deleteWork(id: string) {
  const [existing] = await db.select({ id: works.id }).from(works).where(eq(works.id, id)).limit(1)
  if (!existing) throw new Error('作品不存在或已被删除')

  const dataRoot = resolve(env.DATA_DIR)
  const directories = [resolve(dataRoot, 'images', id), resolve(dataRoot, 'references', id)]
  if (directories.some(directory => !directory.startsWith(`${dataRoot}${sep}`))) throw new Error('作品已删除，但归档目录校验失败')
  try { await Promise.all(directories.map(directory => rm(directory, { recursive: true, force: true }))) }
  catch (cause) { throw new Error('归档文件清理失败，作品尚未删除', { cause }) }

  db.transaction(tx => {
    tx.delete(publications).where(eq(publications.workId, id)).run()
    tx.delete(generationJobs).where(eq(generationJobs.workId, id)).run()
    tx.delete(workReferences).where(eq(workReferences.workId, id)).run()
    tx.delete(workImages).where(eq(workImages.workId, id)).run()
    tx.delete(works).where(eq(works.id, id)).run()
  })
}

export async function updateWork(id: string, payload: Partial<Pick<typeof works.$inferInsert, 'topic' | 'outlineRaw' | 'outlinePages' | 'titles' | 'selectedTitle' | 'copywriting' | 'tags' | 'status'>>) {
  if (payload.outlinePages) {
    const [current] = await db.select({ outlinePages: works.outlinePages, status: works.status }).from(works).where(eq(works.id, id)).limit(1)
    if (!current) throw new Error('作品不存在')
    const [generationJob] = await db.select({ status: generationJobs.status }).from(generationJobs).where(eq(generationJobs.workId, id)).limit(1)
    if (current.status === 'generating' || generationJob?.status === 'running') throw new Error('图片正在生成，暂时不能修改大纲')
    if (current.status === 'result') throw new Error('请先点击“编辑大纲”后再修改页面')
    const pageIndexes = payload.outlinePages.map(page => page.index)
    await db.delete(workImages).where(and(eq(workImages.workId, id), notInArray(workImages.pageIndex, pageIndexes)))
    const oldByIndex = new Map(current.outlinePages.map(page => [page.index, page]))
    const changedIndexes = payload.outlinePages.filter(page => {
      const previous = oldByIndex.get(page.index)
      return !previous || previous.content !== page.content || previous.type !== page.type
    }).map(page => page.index)
    if (changedIndexes.length) await db.update(workImages).set({ status: 'pending', error: null, inputFingerprint: null, updatedAt: new Date() }).where(and(eq(workImages.workId, id), inArray(workImages.pageIndex, changedIndexes)))
  }
  await db.update(works).set({ ...payload, updatedAt: new Date() }).where(eq(works.id, id))
  return getWork(id)
}

export async function upsertImage(workId: string, pageIndex: number, data: Partial<Pick<typeof workImages.$inferInsert, 'sourceUrl' | 'archivePath' | 'status' | 'error' | 'inputFingerprint'>>) {
  const now = new Date()
  const [existing] = await db.select().from(workImages).where(and(eq(workImages.workId, workId), eq(workImages.pageIndex, pageIndex)))
  if (existing) await db.update(workImages).set({ ...data, updatedAt: now }).where(eq(workImages.id, existing.id))
  else await db.insert(workImages).values({ id: randomUUID(), workId, pageIndex, status: data.status ?? 'pending', sourceUrl: data.sourceUrl, archivePath: data.archivePath, error: data.error, createdAt: now, updatedAt: now })
}

export async function getReferenceDataUrls(workId: string) {
  const references = await db.select().from(workReferences).where(eq(workReferences.workId, workId)).orderBy(asc(workReferences.createdAt))
  return Promise.all(references.map(async reference => {
    const bytes = await readFile(join(env.DATA_DIR, reference.archivePath))
    return `data:${reference.mimeType};base64,${bytes.toString('base64')}`
  }))
}

export async function getImageRecord(imageId: string) {
  const [image] = await db.select().from(workImages).where(eq(workImages.id, imageId)).limit(1)
  if (!image) throw new Error('图片不存在')
  return image
}
