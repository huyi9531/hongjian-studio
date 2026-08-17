import { Link, useBlocker, useNavigate } from '@tanstack/react-router'
import { ArrowDown, ArrowLeft, ArrowUp, GripVertical, ImagePlus, LoaderCircle, PencilLine, Plus, RefreshCw, Send, Sparkles, Trash2, Upload, X } from 'lucide-react'
import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { WorkspacePageHeader } from '@/components/workspace-page-header'
import { publicationInputSignature, publicationMatchesLatestWork } from '@/lib/publication-state'
import { beginOutlineEditFn, createWorkFn, generateContentFn, getStudioPreferencesFn, getWorkFn, publishWorkFn, regenerateImageFn, updateWorkFn } from '@/server/functions'

type Work = Awaited<ReturnType<typeof createWorkFn>>
type Preferences = Awaited<ReturnType<typeof getStudioPreferencesFn>>['preferences']
type Page = Work['outlinePages'][number]
type Stage = 'outline' | 'generating' | 'result'
type ImageState = { index: number; id?: string; url: string; status: 'pending' | 'generating' | 'retrying' | 'done' | 'error'; error?: string }
type SseMessage = { event: string; data: Record<string, unknown> }

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error ?? new Error('读取参考图片失败'))
    reader.readAsDataURL(file)
  })
}

async function readSse(response: Response, onMessage: (message: SseMessage) => void) {
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { error?: string } | null
    throw new Error(body?.error || `请求失败: ${response.status}`)
  }
  if (!response.body) throw new Error('生成接口未返回事件流')
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  while (true) {
    const { done, value } = await reader.read()
    buffer += decoder.decode(value, { stream: !done })
    const blocks = buffer.split(/\r?\n\r?\n/)
    buffer = blocks.pop() ?? ''
    for (const block of blocks) {
      const event = block.match(/^event:\s*(.+)$/m)?.[1]
      const data = block.match(/^data:\s*(.+)$/m)?.[1]
      if (event && data) onMessage({ event, data: JSON.parse(data) as Record<string, unknown> })
    }
    if (done) break
  }
}

function workImageUrl(image: Work['images'][number]) {
  return image.archivePath ? `/api/work-images/${image.id}` : image.sourceUrl ?? ''
}

function initialImageStates(work: Work): ImageState[] {
  return work.outlinePages.map(page => {
    const image = work.images.find(item => item.pageIndex === page.index)
    return { index: page.index, id: image?.id, url: image ? workImageUrl(image) : '', status: (image?.status as ImageState['status'] | undefined) ?? 'pending', error: image?.error ?? undefined }
  })
}

function resolveStage(work: Work): Stage {
  const imagesMatchOutline = work.outlinePages.length > 0 && work.outlinePages.every(page => work.images.some(image => image.pageIndex === page.index && image.status === 'done' && Boolean(image.inputFingerprint)))
  if (imagesMatchOutline) return 'result'
  if (work.generationJob?.status === 'running' || work.generationJob?.status === 'interrupted' || work.generationJob?.status === 'partial_failed' || work.status === 'generating' || work.status === 'partial_failed') return 'generating'
  return 'outline'
}

export function NewWork() {
  const [topic, setTopic] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [pagePlanMode, setPagePlanMode] = useState<'smart' | 'exact'>('smart')
  const [minPages, setMinPages] = useState(3)
  const [maxPages, setMaxPages] = useState(8)
  const [exactPages, setExactPages] = useState(5)
  const navigate = useNavigate()
  const previewsRef = useRef<string[]>([])

  useEffect(() => { previewsRef.current = previews }, [previews])
  useEffect(() => () => previewsRef.current.forEach(URL.revokeObjectURL), [])

  function addFiles(nextFiles: File[]) {
    setError('')
    const valid = nextFiles.filter(file => ['image/png', 'image/jpeg', 'image/webp'].includes(file.type) && file.size <= 8 * 1024 * 1024)
    if (valid.length !== nextFiles.length) setError('仅支持 8MB 以内的 PNG、JPG 或 WebP 图片')
    const available = Math.max(0, 5 - files.length)
    const accepted = valid.slice(0, available)
    if (valid.length > available) setError('最多添加 5 张参考图片')
    setFiles(current => [...current, ...accepted])
    setPreviews(current => [...current, ...accepted.map(file => URL.createObjectURL(file))])
  }

  function clearFiles() {
    previews.forEach(URL.revokeObjectURL)
    setFiles([])
    setPreviews([])
  }

  function updatePageCount(setter: (value: number) => void, value: string, min: number, max: number) {
    const next = Number(value)
    if (Number.isInteger(next)) setter(Math.min(max, Math.max(min, next)))
  }

  async function submit(event?: FormEvent) {
    event?.preventDefault()
    if (busy || topic.trim().length < 2) return
    setBusy(true)
    setError('')
    try {
      const references = await Promise.all(files.map(async file => ({ filename: file.name, mimeType: file.type as 'image/png' | 'image/jpeg' | 'image/webp', dataUrl: await fileToDataUrl(file) })))
      const outlinePagePlan = pagePlanMode === 'smart' ? { mode: 'smart' as const, minPages, maxPages } : { mode: 'exact' as const, exactPages }
      const work = await createWorkFn({ data: { topic, references, outlinePagePlan } })
      await navigate({ to: '/studio/$workId', params: { workId: work.id } })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '生成大纲失败')
    } finally {
      setBusy(false)
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      void submit()
    }
  }

  return <section className="min-h-[calc(100dvh-64px)] bg-background-home px-4 py-8 sm:px-8 sm:py-10 lg:px-10">
    <div className="mx-auto max-w-[1280px]">
      <WorkspacePageHeader title="新的创作" description="输入一个主题，红笺会先生成可以逐页调整的内容大纲。" />
      <form onSubmit={submit} className="mt-6 rounded-xl bg-card p-3 shadow-default sm:p-4">
        <Textarea value={topic} onChange={event => setTopic(event.target.value)} onKeyDown={handleKeyDown} placeholder="例如：一人食的快速晚餐清单" disabled={busy} className="min-h-48 resize-none border-0 bg-transparent px-1 py-1 text-base shadow-none focus-visible:bg-transparent focus-visible:ring-0" />
        <div className="flex min-h-11 items-center gap-2 border-t border-hairline pt-2">
          <div className="relative shrink-0"><label className="grid size-10 cursor-pointer place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground" title={files.length ? `已添加 ${files.length} 张参考图` : '添加参考图片'}><Upload className="size-4.5" /><input type="file" accept="image/png,image/jpeg,image/webp" multiple className="sr-only" disabled={busy || files.length >= 5} onChange={event => { addFiles(Array.from(event.target.files ?? [])); event.target.value = '' }} /></label>{files.length > 0 && <span className="absolute -top-1 -right-1 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-medium leading-none text-primary-foreground">{files.length}</span>}</div>
          {files.length > 0 && <button type="button" aria-label="移除全部参考图片" title="移除全部参考图片" onClick={clearFiles} className="grid size-8 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"><X className="size-3.5" /></button>}
          <div className="ml-auto flex min-w-0 items-center gap-1.5"><select value={pagePlanMode} aria-label="大纲页数模式" onChange={event => setPagePlanMode(event.target.value as 'smart' | 'exact')} disabled={busy} className="h-9 w-16 rounded-md border-0 bg-muted px-2 text-xs font-medium text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring-soft"><option value="smart">自动</option><option value="exact">精确</option></select>{pagePlanMode === 'smart' ? <div className="flex items-center gap-1 text-xs text-muted-foreground"><input aria-label="最少页数" type="number" min="2" max={maxPages - 1} value={minPages} disabled={busy} onChange={event => updatePageCount(setMinPages, event.target.value, 2, maxPages - 1)} className="h-9 w-8 rounded-md border-0 bg-muted p-0 text-center text-sm font-medium tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-ring-soft" /><span>-</span><input aria-label="最多页数" type="number" min={minPages + 1} max="18" value={maxPages} disabled={busy} onChange={event => updatePageCount(setMaxPages, event.target.value, minPages + 1, 18)} className="h-9 w-8 rounded-md border-0 bg-muted p-0 text-center text-sm font-medium tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-ring-soft" /><span>页</span></div> : <div className="flex items-center gap-1 text-xs text-muted-foreground"><input aria-label="精确页数" type="number" min="2" max="18" value={exactPages} disabled={busy} onChange={event => updatePageCount(setExactPages, event.target.value, 2, 18)} className="h-9 w-8 rounded-md border-0 bg-muted p-0 text-center text-sm font-medium tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-ring-soft" /><span>页</span></div>}<Button type="submit" title="将调用付费模型" className="h-10 shrink-0 px-3" disabled={busy || topic.trim().length < 2}>{busy ? <LoaderCircle className="animate-spin" /> : <Sparkles className="size-4" />}开始生成</Button></div>
        </div>
        {busy && <p className="mt-4 text-sm text-muted-foreground" role="status">正在生成大纲，通常需要 15–30 秒…</p>}
        {error && <p className="mt-4 text-sm text-destructive" role="alert">{error}</p>}
      </form>
    </div>
  </section>
}

export function Workbench({ initialWork, preferences }: { initialWork: Work; preferences: Preferences }) {
  const [work, setWork] = useState(initialWork)
  const [stage, setStage] = useState<Stage>(() => resolveStage(initialWork))
  const [images, setImages] = useState<ImageState[]>(initialImageStates(initialWork))
  const [streamBusy, setStreamBusy] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const [previewUrl, setPreviewUrl] = useState('')
  const latestWork = useRef(initialWork)
  const outlineSaveQueue = useRef(Promise.resolve())
  const outlineSaveRevision = useRef(0)

  useEffect(() => { latestWork.current = work }, [work])
  const navigationBlocker = useBlocker({ shouldBlockFn: () => stage === 'outline' && saveStatus === 'saving', withResolver: true, enableBeforeUnload: stage === 'outline' && saveStatus === 'saving' })
  useEffect(() => {
    if (navigationBlocker.status === 'blocked' && saveStatus !== 'saving') navigationBlocker.proceed()
  }, [navigationBlocker, saveStatus])

  async function refreshWork() {
    const fresh = await getWorkFn({ data: { workId: work.id } })
    setWork(fresh)
    setImages(initialImageStates(fresh))
    return fresh
  }

  useEffect(() => {
    if (stage !== 'generating' || streamBusy || work.generationJob?.status !== 'running') return
    const timer = window.setInterval(() => {
      void refreshWork().then(fresh => {
        setStage(resolveStage(fresh))
      }).catch(cause => setMessage(cause instanceof Error ? cause.message : '无法恢复生成进度'))
    }, 2500)
    return () => window.clearInterval(timer)
  }, [stage, streamBusy, work.generationJob?.status])

  async function saveOutlineSnapshot(snapshot: Work) {
    const outlineRaw = snapshot.outlinePages.map(page => page.content).join('\n\n<page>\n\n')
    const revision = ++outlineSaveRevision.current
    setSaveStatus('saving')
    const request = outlineSaveQueue.current.catch(() => undefined).then(() => updateWorkFn({ data: { workId: snapshot.id, outlineRaw, pages: snapshot.outlinePages } }))
    outlineSaveQueue.current = request.then(() => undefined, () => undefined)
    try {
      const saved = await request
      if (revision === outlineSaveRevision.current) setSaveStatus('saved')
      return saved
    } catch (cause) {
      if (revision === outlineSaveRevision.current) {
        setSaveStatus('error')
        setMessage(cause instanceof Error ? cause.message : '保存大纲失败')
      }
      throw cause
    }
  }

  function saveOutline() {
    return saveOutlineSnapshot(latestWork.current)
  }

  function applyOutlineChange(next: Work) {
    latestWork.current = next
    setWork(next)
    if (next.outlinePages.some(page => !page.content.trim())) {
      setSaveStatus('error')
      setMessage('页面内容不能为空；补充内容后会自动保存。')
      return
    }
    void saveOutlineSnapshot(next).catch(() => undefined)
  }

  function retryOutlineSave() {
    if (latestWork.current.outlinePages.some(page => !page.content.trim())) {
      setMessage('页面内容不能为空；请补充内容后再保存。')
      return
    }
    void saveOutline().catch(() => undefined)
  }

  function updatePage(index: number, content: string) {
    const current = latestWork.current
    const next = { ...current, outlinePages: current.outlinePages.map(page => page.index === index ? { ...page, content } : page) }
    applyOutlineChange(next)
  }

  function reindex(pages: Page[]) {
    const next = { ...latestWork.current, outlinePages: pages.map((page, index) => ({ ...page, index })) }
    applyOutlineChange(next)
  }

  function movePage(from: number, to: number) {
    const current = latestWork.current
    if (to < 0 || to >= current.outlinePages.length) return
    const pages = [...current.outlinePages]
    const [moved] = pages.splice(from, 1)
    if (moved) pages.splice(to, 0, moved)
    reindex(pages)
  }

  function deletePage(index: number) {
    const current = latestWork.current
    if (current.outlinePages.length <= 1 || !window.confirm(`确定删除第 ${index + 1} 页吗？`)) return
    reindex(current.outlinePages.filter((_, itemIndex) => itemIndex !== index))
  }

  function addPage() {
    const current = latestWork.current
    if (current.outlinePages.length >= 18) return
    reindex([...current.outlinePages, { index: current.outlinePages.length, type: 'content', content: '[内容]\n请输入这一页的内容' }])
  }

  function applyStreamMessage(message: SseMessage) {
    const index = Number(message.data.index)
    if (message.event === 'progress' && Number.isInteger(index) && index >= 0) setImages(current => current.map(image => image.index === index ? { ...image, status: 'generating', error: undefined } : image))
    if (message.event === 'complete' && Number.isInteger(index)) setImages(current => current.map(image => image.index === index ? { ...image, status: 'done', url: String(message.data.image_url ?? image.url), error: undefined } : image))
    if (message.event === 'error') {
      const error = String(message.data.message ?? '图片生成失败')
      if (Number.isInteger(index) && index >= 0) setImages(current => current.map(image => image.index === index ? { ...image, status: 'error', error } : image))
      else setMessage(error)
    }
  }

  async function runStream(path: '/api/generate' | '/api/retry-failed', force = false) {
    setStreamBusy(true)
    setMessage('')
    try {
      const response = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ workId: work.id, model: preferences.imageModel, size: preferences.imageSize, promptMode: preferences.imagePromptMode, force }) })
      if (response.status === 409) {
        const body = await response.json().catch(() => null) as { error?: string } | null
        setMessage(body?.error ?? '该作品正在后台生成图片')
        const fresh = await refreshWork()
        setStage(fresh.generationJob?.status === 'succeeded' ? 'result' : 'generating')
        return
      }
      let success = false
      await readSse(response, message => {
        applyStreamMessage(message)
        if ((message.event === 'finish' || message.event === 'retry_finish') && message.data.success === true) success = true
      })
      const fresh = await refreshWork()
      if (success || fresh.generationJob?.status === 'succeeded') setStage('result')
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : '图片生成失败')
    } finally {
      setStreamBusy(false)
    }
  }

  async function startGeneration() {
    try {
      const saved = await saveOutline()
      latestWork.current = saved
      setWork(saved)
      setImages(saved.outlinePages.map(page => ({ index: page.index, url: '', status: 'pending' })))
      setStage('generating')
      await runStream('/api/generate')
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : '无法开始图片生成')
      setStage('outline')
    }
  }

  async function regenerate(index: number) {
    if (streamBusy) return
    setImages(current => current.map(image => image.index === index ? { ...image, status: 'retrying', error: undefined } : image))
    try {
      const fresh = await regenerateImageFn({ data: { workId: work.id, pageIndex: index, model: preferences.imageModel, size: preferences.imageSize, promptMode: preferences.imagePromptMode } })
      setWork(fresh)
      setImages(initialImageStates(fresh))
    } catch (cause) {
      const error = cause instanceof Error ? cause.message : '重绘失败'
      setImages(current => current.map(image => image.index === index ? { ...image, status: 'error', error } : image))
    }
  }

  async function beginOutlineEdit() {
    try {
      const saved = await beginOutlineEditFn({ data: { workId: work.id } })
      setWork(saved)
      setImages(initialImageStates(saved))
      setStage('outline')
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : '无法进入大纲编辑')
    }
  }

  return <section className="min-h-[calc(100dvh-64px)] px-4 py-8 sm:px-8 sm:py-10 lg:px-10">
    {stage === 'outline' && <OutlineStage work={work} saveStatus={saveStatus} message={message} onUpdate={updatePage} onMove={movePage} onDelete={deletePage} onAdd={addPage} onRetrySave={retryOutlineSave} onStart={() => void startGeneration()} />}
    {stage === 'generating' && <GenerationStage work={work} images={images} busy={streamBusy} message={message} onBack={() => void beginOutlineEdit()} onRetryAll={() => void runStream('/api/retry-failed')} onRegenerate={index => void regenerate(index)} />}
    {stage === 'result' && <ResultStage work={work} setWork={setWork} images={images} busy={streamBusy} message={message} onPreview={setPreviewUrl} onRegenerate={index => void regenerate(index)} onEditOutline={() => void beginOutlineEdit()} />}
    {previewUrl && <div className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-4" role="dialog" aria-modal="true" aria-label="图片预览" onClick={() => setPreviewUrl('')}><button className="absolute top-4 right-4 grid size-11 place-items-center rounded-md text-white hover:bg-white/15" aria-label="关闭预览"><X /></button><img src={previewUrl} alt="大图预览" className="max-h-[90dvh] max-w-full object-contain" /></div>}
  </section>
}

function OutlineStage({ work, saveStatus, message, onUpdate, onMove, onDelete, onAdd, onRetrySave, onStart }: { work: Work; saveStatus: 'idle' | 'saving' | 'saved' | 'error'; message: string; onUpdate: (index: number, content: string) => void; onMove: (from: number, to: number) => void; onDelete: (index: number) => void; onAdd: () => void; onRetrySave: () => void; onStart: () => void }) {
  const [dragged, setDragged] = useState<number | null>(null)
  const saveLabel = saveStatus === 'saving' ? '保存中…' : saveStatus === 'saved' ? '已自动保存' : saveStatus === 'error' ? '保存失败' : ''
  return <div className="mx-auto max-w-[1280px]">
    <WorkspacePageHeader className="mb-7" eyebrow={<Link to="/studio" className="hover:text-foreground">创作首页</Link>} title="编辑内容大纲" description={work.topic} status={saveLabel} actions={<>{saveStatus === 'error' && <Button variant="outline" onClick={onRetrySave}><RefreshCw />重试保存</Button>}<Button onClick={onStart} disabled={saveStatus === 'saving'}><ImagePlus />开始生成图片</Button></>} />
    {saveStatus === 'error' && <p className="mb-4 text-sm text-destructive" role="alert">{message || '保存失败，修改尚未同步。'}</p>}
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{work.outlinePages.map((page, index) => <article key={page.index} draggable onDragStart={() => setDragged(index)} onDragOver={event => event.preventDefault()} onDrop={() => { if (dragged !== null) onMove(dragged, index); setDragged(null) }} className="flex aspect-[3/4] min-h-0 flex-col rounded-2xl bg-card p-5">
      <div className="mb-4 flex items-center gap-2"><GripVertical className="size-4 cursor-grab text-muted-foreground" /><span className="text-sm font-medium">第 {index + 1} 页</span><span className="text-xs text-muted-foreground">{page.type === 'cover' ? '封面' : page.type === 'summary' ? '总结' : '内容'}</span><div className="ml-auto flex"><Button size="icon-sm" variant="ghost" aria-label="上移" title="上移" disabled={index === 0} onClick={() => onMove(index, index - 1)}><ArrowUp /></Button><Button size="icon-sm" variant="ghost" aria-label="下移" title="下移" disabled={index === work.outlinePages.length - 1} onClick={() => onMove(index, index + 1)}><ArrowDown /></Button><Button size="icon-sm" variant="ghost" aria-label="删除" title="删除" disabled={work.outlinePages.length <= 1} onClick={() => onDelete(index)}><Trash2 /></Button></div></div>
      <Textarea value={page.content} onChange={event => onUpdate(page.index, event.target.value)} className="min-h-0 flex-1 resize-none border-0 bg-muted p-4 text-sm leading-7 shadow-none focus-visible:border-ring focus-visible:ring-2" /><span className="mt-3 text-right text-xs text-muted-foreground">{page.content.length} 字</span>
    </article>)}<button type="button" onClick={onAdd} disabled={work.outlinePages.length >= 18} className="grid aspect-[3/4] min-h-0 place-items-center rounded-2xl border border-dashed border-border bg-card text-muted-foreground transition-[background-color,color,border-color] hover:border-ring/40 hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:text-disabled-foreground"><span className="grid justify-items-center gap-2 text-sm"><Plus />添加一页</span></button></div>
  </div>
}

function GenerationStage({ work, images, busy, message, onBack, onRetryAll, onRegenerate }: { work: Work; images: ImageState[]; busy: boolean; message: string; onBack: () => void; onRetryAll: () => void; onRegenerate: (index: number) => void }) {
  const done = images.filter(image => image.status === 'done').length
  const failed = images.filter(image => image.status === 'error').length
  const percent = images.length ? Math.round(done / images.length * 100) : 0
  const backgroundRunning = work.generationJob?.status === 'running'
  const interrupted = work.generationJob?.status === 'interrupted'
  const description = busy || backgroundRunning ? `正在生成，已完成 ${done} / ${images.length} 页，可离开页面后回来查看` : interrupted ? `任务已中断，已完成 ${done} / ${images.length} 页，可继续生成未完成页` : failed ? `${failed} 张图片生成失败，可点击重试` : `等待继续生成未完成图片`
  return <div className="mx-auto max-w-[1280px]"><WorkspacePageHeader className="mb-7" title="生成图片" description={description} actions={<>{(failed > 0 || interrupted) && !busy && <Button onClick={onRetryAll}><RefreshCw />{interrupted ? '继续生成未完成页' : '一键补全失败图片'}</Button>}<Button variant="outline" onClick={onBack} disabled={busy || backgroundRunning}><ArrowLeft />返回大纲</Button></>} />
    <section className="rounded-2xl bg-card p-5 sm:p-6"><div className="flex justify-between text-sm"><span>生成进度</span><span className="font-medium text-ring">{percent}%</span></div><div className="mt-3 h-1 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-ring transition-[width] duration-300" style={{ width: `${percent}%` }} /></div>{message && <p className="mt-4 text-sm text-destructive" role="alert">{message}</p>}<ImageGrid images={images} onRegenerate={onRegenerate} disabled={busy} /></section>
  </div>
}

function ImageGrid({ images, onRegenerate, onEdit, onPreview, disabled }: { images: ImageState[]; onRegenerate: (index: number) => void; onEdit?: (index: number) => void; onPreview?: (url: string) => void; disabled: boolean }) {
  const overlayButtonClass = 'border-white bg-white text-black shadow-sm hover:border-white hover:bg-white hover:text-black active:bg-white active:text-black'
  return <div className="mt-7 grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 sm:gap-x-5 lg:grid-cols-4 xl:grid-cols-5">{images.map(image => <article key={image.index} className="min-w-0"><div className="group relative aspect-[3/4] overflow-hidden rounded-xl bg-muted">{image.status === 'done' && image.url ? <><button type="button" className="size-full" onClick={() => onPreview?.(image.url)} aria-label={`预览第 ${image.index + 1} 页`}><img src={image.url} alt={`第 ${image.index + 1} 页`} className="size-full object-cover" /></button>{onEdit ? <div className="absolute inset-x-0 bottom-0 grid grid-cols-2 border-t border-white/15 bg-black/70 text-white opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"><button type="button" className="flex h-12 items-center justify-center gap-2 text-sm font-medium transition-colors hover:bg-white/10 active:bg-white/15 disabled:pointer-events-none disabled:text-white/35" disabled={disabled} onClick={() => onEdit(image.index)}><PencilLine className="size-4" />修改大纲</button><button type="button" className="flex h-12 items-center justify-center gap-2 border-l border-white/20 text-sm font-medium transition-colors hover:bg-white/10 active:bg-white/15 disabled:pointer-events-none disabled:text-white/35" disabled={disabled} onClick={() => onRegenerate(image.index)}><RefreshCw className="size-4" />重新生成</button></div> : <div className="absolute inset-x-0 bottom-0 flex justify-center bg-black/50 p-3 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"><Button size="sm" variant="outline" className={overlayButtonClass} disabled={disabled} onClick={() => onRegenerate(image.index)}><RefreshCw />重新生成</Button></div>}</> : image.status === 'error' ? <div className="flex size-full flex-col items-center justify-center gap-3 p-4 text-center"><span className="grid size-10 place-items-center rounded-full bg-destructive text-lg font-semibold text-white">!</span><span className="text-sm font-medium">生成失败</span><span className="line-clamp-3 text-xs leading-5 text-destructive">{image.error}</span><Button size="sm" onClick={() => onRegenerate(image.index)} disabled={disabled}>点击重试</Button></div> : <div className="flex size-full flex-col items-center justify-center gap-3 text-sm text-muted-foreground">{image.status === 'generating' || image.status === 'retrying' ? <><LoaderCircle className="animate-spin text-ring" />{image.status === 'retrying' ? '重试中…' : '生成中…'}</> : '等待中'}</div>}</div><div className="mt-3 flex items-center justify-between px-1 text-xs"><span className="text-foreground">第 {image.index + 1} 页</span><span className={image.status === 'done' ? 'text-muted-foreground' : image.status === 'error' ? 'text-destructive' : 'text-muted-foreground'}>{image.status === 'done' ? '已完成' : image.status === 'error' ? '失败' : image.status === 'retrying' ? '重试中' : image.status === 'generating' ? '生成中' : '等待中'}</span></div></article>)}</div>
}

function ResultStage({ work, setWork, images, busy, message, onPreview, onRegenerate, onEditOutline }: { work: Work; setWork: (work: Work) => void; images: ImageState[]; busy: boolean; message: string; onPreview: (url: string) => void; onRegenerate: (index: number) => void; onEditOutline: () => void }) {
  const publishAttemptable = work.publishability !== 'not_ready'
  const publishSignature = publicationInputSignature({ title: work.selectedTitle || work.topic, copywriting: work.copywriting, tags: work.tags, images: images.map(image => ({ index: image.index, url: image.url })) })
  const publicationIsCurrent = work.publication ? publicationMatchesLatestWork(work.publication.createdAt, work.updatedAt, work.images.map(image => image.updatedAt)) : false
  const [contentStatus, setContentStatus] = useState<'idle' | 'generating' | 'done' | 'error'>(work.copywriting ? 'done' : 'idle')
  const [contentError, setContentError] = useState('')
  const [publishBusy, setPublishBusy] = useState(false)
  const [publishMessage, setPublishMessage] = useState('')
  const [publishedSignature, setPublishedSignature] = useState(publicationIsCurrent ? publishSignature : '')
  const [editingPageIndex, setEditingPageIndex] = useState<number | null>(null)
  const [editingContent, setEditingContent] = useState('')
  const [outlineBusy, setOutlineBusy] = useState(false)
  const [outlineError, setOutlineError] = useState('')
  const qrIsCurrent = Boolean(work.publication && publishedSignature === publishSignature)
  const editingPage = editingPageIndex === null ? null : work.outlinePages.find(page => page.index === editingPageIndex) ?? null

  async function generateContent() {
    setContentStatus('generating'); setContentError('')
    try { const fresh = await generateContentFn({ data: { workId: work.id } }); setWork(fresh); setContentStatus('done') }
    catch (cause) { setContentError(cause instanceof Error ? cause.message : '内容生成失败'); setContentStatus('error') }
  }

  async function saveContent(next: Work) {
    setWork(next)
    try { setWork(await updateWorkFn({ data: { workId: next.id, selectedTitle: next.selectedTitle, copywriting: next.copywriting, tags: next.tags } })) }
    catch (cause) { setContentError(cause instanceof Error ? cause.message : '内容保存失败') }
  }

  function editOutline(index: number) {
    const page = work.outlinePages.find(item => item.index === index)
    if (!page) return
    setEditingPageIndex(index)
    setEditingContent(page.content)
    setOutlineError('')
  }

  async function saveEditedOutline(regenerateAfterSave: boolean) {
    if (!editingPage || !editingContent.trim() || outlineBusy) return
    setOutlineBusy(true)
    setOutlineError('')
    try {
      const pages = work.outlinePages.map(page => page.index === editingPage.index ? { ...page, content: editingContent.trim() } : page)
      const outlineRaw = pages.map(page => page.content).join('\n\n<page>\n\n')
      const saved = await updateWorkFn({ data: { workId: work.id, outlineRaw, pages } })
      setWork(saved)
      setEditingPageIndex(null)
      if (regenerateAfterSave) onRegenerate(editingPage.index)
    } catch (cause) {
      setOutlineError(cause instanceof Error ? cause.message : '大纲保存失败')
    } finally {
      setOutlineBusy(false)
    }
  }

  async function publish() {
    setPublishBusy(true); setPublishMessage('')
    try {
      const receipt = await publishWorkFn({ data: { workId: work.id, title: work.selectedTitle || work.topic, content: `${work.copywriting}\n${work.tags.map(tag => `#${tag}`).join(' ')}`.trim() } })
      setPublishMessage('请使用手机浏览器扫码发布')
      setPublishedSignature(publishSignature)
      setWork({ ...work, publication: receipt })
    } catch (cause) { setPublishMessage(cause instanceof Error ? cause.message : '创建发布页失败') }
    finally { setPublishBusy(false) }
  }

  return <div className="mx-auto max-w-[1280px]"><WorkspacePageHeader className="mb-7" title="生成结果" description={`全部 ${images.length} 张图片生成完成`} actions={<><Button variant="outline" onClick={onEditOutline}><PencilLine />编辑大纲</Button><Link to="/studio"><Button variant="outline"><Plus />再来一篇</Button></Link></>} />
    {message && <p className="mb-4 text-sm text-destructive">{message}</p>}<ImageGrid images={images} onRegenerate={onRegenerate} onEdit={editOutline} onPreview={onPreview} disabled={busy} />
  <section className="mt-12"><h2 className="text-lg font-semibold">标题、文案和标签</h2>{contentStatus === 'idle' && <div className="mt-4 rounded-2xl bg-card p-10 text-center"><Button onClick={() => void generateContent()}><Sparkles />生成标题、文案和标签</Button></div>}{contentStatus === 'generating' && <div className="mt-4 flex items-center justify-center gap-3 rounded-2xl bg-card p-10 text-sm text-muted-foreground"><LoaderCircle className="animate-spin text-ring" />正在生成标题、文案和标签…</div>}{contentStatus === 'error' && <div className="mt-4 rounded-2xl bg-card p-8 text-center"><p className="text-sm text-destructive">{contentError}</p><Button className="mt-4" variant="outline" onClick={() => void generateContent()}><RefreshCw />重新生成</Button></div>}{contentStatus === 'done' && <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(300px,0.75fr)]"><div className="grid gap-4"><div className="rounded-2xl bg-card p-5"><h3 className="text-sm font-medium">标题</h3><div className="mt-3 grid gap-2 rounded-xl bg-muted p-2">{work.titles.map((title, index) => <button type="button" key={`${title}-${index}`} onClick={() => void saveContent({ ...work, selectedTitle: title })} className={`min-h-11 rounded-lg px-4 text-left text-sm transition-[background-color,color] ${work.selectedTitle === title ? 'bg-card text-foreground' : 'text-muted-foreground hover:bg-card/75 hover:text-foreground'}`}><span className="mr-2 text-xs text-muted-foreground">{index === 0 ? '推荐' : `备选 ${index}`}</span>{title}</button>)}</div><Input className="mt-3" value={work.selectedTitle} onChange={event => setWork({ ...work, selectedTitle: event.target.value })} onBlur={() => void saveContent(work)} aria-label="发布标题" /></div><div className="rounded-2xl bg-card p-5"><h3 className="text-sm font-medium">正文</h3><Textarea className="mt-3 min-h-56 bg-muted leading-7" value={work.copywriting} onChange={event => setWork({ ...work, copywriting: event.target.value })} onBlur={() => void saveContent(work)} /></div><div className="rounded-2xl bg-card p-5"><h3 className="text-sm font-medium">标签</h3><Input className="mt-3 bg-muted" value={work.tags.join(' ')} onChange={event => setWork({ ...work, tags: event.target.value.split(/\s+/).map(tag => tag.replace(/^#/, '')).filter(Boolean) })} onBlur={() => void saveContent(work)} /></div><Button variant="outline" onClick={() => void generateContent()}><RefreshCw />重新生成文案</Button></div><aside className="h-fit rounded-2xl bg-card p-6 lg:sticky lg:top-24"><h3 className="text-base font-medium">扫码发布</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">确认内容后生成发布二维码。</p><p className="mt-3 text-xs leading-5 text-muted-foreground">请确认图片不含第三方平台标识、账号、水印或未获授权素材。</p>{work.images.some(image => image.archiveStatus === 'unavailable') && <p className="mt-3 text-sm text-muted-foreground" role="status">部分图片未归档到本机，当前仍可使用有效公网链接发布。</p>}{work.publishability === 'checking_publishability' && <p className="mt-3 text-sm text-muted-foreground" role="status">正在确认图片公网链接，确认后才可生成二维码。</p>}{work.publishability === 'unpublishable' && <p className="mt-3 text-sm text-destructive" role="alert">图片公网链接已失效，但本地归档完整，点击下方按钮将尝试自动恢复链接后发布。</p>}{work.publishability === 'not_ready' && <p className="mt-3 text-sm text-destructive" role="alert">图片尚未完成或属于历史未校验结果，请重新生成图片后再发布。</p>}<Button className="mt-5 w-full" onClick={() => void publish()} disabled={publishBusy || !work.selectedTitle || !work.copywriting || !publishAttemptable || publishedSignature === publishSignature}>{publishBusy ? <LoaderCircle className="animate-spin" /> : <Send />}生成二维码</Button>{qrIsCurrent && publishMessage && <p className="mt-3 text-sm text-muted-foreground" role="status">{publishMessage}</p>}{qrIsCurrent && work.publication && <div className="mt-6 grid justify-items-center gap-3"><div className="rounded-xl border border-hairline bg-card p-4"><QRCodeSVG value={work.publication.h5Url} size={176} /></div><a className="inline-flex h-11 items-center gap-2 text-sm font-medium text-primary hover:underline" href={work.publication.h5Url} target="_blank" rel="noreferrer"><PencilLine className="size-4" />打开发布页</a></div>}</aside></div>}</section>
    <Dialog open={editingPageIndex !== null} onOpenChange={open => { if (!open && !outlineBusy) setEditingPageIndex(null) }}><DialogContent className="sm:max-w-xl"><DialogHeader><DialogTitle>修改第 {editingPageIndex === null ? '' : editingPageIndex + 1} 页大纲</DialogTitle><DialogDescription>保存后，后续重新生成会使用这里的最新内容。</DialogDescription></DialogHeader><Textarea value={editingContent} onChange={event => setEditingContent(event.target.value)} className="min-h-64 resize-y bg-muted leading-7" disabled={outlineBusy} autoFocus />{outlineError && <p className="text-sm text-destructive" role="alert">{outlineError}</p>}<DialogFooter><Button variant="outline" onClick={() => void saveEditedOutline(false)} disabled={outlineBusy || !editingContent.trim()}>{outlineBusy ? <LoaderCircle className="animate-spin" /> : null}保存</Button><Button onClick={() => void saveEditedOutline(true)} disabled={outlineBusy || !editingContent.trim()}>{outlineBusy ? <LoaderCircle className="animate-spin" /> : <RefreshCw />}保存并重新生成</Button></DialogFooter></DialogContent></Dialog>
  </div>
}
