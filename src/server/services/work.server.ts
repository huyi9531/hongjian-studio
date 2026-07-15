import '@tanstack/react-start/server-only'
import { and, asc, desc, eq, like } from 'drizzle-orm'
import { randomUUID } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { extname, join } from 'node:path'
import { db } from '../db/index.server'
import { publications, workImages, workReferences, works } from '../db/schema'
import { env } from '../env.server'

export type OutlinePage = { index: number; type: 'cover' | 'content' | 'summary'; content: string }

export type ReferenceInput = { filename: string; mimeType: string; dataUrl: string }

export async function createWork(topic: string, pages: OutlinePage[], raw: string, references: ReferenceInput[] = []) {
  const now = new Date()
  const id = randomUUID()
  await db.insert(works).values({ id, topic, outlineRaw: raw, outlinePages: pages, status: 'outline', createdAt: now, updatedAt: now })
  if (references.length) {
    const directory = join(env.DATA_DIR, 'references', id)
    await mkdir(directory, { recursive: true })
    for (const reference of references) {
      const match = reference.dataUrl.match(/^data:([^;]+);base64,(.+)$/)
      if (!match) throw new Error('参考图片格式无效')
      const extension = extname(reference.filename).replace(/[^.a-zA-Z0-9]/g, '') || '.png'
      const archivePath = join('references', id, `${randomUUID()}${extension}`)
      await writeFile(join(env.DATA_DIR, archivePath), Buffer.from(match[2], 'base64'))
      await db.insert(workReferences).values({ id: randomUUID(), workId: id, filename: reference.filename, mimeType: match[1] || reference.mimeType, archivePath, createdAt: now })
    }
  }
  return id
}

export async function getWork(id: string) {
  const [work] = await db.select().from(works).where(eq(works.id, id))
  if (!work) throw new Error('作品不存在')
  const images = await db.select().from(workImages).where(eq(workImages.workId, id)).orderBy(asc(workImages.pageIndex))
  const references = await db.select().from(workReferences).where(eq(workReferences.workId, id)).orderBy(asc(workReferences.createdAt))
  const [publication] = await db.select().from(publications).where(eq(publications.workId, id)).orderBy(desc(publications.createdAt)).limit(1)
  return { ...work, images, references: references.map(({ archivePath: _archivePath, ...reference }) => reference), publication: publication ?? null }
}

export async function listWorks(query = '') {
  return query ? db.select().from(works).where(like(works.topic, `%${query}%`)).orderBy(desc(works.updatedAt)) : db.select().from(works).orderBy(desc(works.updatedAt))
}

export async function updateWork(id: string, payload: Partial<Pick<typeof works.$inferInsert, 'topic' | 'outlineRaw' | 'outlinePages' | 'titles' | 'selectedTitle' | 'copywriting' | 'tags' | 'status'>>) {
  await db.update(works).set({ ...payload, updatedAt: new Date() }).where(eq(works.id, id))
  return getWork(id)
}

export async function upsertImage(workId: string, pageIndex: number, data: Partial<Pick<typeof workImages.$inferInsert, 'sourceUrl' | 'archivePath' | 'status' | 'error'>>) {
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
