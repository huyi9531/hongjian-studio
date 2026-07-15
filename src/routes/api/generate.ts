import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { requireAuth } from '@/server/auth.server'
import { generateWorkImages } from '@/server/services/generation.server'
import { seedreamModels, supportedSeedreamSizes } from '@/lib/studio-preferences'

const inputSchema = z.object({ workId: z.string().uuid(), model: z.enum([seedreamModels.standard, seedreamModels.pro]), size: z.enum(['1K', '2K', '4K']), force: z.boolean().optional() })

export const Route = createFileRoute('/api/generate')({
  server: { handlers: { POST: async ({ request }) => {
    try { requireAuth() } catch { return Response.json({ error: '未登录或会话已失效' }, { status: 401 }) }
    const parsed = inputSchema.safeParse(await request.json())
    if (!parsed.success) return Response.json({ error: '生成参数无效' }, { status: 400 })
    if (!supportedSeedreamSizes(parsed.data.model).includes(parsed.data.size)) return Response.json({ error: '该模型不支持所选清晰度' }, { status: 400 })
    const encoder = new TextEncoder()
    const stream = new ReadableStream({ start(controller) {
      const emit = (message: { event: string; data: Record<string, unknown> }) => controller.enqueue(encoder.encode(`event: ${message.event}\ndata: ${JSON.stringify(message.data)}\n\n`))
      void generateWorkImages(parsed.data.workId, parsed.data.model, parsed.data.size, emit, parsed.data.force).catch(cause => {
        emit({ event: 'error', data: { index: -1, status: 'error', message: cause instanceof Error ? cause.message : String(cause), retryable: false } })
      }).finally(() => controller.close())
    } })
    return new Response(stream, { headers: { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache, no-transform', 'X-Accel-Buffering': 'no' } })
  } } },
})
