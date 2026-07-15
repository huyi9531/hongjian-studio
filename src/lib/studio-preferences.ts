export const seedreamModels = {
  pro: 'doubao-seedream-5-0-260128',
  standard: 'doubao-seedream-4-5-251128',
} as const

export type SeedreamModel = typeof seedreamModels[keyof typeof seedreamModels]
export type SeedreamSize = '1K' | '2K' | '4K'

export function supportedSeedreamSizes(model: SeedreamModel): readonly SeedreamSize[] {
  return model === seedreamModels.pro ? ['1K', '2K'] : ['2K', '4K']
}

export function normalizeSeedreamModel(value: unknown): SeedreamModel {
  if (value === seedreamModels.pro || value === 'seedream-5-0-pro-260128') return seedreamModels.pro
  return seedreamModels.standard
}
