import { beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({
  existing: [] as Array<Record<string, unknown>>,
  inserted: [] as Array<Record<string, unknown>>,
  upserted: [] as Array<Record<string, unknown>>,
  uploads: [] as Array<{ key: string; contentType: string }>,
  fetch: vi.fn(),
  publishability: 'publishable',
  getWorkCalls: 0,
  firstUnpublishableWork: {} as Record<string, unknown>,
}))

vi.mock('../db/index.server', () => ({
  db: {
    select: vi.fn(() => ({ from: vi.fn(() => ({ where: vi.fn(async () => state.existing) })) })),
    insert: vi.fn(() => ({ values: vi.fn(async (record: Record<string, unknown>) => { state.inserted.push(record) }) })),
  },
}))

vi.mock('../env.server', () => ({
  env: { AICONDUCTOR_API_KEY: 'test-key', XHS_PUBLISH_API_URL: 'https://publish.example.test', DATA_DIR: './data' },
}))

vi.mock('./r2.server', () => ({
  isR2Configured: vi.fn(() => true),
  uploadToR2: vi.fn(async (key: string, _body: Buffer, contentType: string) => {
    state.uploads.push({ key, contentType })
    return { url: `https://r2.example.test/${key}`, key }
  }),
}))

vi.mock('node:fs/promises', () => ({
  readFile: vi.fn(async () => Buffer.from('archived-image-bytes')),
}))

vi.mock('./work.server', () => ({
  getWork: vi.fn(async () => {
    state.getWorkCalls += 1
    if (state.publishability === 'unpublishable' && state.getWorkCalls === 1) {
      return state.firstUnpublishableWork
    }
    return {
      outlinePages: [{ index: 0, type: 'cover', content: '封面' }],
      images: state.publishability === 'unpublishable'
        ? [{ workId: 'work-id', pageIndex: 0, sourceUrl: `https://r2.example.test/${state.uploads.at(-1)?.key ?? 'temporary_365/redink/work-id/0-abc.png'}`, status: 'done', inputFingerprint: 'current', publicUrlStatus: 'available' }]
        : [{ workId: 'work-id', pageIndex: 0, sourceUrl: 'https://images.example.test/cover.png', status: 'done', inputFingerprint: 'current' }],
      publishability: 'publishable',
    }
  }),
  refreshWorkPublicUrlStatus: vi.fn(async () => undefined),
  setWorkStatus: vi.fn(async () => undefined),
  upsertImage: vi.fn(async (_workId: string, _pageIndex: number, payload: Record<string, unknown>) => { state.upserted.push(payload) }),
}))

import { publicationFingerprint, publishWork } from './publish.server'

describe('publishWork', () => {
  beforeEach(() => {
    state.existing = []
    state.inserted = []
    state.upserted = []
    state.uploads = []
    state.fetch.mockReset()
    state.publishability = 'publishable'
    state.getWorkCalls = 0
    state.firstUnpublishableWork = {
      id: 'work-id',
      outlinePages: [{ index: 0, type: 'cover', content: '封面' }],
      images: [{ workId: 'work-id', pageIndex: 0, sourceUrl: 'https://images.example.test/cover.png', status: 'done', inputFingerprint: 'current', archiveStatus: 'archived', archivePath: 'images/work-id/0.png', archiveMimeType: 'image/png', publicUrlStatus: 'unavailable' }],
      publishability: 'unpublishable',
    }
    state.fetch.mockResolvedValue(new Response(JSON.stringify({
      success: true,
      data: { id: 'publication-id', url: 'https://publish.example.test/note', qrcode: 'qr-code' },
      billing: { service_fee: 1, currency: 'CNY', transaction_id: 'transaction-id' },
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
    vi.stubGlobal('fetch', state.fetch)
  })

  it('always disables transfer in the provider payload and stored receipt', async () => {
    const receipt = await publishWork('work-id', '标题', '正文')
    const request = state.fetch.mock.calls.find(call => call[1]?.method === 'POST')?.[1] as RequestInit
    expect(JSON.parse(String(request.body))).toMatchObject({ type: 'normal', transfer_to_oss: false })
    expect(receipt.transferToOss).toBe(false)
    expect(state.inserted[0]).toMatchObject({ transferToOss: false })
  })

  it('reuses a legacy cached receipt without calling the paid endpoint', async () => {
    state.existing = [{ id: 'legacy-publication', fingerprint: publicationFingerprint('标题', '正文', ['https://images.example.test/cover.png'], true) }]
    const receipt = await publishWork('work-id', '标题', '正文')
    expect(receipt).toMatchObject({ id: 'legacy-publication', cached: true })
    expect(state.fetch.mock.calls.some(call => call[1]?.method === 'POST')).toBe(false)
  })

  it('uses a canonical fingerprint independent of the hidden transfer policy', () => {
    const images = ['https://images.example.test/cover.png']
    expect(publicationFingerprint('标题', '正文', images)).not.toBe(publicationFingerprint('标题', '正文', images, false))
    expect(publicationFingerprint('标题', '正文', images, false)).not.toBe(publicationFingerprint('标题', '正文', images, true))
  })

  it('does not call the paid endpoint when an image public URL has expired and no archive exists', async () => {
    state.publishability = 'unpublishable'
    state.firstUnpublishableWork = {
      outlinePages: [{ index: 0, type: 'cover', content: '封面' }],
      images: [{ workId: 'work-id', pageIndex: 0, sourceUrl: 'https://images.example.test/cover.png', status: 'done', inputFingerprint: 'current', archiveStatus: 'unavailable', publicUrlStatus: 'unavailable' }],
      publishability: 'unpublishable',
    }
    await expect(publishWork('work-id', '标题', '正文')).rejects.toThrow('公网链接已失效')
    expect(state.fetch.mock.calls.some(call => call[1]?.method === 'POST')).toBe(false)
  })

  it('re-uploads expired images to R2 from the local archive and publishes with the restored URLs', async () => {
    state.publishability = 'unpublishable'
    const receipt = await publishWork('work-id', '标题', '正文')
    expect(state.uploads).toHaveLength(1)
    expect(state.uploads[0].key).toMatch(/^temporary_365\/redink\/work-id\/0-[0-9a-f-]+\.png$/)
    expect(state.uploads[0].contentType).toBe('image/png')
    expect(state.upserted[0]).toMatchObject({ sourceUrl: expect.stringMatching(/^https:\/\/r2\.example\.test\/temporary_365\/redink\/work-id\/0-[0-9a-f-]+\.png$/), publicUrlStatus: 'available' })
    const request = state.fetch.mock.calls.find(call => call[1]?.method === 'POST')?.[1] as RequestInit
    const payload = JSON.parse(String(request.body)) as { images: string[] }
    expect(payload.images).toHaveLength(1)
    expect(payload.images[0]).toMatch(/^https:\/\/r2\.example\.test\/temporary_365\/redink\/work-id\/0-[0-9a-f-]+\.png$/)
    expect(receipt).toMatchObject({ cached: false, transferToOss: false })
  })
})
