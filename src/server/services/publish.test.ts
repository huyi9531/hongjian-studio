import { beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({
  existing: [] as Array<Record<string, unknown>>,
  inserted: [] as Array<Record<string, unknown>>,
  fetch: vi.fn(),
}))

vi.mock('../db/index.server', () => ({
  db: {
    select: vi.fn(() => ({ from: vi.fn(() => ({ where: vi.fn(async () => state.existing) })) })),
    insert: vi.fn(() => ({ values: vi.fn(async (record: Record<string, unknown>) => { state.inserted.push(record) }) })),
  },
}))

vi.mock('../env.server', () => ({
  env: { AICONDUCTOR_API_KEY: 'test-key', XHS_PUBLISH_API_URL: 'https://publish.example.test' },
}))

vi.mock('./work.server', () => ({
  getWork: vi.fn(async () => ({ images: [{ sourceUrl: 'https://images.example.test/cover.png' }] })),
}))

import { publicationFingerprint, publishWork } from './publish.server'

describe('publishWork', () => {
  beforeEach(() => {
    state.existing = []
    state.inserted = []
    state.fetch.mockReset()
    state.fetch.mockResolvedValue(new Response(JSON.stringify({
      success: true,
      data: { id: 'publication-id', url: 'https://publish.example.test/note', qrcode: 'qr-code' },
      billing: { service_fee: 1, currency: 'CNY', transaction_id: 'transaction-id' },
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
    vi.stubGlobal('fetch', state.fetch)
  })

  it('always disables transfer in the provider payload and stored receipt', async () => {
    const receipt = await publishWork('work-id', '标题', '正文')
    const request = state.fetch.mock.calls[0]?.[1] as RequestInit
    expect(JSON.parse(String(request.body))).toMatchObject({ type: 'normal', transfer_to_oss: false })
    expect(receipt.transferToOss).toBe(false)
    expect(state.inserted[0]).toMatchObject({ transferToOss: false })
  })

  it('reuses a legacy cached receipt without calling the paid endpoint', async () => {
    state.existing = [{ id: 'legacy-publication', fingerprint: publicationFingerprint('标题', '正文', ['https://images.example.test/cover.png'], true) }]
    const receipt = await publishWork('work-id', '标题', '正文')
    expect(receipt).toMatchObject({ id: 'legacy-publication', cached: true })
    expect(state.fetch).not.toHaveBeenCalled()
  })

  it('uses a canonical fingerprint independent of the hidden transfer policy', () => {
    const images = ['https://images.example.test/cover.png']
    expect(publicationFingerprint('标题', '正文', images)).not.toBe(publicationFingerprint('标题', '正文', images, false))
    expect(publicationFingerprint('标题', '正文', images, false)).not.toBe(publicationFingerprint('标题', '正文', images, true))
  })
})
