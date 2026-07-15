import { Link, useNavigate } from '@tanstack/react-router'
import { ArrowDown, ArrowLeft, ArrowUp, GripVertical, ImagePlus, LoaderCircle, PencilLine, Plus, RefreshCw, Send, Sparkles, Trash2, Upload, X } from 'lucide-react'
import { FormEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { publicationInputSignature, publicationMatchesLatestWork } from '@/lib/publication-state'
import { createWorkFn, generateContentFn, getStudioPreferencesFn, getWorkFn, publishWorkFn, regenerateImageFn, updateWorkFn } from '@/server/functions'

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

export function NewWork() {
  const [topic, setTopic] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
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

  function removeFile(index: number) {
    URL.revokeObjectURL(previews[index]!)
    setFiles(current => current.filter((_, itemIndex) => itemIndex !== index))
    setPreviews(current => current.filter((_, itemIndex) => itemIndex !== index))
  }

  async function submit(event?: FormEvent) {
    event?.preventDefault()
    if (busy || topic.trim().length < 2) return
    setBusy(true)
    setError('')
    try {
      const references = await Promise.all(files.map(async file => ({ filename: file.name, mimeType: file.type as 'image/png' | 'image/jpeg' | 'image/webp', dataUrl: await fileToDataUrl(file) })))
      const work = await createWorkFn({ data: { topic, references } })
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

  return <section className="mx-auto grid min-h-[calc(100dvh-64px)] max-w-5xl place-items-start px-4 pt-20 pb-12 sm:place-items-center sm:px-8 sm:py-12 lg:min-h-[100dvh]">
    <form onSubmit={submit} className="w-full max-w-3xl">
      <h1 className="max-w-xl text-3xl leading-tight font-semibold text-balance sm:text-4xl">今天想创作什么？</h1>
      <p className="mt-3 max-w-lg text-sm leading-6 text-muted-foreground">输入一个主题，红笺会先生成可以逐页调整的内容大纲。</p>
      <div className="mt-8 rounded-3xl bg-muted p-2">
        <Textarea value={topic} onChange={event => setTopic(event.target.value)} onKeyDown={handleKeyDown} placeholder="例如：一人食的快速晚餐清单" disabled={busy} className="min-h-32 resize-none border-0 bg-transparent px-4 py-4 text-base shadow-none focus-visible:bg-transparent focus-visible:ring-0" />
        {previews.length > 0 && <div className="flex flex-wrap gap-3 px-3 pb-3">{previews.map((preview, index) => <div key={preview} className="relative size-16 overflow-hidden rounded-2xl bg-white"><img src={preview} alt={`参考图 ${index + 1}`} className="size-full object-cover" /><button type="button" aria-label={`移除参考图 ${index + 1}`} onClick={() => removeFile(index)} className="absolute top-1 right-1 grid size-7 min-h-0 place-items-center rounded-full bg-black/65 text-white"><X className="size-3.5" /></button></div>)}</div>}
        <div className="flex items-center justify-between gap-3 px-2 pb-1">
          <label className="grid size-11 cursor-pointer place-items-center rounded-full text-muted-foreground transition-colors hover:bg-white hover:text-foreground" title="添加参考图片"><Upload className="size-5" /><input type="file" accept="image/png,image/jpeg,image/webp" multiple className="sr-only" disabled={busy || files.length >= 5} onChange={event => { addFiles(Array.from(event.target.files ?? [])); event.target.value = '' }} /></label>
          <span className="mr-auto text-xs text-muted-foreground">参考图 {files.length}/5</span>
          <Button type="submit" disabled={busy || topic.trim().length < 2}>{busy ? <LoaderCircle className="animate-spin" /> : <Sparkles />}生成大纲</Button>
        </div>
      </div>
      {busy && <p className="mt-3 text-sm text-muted-foreground" role="status">正在生成大纲，通常需要 15–30 秒…</p>}
      {error && <p className="mt-3 text-sm text-destructive" role="alert">{error}</p>}
    </form>
  </section>
}

export function Workbench({ initialWork, preferences }: { initialWork: Work; preferences: Preferences }) {
  const initialDone = initialWork.outlinePages.length > 0 && initialWork.outlinePages.every(page => initialWork.images.some(image => image.pageIndex === page.index && image.status === 'done'))
  const [work, setWork] = useState(initialWork)
  const [stage, setStage] = useState<Stage>(initialDone || initialWork.status === 'result' ? 'result' : initialWork.status === 'generating' || initialWork.images.length ? 'generating' : 'outline')
  const [images, setImages] = useState<ImageState[]>(initialImageStates(initialWork))
  const [streamBusy, setStreamBusy] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const [previewUrl, setPreviewUrl] = useState('')
  const saveTimer = useRef<number | null>(null)
  const firstSave = useRef(true)

  const rawOutline = useMemo(() => work.outlinePages.map(page => page.content).join('\n\n<page>\n\n'), [work.outlinePages])

  async function refreshWork() {
    const fresh = await getWorkFn({ data: { workId: work.id } })
    setWork(fresh)
    setImages(initialImageStates(fresh))
    return fresh
  }

  async function saveOutline() {
    setSaveStatus('saving')
    try {
      const saved = await updateWorkFn({ data: { workId: work.id, outlineRaw: rawOutline, pages: work.outlinePages } })
      setWork(saved)
      setSaveStatus('saved')
      return saved
    } catch (cause) {
      setSaveStatus('error')
      setMessage(cause instanceof Error ? cause.message : '保存大纲失败')
      throw cause
    }
  }

  useEffect(() => {
    if (stage !== 'outline') return
    if (firstSave.current) { firstSave.current = false; return }
    if (saveTimer.current) window.clearTimeout(saveTimer.current)
    setSaveStatus('idle')
    saveTimer.current = window.setTimeout(() => { void saveOutline() }, 300)
    return () => { if (saveTimer.current) window.clearTimeout(saveTimer.current) }
  }, [rawOutline, stage])

  function updatePage(index: number, content: string) {
    setWork(current => ({ ...current, outlinePages: current.outlinePages.map(page => page.index === index ? { ...page, content } : page) }))
  }

  function reindex(pages: Page[]) {
    setWork(current => ({ ...current, outlinePages: pages.map((page, index) => ({ ...page, index })) }))
  }

  function movePage(from: number, to: number) {
    if (to < 0 || to >= work.outlinePages.length) return
    const pages = [...work.outlinePages]
    const [moved] = pages.splice(from, 1)
    if (moved) pages.splice(to, 0, moved)
    reindex(pages)
  }

  function deletePage(index: number) {
    if (work.outlinePages.length <= 1 || !window.confirm(`确定删除第 ${index + 1} 页吗？`)) return
    reindex(work.outlinePages.filter((_, itemIndex) => itemIndex !== index))
  }

  function addPage() {
    if (work.outlinePages.length >= 18) return
    reindex([...work.outlinePages, { index: work.outlinePages.length, type: 'content', content: '[内容]\n请输入这一页的内容' }])
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
      const response = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ workId: work.id, model: preferences.imageModel, size: preferences.imageSize, force }) })
      let success = false
      await readSse(response, message => {
        applyStreamMessage(message)
        if ((message.event === 'finish' || message.event === 'retry_finish') && message.data.success === true) success = true
      })
      await refreshWork()
      if (success) window.setTimeout(() => setStage('result'), 700)
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : '图片生成失败')
    } finally {
      setStreamBusy(false)
    }
  }

  async function startGeneration() {
    if (saveTimer.current) window.clearTimeout(saveTimer.current)
    await saveOutline()
    setImages(work.outlinePages.map(page => ({ index: page.index, url: '', status: 'pending' })))
    setStage('generating')
    await runStream('/api/generate')
  }

  async function regenerate(index: number) {
    if (streamBusy) return
    setImages(current => current.map(image => image.index === index ? { ...image, status: 'retrying', error: undefined } : image))
    try {
      const fresh = await regenerateImageFn({ data: { workId: work.id, pageIndex: index, model: preferences.imageModel, size: preferences.imageSize } })
      setWork(fresh)
      setImages(initialImageStates(fresh))
    } catch (cause) {
      const error = cause instanceof Error ? cause.message : '重绘失败'
      setImages(current => current.map(image => image.index === index ? { ...image, status: 'error', error } : image))
    }
  }

  return <section className="min-h-[calc(100dvh-64px)] px-4 py-8 sm:px-8 sm:py-10 lg:min-h-[100dvh] lg:px-10">
    {stage === 'outline' && <OutlineStage work={work} saveStatus={saveStatus} onUpdate={updatePage} onMove={movePage} onDelete={deletePage} onAdd={addPage} onStart={() => void startGeneration()} />}
    {stage === 'generating' && <GenerationStage work={work} images={images} busy={streamBusy} message={message} onBack={() => setStage('outline')} onRetryAll={() => void runStream('/api/retry-failed')} onRegenerate={index => void regenerate(index)} />}
    {stage === 'result' && <ResultStage work={work} setWork={setWork} images={images} busy={streamBusy} message={message} onPreview={setPreviewUrl} onRegenerate={index => void regenerate(index)} />}
    {previewUrl && <div className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-4" role="dialog" aria-modal="true" aria-label="图片预览" onClick={() => setPreviewUrl('')}><button className="absolute top-4 right-4 grid size-11 place-items-center rounded-md text-white hover:bg-white/15" aria-label="关闭预览"><X /></button><img src={previewUrl} alt="大图预览" className="max-h-[90dvh] max-w-full object-contain" /></div>}
  </section>
}

function OutlineStage({ work, saveStatus, onUpdate, onMove, onDelete, onAdd, onStart }: { work: Work; saveStatus: 'idle' | 'saving' | 'saved' | 'error'; onUpdate: (index: number, content: string) => void; onMove: (from: number, to: number) => void; onDelete: (index: number) => void; onAdd: () => void; onStart: () => void }) {
  const [dragged, setDragged] = useState<number | null>(null)
  return <div className="mx-auto max-w-[1280px]">
    <header className="mb-8 flex flex-wrap items-end justify-between gap-5"><div><Link to="/studio" className="text-sm text-muted-foreground hover:text-foreground">创作</Link><div className="mt-1 flex flex-wrap items-center gap-3"><h1 className="text-2xl font-semibold">编辑内容大纲</h1><span className="text-xs text-[#999]" role="status">{saveStatus === 'saving' ? '保存中…' : saveStatus === 'saved' ? '已自动保存' : saveStatus === 'error' ? '保存失败' : ''}</span></div><p className="mt-2 max-w-2xl text-sm text-muted-foreground">{work.topic}</p></div><Button onClick={onStart}><ImagePlus />开始生成图片</Button></header>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{work.outlinePages.map((page, index) => <article key={page.index} draggable onDragStart={() => setDragged(index)} onDragOver={event => event.preventDefault()} onDrop={() => { if (dragged !== null) onMove(dragged, index); setDragged(null) }} className="flex min-h-80 flex-col rounded-2xl bg-muted p-5 transition-[background-color,transform] hover:bg-[#f5f5f5]">
      <div className="mb-4 flex items-center gap-2"><GripVertical className="size-4 cursor-grab text-[#aaa]" /><span className="text-sm font-semibold">第 {index + 1} 页</span><span className="text-xs text-[#999]">{page.type === 'cover' ? '封面' : page.type === 'summary' ? '总结' : '内容'}</span><div className="ml-auto flex"><Button size="icon-sm" variant="ghost" aria-label="上移" disabled={index === 0} onClick={() => onMove(index, index - 1)}><ArrowUp /></Button><Button size="icon-sm" variant="ghost" aria-label="下移" disabled={index === work.outlinePages.length - 1} onClick={() => onMove(index, index + 1)}><ArrowDown /></Button><Button size="icon-sm" variant="ghost" aria-label="删除" disabled={work.outlinePages.length <= 1} onClick={() => onDelete(index)}><Trash2 /></Button></div></div>
      <Textarea value={page.content} onChange={event => onUpdate(page.index, event.target.value)} className="min-h-56 flex-1 resize-none border-0 bg-transparent p-0 text-sm leading-7 shadow-none focus-visible:ring-0" /><span className="mt-2 text-right text-xs text-muted-foreground">{page.content.length} 字</span>
    </article>)}<button type="button" onClick={onAdd} disabled={work.outlinePages.length >= 18} className="grid min-h-80 place-items-center rounded-2xl bg-muted text-muted-foreground transition-[background-color,color] hover:bg-[#f5f5f5] hover:text-foreground disabled:opacity-50"><span className="grid justify-items-center gap-2 text-sm"><Plus />添加一页</span></button></div>
  </div>
}

function GenerationStage({ work, images, busy, message, onBack, onRetryAll, onRegenerate }: { work: Work; images: ImageState[]; busy: boolean; message: string; onBack: () => void; onRetryAll: () => void; onRegenerate: (index: number) => void }) {
  const done = images.filter(image => image.status === 'done').length
  const failed = images.filter(image => image.status === 'error').length
  const percent = images.length ? Math.round(done / images.length * 100) : 0
  return <div className="mx-auto max-w-[1280px]"><header className="mb-8 flex flex-wrap items-end justify-between gap-5"><div><h1 className="text-2xl font-semibold">生成图片</h1><p className="mt-2 text-sm text-muted-foreground">{busy ? `正在生成，已完成 ${done} / ${images.length} 页` : failed ? `${failed} 张图片生成失败，可点击重试` : `全部 ${images.length} 张图片生成完成`}</p></div><div className="flex flex-wrap gap-2">{failed > 0 && !busy && <Button onClick={onRetryAll}><RefreshCw />一键补全失败图片</Button>}<Button variant="outline" onClick={onBack} disabled={busy}><ArrowLeft />返回大纲</Button></div></header>
    <section><div className="flex justify-between text-sm"><span>生成进度</span><span className="font-semibold text-primary">{percent}%</span></div><div className="mt-3 h-1 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-[width] duration-300" style={{ width: `${percent}%` }} /></div>{message && <p className="mt-4 text-sm text-destructive" role="alert">{message}</p>}<ImageGrid images={images} onRegenerate={onRegenerate} disabled={busy} /></section>
  </div>
}

function ImageGrid({ images, onRegenerate, onPreview, disabled }: { images: ImageState[]; onRegenerate: (index: number) => void; onPreview?: (url: string) => void; disabled: boolean }) {
  return <div className="mt-7 grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 sm:gap-x-5 lg:grid-cols-4 xl:grid-cols-5">{images.map(image => <article key={image.index} className="min-w-0"><div className="group relative aspect-[3/4] overflow-hidden rounded-2xl bg-muted">{image.status === 'done' && image.url ? <><button type="button" className="size-full" onClick={() => onPreview?.(image.url)} aria-label={`预览第 ${image.index + 1} 页`}><img src={image.url} alt={`第 ${image.index + 1} 页`} className="size-full object-cover" /></button><div className="absolute inset-x-0 bottom-0 flex justify-center bg-black/50 p-3 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"><Button size="sm" variant="secondary" disabled={disabled} onClick={() => onRegenerate(image.index)}><RefreshCw />重新生成</Button></div></> : image.status === 'error' ? <div className="flex size-full flex-col items-center justify-center gap-3 p-4 text-center"><span className="grid size-10 place-items-center rounded-full bg-destructive text-lg font-semibold text-white">!</span><span className="text-sm font-medium">生成失败</span><span className="line-clamp-3 text-xs leading-5 text-destructive">{image.error}</span><Button size="sm" onClick={() => onRegenerate(image.index)} disabled={disabled}>点击重试</Button></div> : <div className="flex size-full flex-col items-center justify-center gap-3 text-sm text-muted-foreground">{image.status === 'generating' || image.status === 'retrying' ? <><LoaderCircle className="animate-spin text-primary" />{image.status === 'retrying' ? '重试中…' : '生成中…'}</> : '等待中'}</div>}</div><div className="mt-3 flex items-center justify-between px-1 text-xs"><span className="text-foreground">第 {image.index + 1} 页</span><span className={image.status === 'done' ? 'text-[#777]' : image.status === 'error' ? 'text-destructive' : 'text-[#999]'}>{image.status === 'done' ? '已完成' : image.status === 'error' ? '失败' : image.status === 'retrying' ? '重试中' : image.status === 'generating' ? '生成中' : '等待中'}</span></div></article>)}</div>
}

function ResultStage({ work, setWork, images, busy, message, onPreview, onRegenerate }: { work: Work; setWork: (work: Work) => void; images: ImageState[]; busy: boolean; message: string; onPreview: (url: string) => void; onRegenerate: (index: number) => void }) {
  const publishSignature = publicationInputSignature({ title: work.selectedTitle || work.topic, copywriting: work.copywriting, tags: work.tags, images: images.map(image => ({ index: image.index, url: image.url })) })
  const publicationIsCurrent = work.publication ? publicationMatchesLatestWork(work.publication.createdAt, work.updatedAt, work.images.map(image => image.updatedAt)) : false
  const [contentStatus, setContentStatus] = useState<'idle' | 'generating' | 'done' | 'error'>(work.copywriting ? 'done' : 'idle')
  const [contentError, setContentError] = useState('')
  const [publishBusy, setPublishBusy] = useState(false)
  const [publishMessage, setPublishMessage] = useState('')
  const [publishedSignature, setPublishedSignature] = useState(publicationIsCurrent ? publishSignature : '')
  const qrIsCurrent = Boolean(work.publication && publishedSignature === publishSignature)

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

  return <div className="mx-auto max-w-[1280px]"><header className="mb-8 flex flex-wrap items-end justify-between gap-5"><div><h1 className="text-2xl font-semibold">生成结果</h1><p className="mt-2 text-sm text-muted-foreground">全部 {images.length} 张图片生成完成</p></div><Link to="/studio"><Button variant="outline"><Plus />再来一篇</Button></Link></header>
    {message && <p className="mb-4 text-sm text-destructive">{message}</p>}<ImageGrid images={images} onRegenerate={onRegenerate} onPreview={onPreview} disabled={busy} />
    <section className="mt-12"><h2 className="text-lg font-semibold">标题、文案和标签</h2>{contentStatus === 'idle' && <div className="mt-4 rounded-2xl bg-muted p-10 text-center"><Button onClick={() => void generateContent()}><Sparkles />生成标题、文案和标签</Button></div>}{contentStatus === 'generating' && <div className="mt-4 flex items-center justify-center gap-3 rounded-2xl bg-muted p-10 text-sm text-muted-foreground"><LoaderCircle className="animate-spin" />正在生成标题、文案和标签…</div>}{contentStatus === 'error' && <div className="mt-4 rounded-2xl bg-destructive/5 p-8 text-center"><p className="text-sm text-destructive">{contentError}</p><Button className="mt-4" variant="outline" onClick={() => void generateContent()}><RefreshCw />重新生成</Button></div>}{contentStatus === 'done' && <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(300px,0.75fr)]"><div className="grid gap-4"><div className="rounded-2xl bg-muted p-5"><h3 className="text-sm font-semibold">标题</h3><div className="mt-3 grid gap-2">{work.titles.map((title, index) => <button type="button" key={`${title}-${index}`} onClick={() => void saveContent({ ...work, selectedTitle: title })} className={`min-h-11 rounded-xl px-4 text-left text-sm transition-[background-color,color] ${work.selectedTitle === title ? 'bg-white text-foreground' : 'text-[#666] hover:bg-white/70'}`}><span className="mr-2 text-xs text-[#999]">{index === 0 ? '推荐' : `备选 ${index}`}</span>{title}</button>)}</div><Input className="mt-3 bg-white" value={work.selectedTitle} onChange={event => setWork({ ...work, selectedTitle: event.target.value })} onBlur={() => void saveContent(work)} aria-label="发布标题" /></div><div className="rounded-2xl bg-muted p-5"><h3 className="text-sm font-semibold">正文</h3><Textarea className="mt-3 min-h-56 bg-white leading-7" value={work.copywriting} onChange={event => setWork({ ...work, copywriting: event.target.value })} onBlur={() => void saveContent(work)} /></div><div className="rounded-2xl bg-muted p-5"><h3 className="text-sm font-semibold">标签</h3><Input className="mt-3 bg-white" value={work.tags.join(' ')} onChange={event => setWork({ ...work, tags: event.target.value.split(/\s+/).map(tag => tag.replace(/^#/, '')).filter(Boolean) })} onBlur={() => void saveContent(work)} /></div><Button variant="outline" onClick={() => void generateContent()}><RefreshCw />重新生成文案</Button></div><aside className="h-fit rounded-2xl bg-muted p-6 lg:sticky lg:top-10"><h3 className="text-base font-semibold">扫码发布</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">确认内容后生成发布二维码。</p><Button className="mt-5 w-full" onClick={() => void publish()} disabled={publishBusy || !work.selectedTitle || !work.copywriting || images.some(image => image.status !== 'done') || publishedSignature === publishSignature}>{publishBusy ? <LoaderCircle className="animate-spin" /> : <Send />}生成二维码</Button>{qrIsCurrent && publishMessage && <p className="mt-3 text-sm text-muted-foreground" role="status">{publishMessage}</p>}{qrIsCurrent && work.publication && <div className="mt-6 grid justify-items-center gap-3"><div className="rounded-2xl bg-white p-4"><QRCodeSVG value={work.publication.h5Url} size={176} /></div><a className="inline-flex h-11 items-center gap-2 text-sm font-semibold text-primary hover:underline" href={work.publication.h5Url} target="_blank" rel="noreferrer"><PencilLine className="size-4" />打开发布页</a></div>}</aside></div>}</section>
  </div>
}
