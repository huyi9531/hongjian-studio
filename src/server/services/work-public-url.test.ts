import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('../db/index.server', () => ({ db: {} }))
vi.mock('../env.server', () => ({ env: { DATA_DIR: './data' } }))

import { checkPublicUrl } from './work.server'

afterEach(() => vi.unstubAllGlobals())

describe('checkPublicUrl', () => {
  it('accepts an image URL when its CDN rejects HEAD but serves a range GET', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response('', { status: 403 }))
      .mockResolvedValueOnce(new Response('x', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(checkPublicUrl('https://images.example.test/signed.png')).resolves.toBe('available')
    expect(fetchMock).toHaveBeenNthCalledWith(2, 'https://images.example.test/signed.png', expect.objectContaining({ headers: expect.objectContaining({ Range: 'bytes=0-0' }) }))
  })

  it('marks the URL unavailable only when the GET check also returns 4xx', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(new Response('', { status: 404 }))
      .mockResolvedValueOnce(new Response('', { status: 404 })))

    await expect(checkPublicUrl('https://images.example.test/expired.png')).resolves.toBe('unavailable')
  })
})
