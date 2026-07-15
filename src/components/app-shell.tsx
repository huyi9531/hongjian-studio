import { Link, useLocation } from '@tanstack/react-router'
import { FileText, Home, Plus, Settings } from 'lucide-react'
import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

const links = [
  { to: '/studio', label: '创作首页', icon: Home },
  { to: '/works', label: '作品管理', icon: FileText },
  { to: '/settings', label: '设置', icon: Settings },
]

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useLocation({ select: location => location.pathname })
  return <div className="min-h-[100dvh] bg-background">
    <header className="fixed inset-x-0 top-0 z-50 flex h-16 items-center border-b border-hairline bg-card px-4 sm:px-6">
      <Link to="/studio" className="flex min-w-0 items-center gap-3" aria-label="红笺创作首页">
        <img src="/favicon.svg" alt="" className="size-9 rounded-xl" />
        <span className="shrink-0 text-base font-semibold">红笺</span>
        <span className="hidden truncate border-l border-hairline pl-3 text-sm text-muted-foreground sm:block">创作服务平台</span>
      </Link>
      <nav className="ml-auto flex items-center gap-1 lg:hidden" aria-label="主导航">
        {links.map(({ to, label, icon: Icon }) => {
          const active = pathname === to || (to === '/studio' && pathname.startsWith('/studio/'))
          return <Link key={to} to={to} aria-label={label} title={label} className={cn('grid size-11 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground', active && 'bg-accent font-medium text-foreground')}>
            <Icon size={20} strokeWidth={1.8} />
          </Link>
        })}
      </nav>
    </header>

    <aside className="fixed inset-y-0 left-0 z-40 hidden w-56 border-r border-hairline bg-card px-4 pt-20 pb-5 lg:flex lg:flex-col">
      <Link to="/studio" className="flex h-11 items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover active:bg-primary-pressed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring-soft focus-visible:ring-offset-2" aria-label="新建创作">
        <Plus size={18} strokeWidth={2} />
        <span>新建创作</span>
      </Link>
      <nav className="mt-5 grid gap-1" aria-label="主导航">
        {links.map(({ to, label, icon: Icon }) => {
          const active = pathname === to || (to === '/studio' && pathname.startsWith('/studio/'))
          return <Link key={to} to={to} className={cn('flex h-12 items-center gap-3 rounded-lg px-4 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground', active && 'bg-black/6 font-medium text-foreground')}>
            <Icon size={20} strokeWidth={1.8} />
            <span>{label}</span>
          </Link>
        })}
      </nav>
      <p className="mt-auto px-4 text-xs leading-5 text-muted-foreground">红笺 · 单人创作工作台</p>
    </aside>

    <main className="min-h-[100dvh] min-w-0 bg-background pt-16 lg:ml-56">{children}</main>
  </div>
}
