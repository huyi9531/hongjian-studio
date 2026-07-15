import { Link, createFileRoute, redirect } from '@tanstack/react-router'
import { ArrowUpRight, FileText, Plus } from 'lucide-react'
import { AppShell } from '@/components/app-shell'
import { Button } from '@/components/ui/button'
import { WorkspacePageHeader } from '@/components/workspace-page-header'
import { listWorksFn, sessionFn } from '@/server/functions'

export const Route = createFileRoute('/works')({
  beforeLoad: async () => { if (!(await sessionFn()).authenticated) throw redirect({ to: '/login' }) },
  loader: () => listWorksFn({ data: {} }),
  component: Works,
})

const statusLabels: Record<string, string> = { draft: '草稿', outline: '大纲', generating: '生成中', result: '已完成' }

function Works() {
  const works = Route.useLoaderData()
  return <AppShell><section className="mx-auto max-w-[1280px] px-4 py-8 sm:px-8 sm:py-10 lg:px-10">
    <WorkspacePageHeader title="作品管理" description="继续编辑保存过的大纲、图片和发布内容。" actions={<Button asChild><Link to="/studio"><Plus />新建作品</Link></Button>} />
    {works.length ? <div className="mt-7 grid gap-4 xl:grid-cols-2">{works.map(work => <Link key={work.id} to="/studio/$workId" params={{ workId: work.id }} className="group flex min-h-40 min-w-0 gap-5 rounded-2xl bg-card p-5 transition-colors hover:bg-secondary active:bg-accent">
      <span className="grid size-24 shrink-0 place-items-center rounded-xl bg-muted text-muted-foreground"><FileText size={24} /></span><div className="flex min-w-0 flex-1 flex-col"><div className="flex items-start justify-between gap-4"><h2 className="line-clamp-2 text-base leading-6 font-medium">{work.topic}</h2><ArrowUpRight className="size-5 shrink-0 text-muted-foreground transition-[color,transform] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-foreground" /></div><div className="mt-auto flex items-center justify-between gap-3 text-xs text-muted-foreground"><span>{work.updatedAt.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span><span>{statusLabels[work.status] ?? work.status}</span></div></div>
    </Link>)}</div> : <div className="mt-7 grid min-h-96 place-items-center rounded-2xl bg-card p-8 text-center"><div><span className="mx-auto grid size-14 place-items-center rounded-full bg-muted"><FileText className="size-6 text-muted-foreground" /></span><h2 className="mt-5 text-base font-medium">还没有作品</h2><p className="mt-2 text-sm text-muted-foreground">从一个主题开始创建第一份图文。</p><Button asChild className="mt-6"><Link to="/studio"><Plus />新建作品</Link></Button></div></div>}
  </section></AppShell>
}
