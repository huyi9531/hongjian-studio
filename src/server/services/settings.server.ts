import '@tanstack/react-start/server-only'
import { eq } from 'drizzle-orm'
import { db } from '../db/index.server'
import { settings } from '../db/schema'
import { normalizeSeedreamModel, seedreamModels, supportedSeedreamSizes, type SeedreamModel, type SeedreamSize } from '@/lib/studio-preferences'

const studioPreferencesKey = 'studio_preferences'

export type StudioPreferences = {
  imageModel: SeedreamModel
  imageSize: SeedreamSize
}

export const defaultStudioPreferences: StudioPreferences = {
  imageModel: seedreamModels.pro,
  imageSize: '2K',
}

export async function getStudioPreferences(): Promise<StudioPreferences> {
  const [record] = await db.select().from(settings).where(eq(settings.key, studioPreferencesKey)).limit(1)
  if (!record) return defaultStudioPreferences
  const saved = record.value as Partial<StudioPreferences>
  const imageModel = normalizeSeedreamModel(saved.imageModel)
  const sizes = supportedSeedreamSizes(imageModel)
  const imageSize = saved.imageSize && sizes.includes(saved.imageSize) ? saved.imageSize : '2K'
  return { imageModel, imageSize }
}

export async function saveStudioPreferences(value: StudioPreferences) {
  await db.insert(settings).values({ key: studioPreferencesKey, value }).onConflictDoUpdate({
    target: settings.key,
    set: { value },
  })
  return value
}
