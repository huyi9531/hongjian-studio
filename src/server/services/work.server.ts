import '@tanstack/react-start/server-only'
import { and, asc, desc, eq, like } from 'drizzle-orm'
import { randomUUID } from 'node:crypto'
import { db } from '../db/index.server'
import { publications, workImages, works } from '../db/schema'

export type OutlinePage = { index: number; type: 'cover' | 'content' | 'summary'; content: string }

export async function createWork(topic: string, pages: OutlinePage[], raw: string) {
  const now = new Date()
  const id = randomUUID()
  await db.insert(works).values({ id, topic, outlineRaw: raw, outlinePages: pages, createdAt: now, updatedAt: now })
  return id
}

export async function getWork(id: string) {
  const [work] = await db.select().from(works).where(eq(works.id, id))
  if (!work) throw new Error('作品不存在')
  const images = await db.select().from(workImages).where(eq(workImages.workId, id)).orderBy(asc(workImages.pageIndex))
  const [publication] = await db.select().from(publications).where(eq(publications.workId, id)).orderBy(desc(publications.createdAt)).limit(1)
  return { ...work, images, publication: publication ?? null }
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
