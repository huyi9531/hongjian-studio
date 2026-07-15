import { Link, createFileRoute, redirect, useRouter } from '@tanstack/react-router'
import { FileText, LoaderCircle, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { AppShell } from '@/components/app-shell'
import { Button } from '@/components/ui/button'
import { WorkspacePageHeader } from '@/components/workspace-page-header'
import { deleteWorkFn, listWorksFn, sessionFn } from '@/server/functions'

export const Route = createFileRoute('/works')({
  beforeLoad: async () => { if (!(await sessionFn()).authenticated) throw redirect({ to: '/login' }) },
  loader: () => listWorksFn({ data: {} }),
  component: Works,
})

const statusLabels: Record<string, string> = { draft: '草稿', outline: '大纲', generating: '生成中', result: '已完成' }

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
    <WorkspacePageHeader title="作品管理" description="继续编辑保存过的大纲、图片和发布内容。" actions={<Button asChild><Link to="/studio"><Plus />新建作品</Link></Button>} />
    {error && <p className="mt-5 text-sm text-destructive" role="alert">{error}</p>}
    {works.length ? <div className="mt-7 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">{works.map(work => <article key={work.id} className="group relative min-w-0 rounded-2xl bg-card p-3">
      <Link to="/studio/$workId" params={{ workId: work.id }} className="block min-w-0">
        <div className="aspect-[3/4] overflow-hidden rounded-xl bg-muted">{work.coverImageUrl ? <img src={work.coverImageUrl} alt={`${work.topic}封面`} className="size-full object-cover" /> : <span className="grid size-full place-items-center text-muted-foreground"><FileText size={28} /></span>}</div>
        <h2 className="mt-3 line-clamp-2 min-h-11 text-sm leading-[22px] font-medium sm:text-base sm:leading-6">{work.topic}</h2>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground"><span>{work.updatedAt.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}</span><span>{statusLabels[work.status] ?? work.status}</span></div>
      </Link>
      <Button type="button" size="icon-sm" variant="secondary" className="absolute top-5 right-5 bg-card/90 shadow-default backdrop-blur-sm hover:bg-card" aria-label={`删除${work.topic}`} title="删除作品" disabled={Boolean(deletingId)} onClick={() => void removeWork(work.id, work.topic)}>{deletingId === work.id ? <LoaderCircle className="animate-spin" /> : <Trash2 />}</Button>
    </article>)}</div> : <div className="mt-7 grid min-h-96 place-items-center rounded-2xl bg-card p-8 text-center"><div><span className="mx-auto grid size-14 place-items-center rounded-full bg-muted"><FileText className="size-6 text-muted-foreground" /></span><h2 className="mt-5 text-base font-medium">还没有作品</h2><p className="mt-2 text-sm text-muted-foreground">从一个主题开始创建第一份图文。</p><Button asChild className="mt-6"><Link to="/studio"><Plus />新建作品</Link></Button></div></div>}
  </section></AppShell>
}
