import '@tanstack/react-start/server-only'
import { eq } from 'drizzle-orm'
import { db } from '../db/index.server'
import { settings } from '../db/schema'

const studioPreferencesKey = 'studio_preferences'

export type StudioPreferences = {
  imageModel: 'seedream-4-5-251128' | 'seedream-5-0-pro-260128'
  imageSize: '1K' | '2K' | '4K'
  transferToOss: boolean
}

export const defaultStudioPreferences: StudioPreferences = {
  imageModel: 'seedream-5-0-pro-260128',
  imageSize: '2K',
  transferToOss: true,
}

export async function getStudioPreferences(): Promise<StudioPreferences> {
  const [record] = await db.select().from(settings).where(eq(settings.key, studioPreferencesKey)).limit(1)
  return record ? { ...defaultStudioPreferences, ...(record.value as Partial<StudioPreferences>) } : defaultStudioPreferences
}

export async function saveStudioPreferences(value: StudioPreferences) {
  await db.insert(settings).values({ key: studioPreferencesKey, value }).onConflictDoUpdate({
    target: settings.key,
    set: { value },
  })
  return value
}
