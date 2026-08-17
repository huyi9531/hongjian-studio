import '@tanstack/react-start/server-only'
import { createHash, createHmac } from 'node:crypto'
import { env } from '../env.server'

export function isR2Configured() {
  return Boolean(env.R2_ACCESS_KEY_ID && env.R2_SECRET_ACCESS_KEY && env.R2_ENDPOINT && env.R2_BUCKET_NAME)
}

export function r2PublicUrl(key: string) {
  const base = env.R2_PUBLIC_URL?.replace(/\/+$/, '')
  return `${base}/${key}`
}

export async function uploadToR2(key: string, body: Buffer, contentType: string) {
  if (!isR2Configured()) throw new Error('R2 存储未配置')
  const endpoint = env.R2_ENDPOINT!.replace(/\/+$/, '')
  const bucket = env.R2_BUCKET_NAME!
  const host = new URL(endpoint).host
  const region = env.R2_REGION || 'auto'
  const service = 's3'
  const now = new Date()
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '')
  const dateStamp = amzDate.slice(0, 8)
  const payloadHash = createHash('sha256').update(body).digest('hex')
  const canonicalUri = `/${bucket}/${key.split('/').map(segment => encodeURIComponent(segment)).join('/')}`
  const canonicalHeaders = `content-type:${contentType}\nhost:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`
  const signedHeaders = 'content-type;host;x-amz-content-sha256;x-amz-date'
  const canonicalRequest = `PUT\n${canonicalUri}\n\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`
  const scope = `${dateStamp}/${region}/${service}/aws4_request`
  const stringToSign = `AWS4-HMAC-SHA256\n${amzDate}\n${scope}\n${createHash('sha256').update(canonicalRequest).digest('hex')}`
  const kDate = createHmac('sha256', `AWS4${env.R2_SECRET_ACCESS_KEY}`).update(dateStamp).digest()
  const kRegion = createHmac('sha256', kDate).update(region).digest()
  const kService = createHmac('sha256', kRegion).update(service).digest()
  const kSigning = createHmac('sha256', kService).update('aws4_request').digest()
  const signature = createHmac('sha256', kSigning).update(stringToSign).digest('hex')
  const authorization = `AWS4-HMAC-SHA256 Credential=${env.R2_ACCESS_KEY_ID}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`

  const response = await fetch(`https://${host}/${bucket}/${key.split('/').map(segment => encodeURIComponent(segment)).join('/')}`, {
    method: 'PUT',
    headers: {
      Authorization: authorization,
      'Content-Type': contentType,
      'X-Amz-Content-Sha256': payloadHash,
      'X-Amz-Date': amzDate,
    },
    body: new Uint8Array(body),
  })
  if (!response.ok) {
    const detail = (await response.text()).slice(0, 500).replace(/\s+/g, ' ').trim()
    throw new Error(`R2 上传失败: ${response.status}${detail ? ` - ${detail}` : ''}`)
  }
  return { url: r2PublicUrl(key), key }
}
