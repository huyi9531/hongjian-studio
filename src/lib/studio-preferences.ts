export const textModels = {
  pro: 'doubao-seed-2-1-pro-260628',
  turbo: 'doubao-seed-2-1-turbo-260628',
} as const

export type TextModel = typeof textModels[keyof typeof textModels]

export const seedreamModels = {
  pro: 'doubao-seedream-5-0-pro-260628',
  standard: 'doubao-seedream-4-5-251128',
} as const

export type SeedreamModel = typeof seedreamModels[keyof typeof seedreamModels]
export type SeedreamSize = '1K' | '2K' | '4K'

export const imagePromptModes = {
  short: 'short',
  long: 'long',
} as const

export type ImagePromptMode = typeof imagePromptModes[keyof typeof imagePromptModes]

export function supportedSeedreamSizes(model: SeedreamModel): readonly SeedreamSize[] {
  return model === seedreamModels.pro ? ['1K', '2K'] : ['2K', '4K']
}

export function normalizeSeedreamModel(value: unknown): SeedreamModel {
  if (value === seedreamModels.pro || value === 'doubao-seedream-5-0-260128' || value === 'seedream-5-0-pro-260128') return seedreamModels.pro
  return seedreamModels.standard
}

export function normalizeTextModel(value: unknown): TextModel {
  return value === textModels.turbo ? textModels.turbo : textModels.pro
}

export function normalizeTextThinkingEnabled(value: unknown) {
  return value === true
}

export function normalizeImagePromptMode(value: unknown): ImagePromptMode {
  return value === imagePromptModes.long ? imagePromptModes.long : imagePromptModes.short
}
