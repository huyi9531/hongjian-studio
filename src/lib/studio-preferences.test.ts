import { describe, expect, it } from 'vitest'
import { normalizeSeedreamModel, normalizeTextModel, seedreamModels, supportedSeedreamSizes, textModels } from './studio-preferences'

describe('Seedream preferences', () => {
  it('supports both Doubao Seed 2.1 text models and defaults to Pro', () => {
    expect(textModels.pro).toBe('doubao-seed-2-1-pro-260628')
    expect(textModels.turbo).toBe('doubao-seed-2-1-turbo-260628')
    expect(normalizeTextModel(textModels.turbo)).toBe(textModels.turbo)
    expect(normalizeTextModel('unknown')).toBe(textModels.pro)
  })

  it('uses the official Ark model identifiers', () => {
    expect(seedreamModels.standard).toBe('doubao-seedream-4-5-251128')
    expect(seedreamModels.pro).toBe('doubao-seedream-5-0-pro-260628')
  })

  it('migrates identifiers saved by the initial rewrite', () => {
    expect(normalizeSeedreamModel('seedream-4-5-251128')).toBe(seedreamModels.standard)
    expect(normalizeSeedreamModel('seedream-5-0-pro-260128')).toBe(seedreamModels.pro)
    expect(normalizeSeedreamModel('doubao-seedream-5-0-260128')).toBe(seedreamModels.pro)
  })

  it('limits sizes by model', () => {
    expect(supportedSeedreamSizes(seedreamModels.standard)).toEqual(['2K', '4K'])
    expect(supportedSeedreamSizes(seedreamModels.pro)).toEqual(['1K', '2K'])
  })
})
