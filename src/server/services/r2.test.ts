import { createHash } from 'node:crypto'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({
  fetch: vi.fn(),
  env: {
    R2_ACCESS_KEY_ID: 'access-key',
    R2_SECRET_ACCESS_KEY: 'secret-key',
    R2_ENDPOINT: 'https://bucket.example.r2.cloudflarestorage.com',
    R2_BUCKET_NAME: 'bucket',
    R2_REGION: 'auto',
    R2_PUBLIC_URL: 'https://pub.example.r2.dev',
  } as Record<string, string | undefined>,
}))

vi.mock('../env.server', () => ({ env: state.env }))

import { isR2Configured, r2PublicUrl, uploadToR2 } from './r2.server'

describe('r2', () => {
  beforeEach(() => {
    state.fetch.mockReset()
    state.fetch.mockResolvedValue(new Response(null, { status: 200 }))
    vi.stubGlobal('fetch', state.fetch)
  })

  it('isR2Configured requires all connection fields', () => {
    expect(isR2Configured()).toBe(true)
    const bucket = state.env.R2_BUCKET_NAME
    state.env.R2_BUCKET_NAME = undefined
    expect(isR2Configured()).toBe(false)
    state.env.R2_BUCKET_NAME = bucket
  })

  it('builds the public URL from the configured base', () => {
    expect(r2PublicUrl('temporary_365/redink/w/0-a.png')).toBe('https://pub.example.r2.dev/temporary_365/redink/w/0-a.png')
  })

  it('uploads via a SigV4-signed PUT request to the bucket path', async () => {
    const body = Buffer.from('archived-image-bytes')
    const { url, key } = await uploadToR2('temporary_365/redink/work-id/0-abc.png', body, 'image/png')
    expect(url).toBe('https://pub.example.r2.dev/temporary_365/redink/work-id/0-abc.png')
    const [requestUrl, init] = state.fetch.mock.calls[0] as [string, RequestInit]
    expect(requestUrl).toBe('https://bucket.example.r2.cloudflarestorage.com/bucket/temporary_365/redink/work-id/0-abc.png')
    expect(init.method).toBe('PUT')
    expect(init.body).toEqual(new Uint8Array(body))
    const headers = init.headers as Record<string, string>
    expect(headers['Content-Type']).toBe('image/png')
    expect(headers['X-Amz-Content-Sha256']).toBe(createHash('sha256').update(body).digest('hex'))
    expect(headers['X-Amz-Date']).toMatch(/^\d{8}T\d{6}Z$/)
    expect(headers.Authorization).toMatch(/^AWS4-HMAC-SHA256 Credential=access-key\/\d{8}\/auto\/s3\/aws4_request, SignedHeaders=content-type;host;x-amz-content-sha256;x-amz-date, Signature=[0-9a-f]{64}$/)
  })

  it('throws when the upload is rejected', async () => {
    state.fetch.mockResolvedValue(new Response('signature mismatch', { status: 403 }))
    await expect(uploadToR2('temporary_365/redink/w/0-a.png', Buffer.from('x'), 'image/png')).rejects.toThrow('R2 上传失败: 403')
  })
})
