import { Link, useLocation } from '@tanstack/react-router'
import { FileText, PenLine, Settings } from 'lucide-react'
import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

const links = [
  { to: '/studio', label: '创作', icon: PenLine },
  { to: '/works', label: '作品', icon: FileText },
  { to: '/settings', label: '设置', icon: Settings },
]

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useLocation({ select: location => location.pathname })
  return <div className="min-h-[100dvh] bg-background">
    <aside className="sticky top-0 z-40 flex h-16 items-center border-b bg-white/95 px-4 backdrop-blur-sm lg:fixed lg:inset-y-0 lg:left-0 lg:h-auto lg:w-64 lg:flex-col lg:items-stretch lg:border-r-0 lg:px-5 lg:py-6 lg:backdrop-blur-none">
      <Link to="/studio" className="flex shrink-0 items-center gap-3 lg:h-12 lg:px-2" aria-label="红笺创作首页">
        <img src="/favicon.svg" alt="" className="size-9 rounded-xl" />
        <span className="text-base font-semibold">红笺</span>
      </Link>
      <nav className="ml-auto flex items-center gap-1 lg:mt-9 lg:ml-0 lg:grid lg:gap-2" aria-label="主导航">
        {links.map(({ to, label, icon: Icon }) => {
          const active = pathname === to || (to === '/studio' && pathname.startsWith('/studio/'))
          return <Link key={to} to={to} aria-label={label} title={label} className={cn('flex size-11 shrink-0 items-center justify-center gap-3 rounded-full text-[#666] transition-[background-color,color] hover:bg-muted hover:text-foreground lg:h-12 lg:w-full lg:justify-start lg:rounded-xl lg:px-4 lg:text-base', active && 'bg-[#f5f5f5] font-semibold text-foreground')}>
            <Icon size={20} strokeWidth={1.8} />
            <span className="hidden sm:inline">{label}</span>
          </Link>
        })}
      </nav>
    </aside>
    <main className="min-w-0 lg:ml-64">{children}</main>
  </div>
}
