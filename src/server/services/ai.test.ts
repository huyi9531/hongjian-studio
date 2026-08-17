import { beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({
  fetch: vi.fn(),
  uploads: [] as Array<{ key: string; bytes: Buffer; contentType: string }>,
  r2Configured: false,
  uploadError: null as Error | null,
  archivedBytes: Buffer.from('fake-png-bytes'),
}))

vi.mock('../env.server', () => ({
  env: { DATA_DIR: './data' },
}))

vi.mock('./settings.server', () => ({
  getModelCredentials: vi.fn(async () => ({ textApiKey: 'text-key', imageApiKey: 'image-key' })),
}))

vi.mock('node:fs/promises', () => ({
  mkdir: vi.fn(async () => undefined),
  writeFile: vi.fn(async (_path: string, bytes: Buffer) => { state.archivedBytes = Buffer.from(bytes) }),
  readFile: vi.fn(async () => state.archivedBytes),
}))

vi.mock('./r2.server', () => ({
  isR2Configured: vi.fn(() => state.r2Configured),
  uploadToR2: vi.fn(async (key: string, bytes: Buffer, contentType: string) => {
    if (state.uploadError) throw state.uploadError
    state.uploads.push({ key, bytes, contentType })
    return { url: `https://r2.example.test/${key}`, key }
  }),
}))

import { generateSeedreamImage } from './ai.server'

const arkImageBytes = Buffer.from('fake-png-bytes')

describe('generateSeedreamImage', () => {
  beforeEach(() => {
    state.fetch.mockReset()
    state.uploads = []
    state.r2Configured = false
    state.uploadError = null
    state.fetch
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: [{ url: 'https://ark.example.test/img.png' }] }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
      .mockResolvedValueOnce(new Response(arkImageBytes, { status: 200, headers: { 'Content-Type': 'image/png' } }))
    vi.stubGlobal('fetch', state.fetch)
  })

  it('keeps the provider URL when R2 is not configured', async () => {
    const result = await generateSeedreamImage('prompt', 'doubao-seedream-5-0-pro-260628', '2K', 'work-id', 0)
    expect(result.sourceUrl).toBe('https://ark.example.test/img.png')
    expect(result.archiveStatus).toBe('archived')
    expect(result.archiveMimeType).toBe('image/png')
    expect(state.uploads).toHaveLength(0)
  })

  it('uploads the archived bytes to R2 and returns the long-lived URL when configured', async () => {
    state.r2Configured = true
    const result = await generateSeedreamImage('prompt', 'doubao-seedream-5-0-pro-260628', '2K', 'work-id', 0)
    expect(result.sourceUrl).toMatch(/^https:\/\/r2\.example\.test\/temporary_365\/redink\/work-id\/0-[0-9a-f-]+\.png$/)
    expect(state.uploads).toHaveLength(1)
    expect(state.uploads[0].key).toMatch(/^temporary_365\/redink\/work-id\/0-[0-9a-f-]+\.png$/)
    expect(state.uploads[0].contentType).toBe('image/png')
    expect(state.uploads[0].bytes).toEqual(arkImageBytes)
  })

  it('fails the page when the R2 upload fails so it can be retried', async () => {
    state.r2Configured = true
    state.uploadError = new Error('R2 上传失败: 403')
    await expect(generateSeedreamImage('prompt', 'doubao-seedream-5-0-pro-260628', '2K', 'work-id', 0)).rejects.toThrow('R2 图片上传失败，请重试')
  })
})
