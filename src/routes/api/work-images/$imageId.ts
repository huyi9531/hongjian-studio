import { createFileRoute } from '@tanstack/react-router'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { requireAuth } from '@/server/auth.server'
import { env } from '@/server/env.server'
import { getImageRecord } from '@/server/services/work.server'

export const Route = createFileRoute('/api/work-images/$imageId')({
  server: { handlers: { GET: async ({ params }) => {
    try { requireAuth() } catch { return Response.json({ error: '未登录或会话已失效' }, { status: 401 }) }
    try {
      const image = await getImageRecord(params.imageId)
      if (!image.archivePath) return Response.json({ error: '本地图片不存在' }, { status: 404 })
      return new Response(await readFile(join(env.DATA_DIR, image.archivePath)), { headers: { 'Content-Type': 'image/png', 'Cache-Control': 'private, max-age=31536000, immutable' } })
    } catch (cause) {
      return Response.json({ error: cause instanceof Error ? cause.message : String(cause) }, { status: 404 })
    }
  } } },
})
