import { Link, createFileRoute, redirect } from '@tanstack/react-router'
import { ArrowUpRight, FileText, Plus } from 'lucide-react'
import { AppShell } from '@/components/app-shell'
import { Button } from '@/components/ui/button'
import { listWorksFn, sessionFn } from '@/server/functions'

export const Route = createFileRoute('/works')({
  beforeLoad: async () => { if (!(await sessionFn()).authenticated) throw redirect({ to: '/login' }) },
  loader: () => listWorksFn({ data: {} }),
  component: Works,
})

const statusLabels: Record<string, string> = { draft: '草稿', outline: '大纲', generating: '生成中', result: '已完成' }

function Works() {
  const works = Route.useLoaderData()
  return <AppShell><section className="mx-auto max-w-[1180px] px-4 py-8 sm:px-8 sm:py-10 lg:px-10">
    <header className="flex items-end justify-between gap-5"><div><h1 className="text-2xl font-semibold">作品</h1><p className="mt-2 text-sm text-muted-foreground">继续编辑保存过的大纲、图片和发布内容。</p></div><Button asChild><Link to="/studio"><Plus />新建作品</Link></Button></header>
    {works.length ? <div className="mt-10 grid gap-x-6 gap-y-8 sm:grid-cols-2 xl:grid-cols-3">{works.map(work => <Link key={work.id} to="/studio/$workId" params={{ workId: work.id }} className="group min-w-0 rounded-2xl bg-muted p-5 transition-[background-color,transform] hover:bg-[#f5f5f5] active:scale-[0.99]">
      <div className="flex items-start justify-between gap-4"><span className="grid size-11 shrink-0 place-items-center rounded-full bg-white text-[#666]"><FileText size={19} /></span><ArrowUpRight className="size-5 text-[#aaa] transition-[color,transform] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-foreground" /></div>
      <h2 className="mt-8 line-clamp-2 min-h-11 text-base leading-6 font-semibold">{work.topic}</h2>
      <div className="mt-4 flex items-center justify-between gap-3 text-xs text-[#999]"><span>{work.updatedAt.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span><span>{statusLabels[work.status] ?? work.status}</span></div>
    </Link>)}</div> : <div className="mt-24 grid place-items-center text-center"><span className="grid size-14 place-items-center rounded-full bg-muted"><FileText className="size-6 text-[#999]" /></span><h2 className="mt-5 text-base font-semibold">还没有作品</h2><p className="mt-2 text-sm text-muted-foreground">从一个主题开始创建第一份图文。</p><Button asChild className="mt-6"><Link to="/studio"><Plus />新建作品</Link></Button></div>}
  </section></AppShell>
}
