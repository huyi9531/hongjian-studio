import { beforeEach, describe, expect, it, vi } from 'vitest'

const pages = [
  { index: 0, type: 'cover' as const, content: '[封面] 主题' },
  { index: 1, type: 'content' as const, content: '[内容] 第一页' },
  { index: 2, type: 'summary' as const, content: '[总结] 收尾' },
]

const state = vi.hoisted(() => ({
  images: new Map<number, { id: string; pageIndex: number; sourceUrl: string | null; archivePath: string | null; status: string; error: string | null; inputFingerprint: string | null }>(),
  status: 'outline',
  generate: vi.fn(),
  claims: 0,
}))

vi.mock('../db/index.server', () => ({
  db: {
    insert: vi.fn(() => ({ values: vi.fn(() => ({ onConflictDoUpdate: vi.fn(() => ({ returning: vi.fn(async () => ++state.claims === 1 ? [{ id: 'job-id' }] : []) })) })) })),
    select: vi.fn(() => ({ from: vi.fn(() => ({ where: vi.fn(() => ({ limit: vi.fn(async () => [{ id: 'running-job', status: 'running' }]) })) })) })),
    update: vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn(async () => {}) })) })),
  },
}))

vi.mock('./ai.server', () => ({
  generateSeedreamImage: state.generate,
}))

vi.mock('./work.server', () => ({
  getReferenceDataUrls: vi.fn(async () => ['data:image/png;base64,user']),
  getWork: vi.fn(async () => ({
    id: '11111111-1111-4111-8111-111111111111',
    topic: '测试主题',
    outlineRaw: '完整大纲',
    outlinePages: pages,
    images: [...state.images.values()],
    status: state.status,
  })),
  updateWork: vi.fn(async (_id: string, payload: { status?: string }) => {
    if (payload.status) state.status = payload.status
  }),
  setWorkStatus: vi.fn(async (_id: string, status: string) => { state.status = status }),
  upsertImage: vi.fn(async (_id: string, pageIndex: number, payload: { sourceUrl?: string | null; archivePath?: string | null; status?: string; error?: string | null; inputFingerprint?: string | null }) => {
    const current = state.images.get(pageIndex)
    state.images.set(pageIndex, {
      id: current?.id ?? `image-${pageIndex}`,
      pageIndex,
      sourceUrl: payload.sourceUrl === undefined ? current?.sourceUrl ?? null : payload.sourceUrl,
      archivePath: payload.archivePath === undefined ? current?.archivePath ?? null : payload.archivePath,
      status: payload.status ?? current?.status ?? 'pending',
      error: payload.error === undefined ? current?.error ?? null : payload.error,
      inputFingerprint: payload.inputFingerprint === undefined ? current?.inputFingerprint ?? null : payload.inputFingerprint,
    })
  }),
}))

import { GenerationInProgressError, generateWorkImages, prepareGeneration } from './generation.server'

describe('generateWorkImages', () => {
  beforeEach(() => {
    state.images.clear()
    state.status = 'outline'
    state.claims = 0
    state.generate.mockReset()
    state.generate.mockImplementation(async (_prompt: string, _model: string, _size: string, _workId: string, pageIndex: number) => ({ sourceUrl: `https://example.com/${pageIndex}.png`, archivePath: `images/${pageIndex}.png` }))
  })

  it('generates the cover first and passes it to content pages as the last reference', async () => {
    const events: Array<{ event: string; data: Record<string, unknown> }> = []
    await generateWorkImages('11111111-1111-4111-8111-111111111111', 'doubao-seedream-5-0-pro-260628', '2K', event => events.push(event))

    expect(state.generate).toHaveBeenCalledTimes(3)
    expect(state.generate.mock.calls[0][4]).toBe(0)
    expect(state.generate.mock.calls[0][5]).toEqual(['data:image/png;base64,user'])
    expect(state.generate.mock.calls[1][5]).toEqual(['data:image/png;base64,user', 'https://example.com/0.png'])
    expect(events.at(-1)).toMatchObject({ event: 'finish', data: { success: true, completed: 3, failed: 0 } })
    expect(state.status).toBe('result')
  })

  it('uses the short image prompt by default and supports the long prompt mode', async () => {
    await generateWorkImages('11111111-1111-4111-8111-111111111111', 'doubao-seedream-5-0-pro-260628', '2K', () => {})
    expect(state.generate.mock.calls[0][0]).toContain('页面内容')
    expect(state.generate.mock.calls[0][0]).not.toContain('完整内容大纲')

    state.images.clear()
    state.status = 'outline'
    state.claims = 0
    state.generate.mockClear()
    await generateWorkImages('11111111-1111-4111-8111-111111111111', 'doubao-seedream-5-0-pro-260628', '2K', () => {}, false, 'long')
    expect(state.generate.mock.calls[0][0]).toContain('完整内容大纲')
    expect(state.generate.mock.calls[0][0]).toContain('测试主题')
  })

  it('keeps partial failures retryable and does not mark the work as result', async () => {
    state.generate.mockImplementation(async (_prompt: string, _model: string, _size: string, _workId: string, pageIndex: number) => {
      if (pageIndex === 1) throw new Error('上游限流')
      return { sourceUrl: `https://example.com/${pageIndex}.png`, archivePath: `images/${pageIndex}.png` }
    })
    const events: Array<{ event: string; data: Record<string, unknown> }> = []
    await generateWorkImages('11111111-1111-4111-8111-111111111111', 'doubao-seedream-5-0-pro-260628', '2K', event => events.push(event))

    expect(events).toContainEqual(expect.objectContaining({ event: 'error', data: expect.objectContaining({ index: 1, retryable: true }) }))
    expect(events.at(-1)).toMatchObject({ event: 'finish', data: { success: false, completed: 2, failed: 1 } })
    expect(state.status).toBe('partial_failed')
  })

  it('does not trust legacy images that lack an input fingerprint', async () => {
    state.images.set(0, { id: 'image-0', pageIndex: 0, sourceUrl: 'https://example.com/0.png', archivePath: 'images/0.png', status: 'done', error: null, inputFingerprint: null })
    const events: Array<{ event: string; data: Record<string, unknown> }> = []
    await generateWorkImages('11111111-1111-4111-8111-111111111111', 'doubao-seedream-5-0-pro-260628', '2K', event => events.push(event))

    expect(state.generate).toHaveBeenCalledTimes(3)
    expect(events.at(-1)).toMatchObject({ event: 'finish', data: { success: true, completed: 3, failed: 0 } })
  })

  it('rejects a second task claim before another paid request starts', async () => {
    await prepareGeneration('11111111-1111-4111-8111-111111111111', 'doubao-seedream-5-0-pro-260628', '2K')
    await expect(prepareGeneration('11111111-1111-4111-8111-111111111111', 'doubao-seedream-5-0-pro-260628', '2K')).rejects.toBeInstanceOf(GenerationInProgressError)
    expect(state.generate).not.toHaveBeenCalled()
  })
})
