import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { requireAuth } from '@/server/auth.server'
import { GenerationInProgressError, prepareGeneration, runPreparedGeneration } from '@/server/services/generation.server'
import { imagePromptModes, seedreamModels, supportedSeedreamSizes } from '@/lib/studio-preferences'

const inputSchema = z.object({ workId: z.string().uuid(), model: z.enum([seedreamModels.standard, seedreamModels.pro]), size: z.enum(['1K', '2K', '4K']), promptMode: z.enum([imagePromptModes.short, imagePromptModes.long]).default(imagePromptModes.short) })

export const Route = createFileRoute('/api/retry-failed')({
  server: { handlers: { POST: async ({ request }) => {
    try { requireAuth() } catch { return Response.json({ error: '未登录或会话已失效' }, { status: 401 }) }
    const body = await request.json().catch(() => null)
    const parsed = inputSchema.safeParse(body)
    if (!parsed.success || !supportedSeedreamSizes(parsed.data.model).includes(parsed.data.size)) return Response.json({ error: '重试参数无效' }, { status: 400 })
    let prepared
    try { prepared = await prepareGeneration(parsed.data.workId, parsed.data.model, parsed.data.size, parsed.data.promptMode) }
    catch (cause) {
      if (cause instanceof GenerationInProgressError) return Response.json({ error: cause.message, job: cause.job }, { status: 409 })
      return Response.json({ error: cause instanceof Error ? cause.message : '无法创建重试任务' }, { status: 400 })
    }
    const encoder = new TextEncoder()
    const stream = new ReadableStream({ start(controller) {
      const emit = (message: { event: string; data: Record<string, unknown> }) => controller.enqueue(encoder.encode(`event: ${message.event}\ndata: ${JSON.stringify(message.data)}\n\n`))
      emit({ event: 'retry_start', data: { total: prepared.work.outlinePages.length, message: '开始补全未完成或已失效的图片' } })
      void runPreparedGeneration(prepared, emit, { retryOnly: true }).catch(cause => emit({ event: 'error', data: { index: -1, message: cause instanceof Error ? cause.message : String(cause), retryable: false } })).finally(() => controller.close())
    } })
    return new Response(stream, { headers: { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache, no-transform', 'X-Accel-Buffering': 'no' } })
  } } },
})
