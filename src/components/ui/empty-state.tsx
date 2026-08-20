import type * as React from "react"

import { cn } from "@/lib/utils"

export function EmptyState({ icon, title, description, action, className }: {
  icon?: React.ReactNode
  title?: React.ReactNode
  description?: React.ReactNode
  action?: React.ReactNode
  className?: string
}) {
  return (
    <section role="status" className={cn("grid place-items-center rounded-2xl bg-card p-8 sm:p-10 text-center", className)}>
      <div className="grid justify-items-center gap-3">
        {icon && <span className="grid size-14 place-items-center rounded-full bg-muted text-muted-foreground">{icon}</span>}
        {title && <h2 className="text-base font-medium">{title}</h2>}
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
        {action && <div className="mt-2">{action}</div>}
      </div>
    </section>
  )
}