import { Link, createFileRoute, redirect, useRouter } from '@tanstack/react-router'
import { FileText, LoaderCircle, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { AppShell } from '@/components/app-shell'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { WorkspacePageHeader } from '@/components/workspace-page-header'
import { deleteWorkFn, listWorksFn, sessionFn } from '@/server/functions'

export const Route = createFileRoute('/works')({
  beforeLoad: async () => { if (!(await sessionFn()).authenticated) throw redirect({ to: '/login' }) },
  loader: () => listWorksFn({ data: {} }),
  component: Works,
})

const statusLabels: Record<string, string> = { draft: '草稿', outline: '大纲', generating: '后台生成中', interrupted: '生成已中断', partial_failed: '生成部分失败', result: '已完成', checking_publishability: '正在校验发布', publishable: '可发布', unpublishable: '不可发布', published: '已发布' }

function formatUpdatedAt(updatedAt: Date): string {
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const updated = new Date(updatedAt.getFullYear(), updatedAt.getMonth(), updatedAt.getDate()).getTime()
  const days = Math.round((startOfToday - updated) / (24 * 60 * 60 * 1000))
  if (days <= 0) return '今天'
  if (days === 1) return '昨天'
  if (days <= 3) return `${days} 天前`
  return updatedAt.toLocaleDateString('zh-CN', { year: 'numeric', month: 'short', day: 'numeric' })
}

function Works() {
  const works = Route.useLoaderData()
  const router = useRouter()
  const [deletingId, setDeletingId] = useState('')
  const [error, setError] = useState('')

  async function removeWork(workId: string, topic: string) {
    if (deletingId || !window.confirm(`确定删除“${topic}”吗？删除后无法恢复。`)) return
    setDeletingId(workId)
    setError('')
    try {
      await deleteWorkFn({ data: { workId } })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '删除失败，请重试')
    } finally {
      await router.invalidate()
      setDeletingId('')
    }
  }

  return <AppShell><section className="mx-auto max-w-[1280px] px-4 py-8 sm:px-8 sm:py-10 lg:px-10">
    <WorkspacePageHeader eyebrow="红笺 · 归档" title="作品管理" description="继续编辑保存过的大纲、图片和发布内容。" actions={<Button asChild><Link to="/studio"><Plus />新建作品</Link></Button>} />
    {error && <p className="mt-5 text-sm text-destructive" role="alert">{error}</p>}
    {works.length ? <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 2xl:grid-cols-5">{works.map(work => <article key={work.id} className="group relative min-w-0 rounded-2xl bg-card p-2.5">
      <Link to="/studio/$workId" params={{ workId: work.id }} className="block min-w-0">
        <div className="aspect-[3/4] overflow-hidden rounded-xl bg-muted">{work.coverImageUrl ? <img src={work.coverImageUrl} alt={`${work.topic}封面`} className="size-full object-cover" /> : <span className="grid size-full place-items-center text-muted-foreground"><FileText size={28} /></span>}</div>
        <h2 className="mt-3 line-clamp-2 min-h-11 text-sm leading-[22px] font-medium sm:text-base sm:leading-6">{work.topic}</h2>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground"><span className="font-folio">{formatUpdatedAt(work.updatedAt)}</span><span>{statusLabels[work.status] ?? work.status}</span></div>
        {work.archiveUnavailable && <p className="mt-2 text-xs text-muted-foreground">部分图片未归档</p>}
      </Link>
      <Button type="button" size="icon-sm" variant="secondary" className="absolute top-4 right-4 size-9 min-h-9 bg-card/90 shadow-default backdrop-blur-sm hover:bg-card" aria-label={`删除${work.topic}`} title="删除作品" disabled={Boolean(deletingId)} onClick={() => void removeWork(work.id, work.topic)}>{deletingId === work.id ? <LoaderCircle className="animate-spin" /> : <Trash2 />}</Button>
    </article>)}</div> : <EmptyState className="mt-7 min-h-96" icon={<FileText className="size-6" />} title="还没有作品" description="从第一页开始，红笺会替你安排文案、封面和发布。" action={<Button asChild><Link to="/studio"><Plus />新建作品</Link></Button>} />}
  </section></AppShell>
}
