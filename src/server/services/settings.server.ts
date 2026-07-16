import '@tanstack/react-start/server-only'
import { eq } from 'drizzle-orm'
import { db } from '../db/index.server'
import { settings } from '../db/schema'
import { imagePromptModes, normalizeImagePromptMode, normalizeSeedreamModel, normalizeTextModel, seedreamModels, supportedSeedreamSizes, textModels, type ImagePromptMode, type SeedreamModel, type SeedreamSize, type TextModel } from '@/lib/studio-preferences'

const studioPreferencesKey = 'studio_preferences'
const modelCredentialsKey = 'model_credentials'

export type StudioPreferences = {
  textModel: TextModel
  imageModel: SeedreamModel
  imageSize: SeedreamSize
  imagePromptMode: ImagePromptMode
}

export const defaultStudioPreferences: StudioPreferences = {
  textModel: textModels.pro,
  imageModel: seedreamModels.pro,
  imageSize: '2K',
  imagePromptMode: imagePromptModes.short,
}

type ModelCredentials = {
  textApiKey: string
  imageApiKey: string
}

const emptyModelCredentials: ModelCredentials = { textApiKey: '', imageApiKey: '' }

export async function getStudioPreferences(): Promise<StudioPreferences> {
  const [record] = await db.select().from(settings).where(eq(settings.key, studioPreferencesKey)).limit(1)
  if (!record) return defaultStudioPreferences
  const saved = record.value as Partial<StudioPreferences>
  const textModel = normalizeTextModel(saved.textModel)
  const imageModel = normalizeSeedreamModel(saved.imageModel)
  const sizes = supportedSeedreamSizes(imageModel)
  const imageSize = saved.imageSize && sizes.includes(saved.imageSize) ? saved.imageSize : '2K'
  const imagePromptMode = normalizeImagePromptMode(saved.imagePromptMode)
  return { textModel, imageModel, imageSize, imagePromptMode }
}

export async function getModelCredentials(): Promise<ModelCredentials> {
  const [record] = await db.select().from(settings).where(eq(settings.key, modelCredentialsKey)).limit(1)
  if (!record) return emptyModelCredentials
  const saved = record.value as Partial<ModelCredentials>
  return {
    textApiKey: typeof saved.textApiKey === 'string' ? saved.textApiKey : '',
    imageApiKey: typeof saved.imageApiKey === 'string' ? saved.imageApiKey : '',
  }
}

export async function getModelCapabilities() {
  const credentials = await getModelCredentials()
  return { text: Boolean(credentials.textApiKey), image: Boolean(credentials.imageApiKey) }
}

export async function saveStudioPreferences(value: StudioPreferences, credentialUpdates: Partial<ModelCredentials> = {}) {
  await db.insert(settings).values({ key: studioPreferencesKey, value }).onConflictDoUpdate({
    target: settings.key,
    set: { value },
  })
  const currentCredentials = await getModelCredentials()
  const credentials = {
    textApiKey: credentialUpdates.textApiKey?.trim() || currentCredentials.textApiKey,
    imageApiKey: credentialUpdates.imageApiKey?.trim() || currentCredentials.imageApiKey,
  }
  await db.insert(settings).values({ key: modelCredentialsKey, value: credentials }).onConflictDoUpdate({
    target: settings.key,
    set: { value: credentials },
  })
  return { preferences: value, capabilities: { text: Boolean(credentials.textApiKey), image: Boolean(credentials.imageApiKey) } }
}
