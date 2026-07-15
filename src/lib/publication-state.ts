export type PublicationSignatureInput = {
  title: string
  copywriting: string
  tags: string[]
  images: Array<{ index: number; url: string }>
}

export function publicationInputSignature(input: PublicationSignatureInput) {
  return JSON.stringify({
    title: input.title.trim(),
    copywriting: input.copywriting,
    tags: input.tags,
    images: [...input.images].sort((left, right) => left.index - right.index).map(image => [image.index, image.url]),
  })
}

export function publicationMatchesLatestWork(publicationCreatedAt: Date | null, workUpdatedAt: Date, imageUpdatedAt: Date[]) {
  if (!publicationCreatedAt) return false
  const latestUpdate = Math.max(workUpdatedAt.getTime(), ...imageUpdatedAt.map(value => value.getTime()))
  return publicationCreatedAt.getTime() >= latestUpdate
}
