'use client'

import { type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Breadcrumb } from './Breadcrumb'

interface BreadcrumbItem {
  label: string
  href?: string
}

/** Reusable page header: sticky bar with breadcrumb + title + subtitle + optional actions. */
export function PageHeader({
  title,
  subtitle,
  actions,
  breadcrumb,
  className,
}: {
  title: string
  subtitle?: string | ReactNode
  actions?: ReactNode
  breadcrumb?: BreadcrumbItem[]
  className?: string
}) {
  return (
    <header className={cn('border-b border-border bg-background/95 backdrop-blur sticky top-0 z-30', className)}>
      <div className="container mx-auto px-4 py-3">
        {breadcrumb && breadcrumb.length > 0 && (
          <Breadcrumb items={breadcrumb} className="mb-1" />
        )}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-heading font-semibold">{title}</h1>
            {subtitle && (
              <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
            )}
          </div>
          {actions && <div className="flex-shrink-0">{actions}</div>}
        </div>
      </div>
    </header>
  )
}

export { Breadcrumb }
