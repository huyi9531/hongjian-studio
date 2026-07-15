import { describe, expect, it } from 'vitest'
import { publicationInputSignature, publicationMatchesLatestWork } from './publication-state'

describe('publication state', () => {
  const base = { title: '标题', copywriting: '正文', tags: ['标签'], images: [{ index: 0, url: 'https://example.test/0.png' }] }

  it('changes the signature when text or images change', () => {
    const signature = publicationInputSignature(base)
    expect(publicationInputSignature({ ...base, title: '新标题' })).not.toBe(signature)
    expect(publicationInputSignature({ ...base, copywriting: '新正文' })).not.toBe(signature)
    expect(publicationInputSignature({ ...base, tags: ['新标签'] })).not.toBe(signature)
    expect(publicationInputSignature({ ...base, images: [{ index: 0, url: 'https://example.test/new.png' }] })).not.toBe(signature)
  })

  it('treats an existing receipt as current only when it is newer than content and images', () => {
    const publication = new Date('2026-07-15T10:00:00Z')
    expect(publicationMatchesLatestWork(publication, new Date('2026-07-15T09:00:00Z'), [new Date('2026-07-15T09:30:00Z')])).toBe(true)
    expect(publicationMatchesLatestWork(publication, new Date('2026-07-15T10:01:00Z'), [])).toBe(false)
    expect(publicationMatchesLatestWork(publication, new Date('2026-07-15T09:00:00Z'), [new Date('2026-07-15T10:01:00Z')])).toBe(false)
  })
})
