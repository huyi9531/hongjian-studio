import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function WorkspacePageHeader({ title, description, eyebrow, status, actions, className }: {
  title: ReactNode
  description?: ReactNode
  eyebrow?: ReactNode
  status?: ReactNode
  actions?: ReactNode
  className?: string
}) {
  return <header className={cn('flex flex-wrap items-end justify-between gap-5', className)}>
    <div className="min-w-0">
      {eyebrow && <div className="mb-1 text-[var(--scale-eyebrow)] uppercase tracking-[var(--scale-eyebrow-tracking)] text-muted-foreground">{eyebrow}</div>}
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-[var(--scale-page-title)] leading-[var(--scale-page-title-leading)] font-semibold tracking-[var(--scale-page-title-tracking)]">{title}</h1>
        {status && <div className="text-xs text-muted-foreground" role="status">{status}</div>}
      </div>
      {description && <div className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</div>}
    </div>
    {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
  </header>
}
