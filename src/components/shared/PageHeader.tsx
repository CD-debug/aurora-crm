'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface BreadcrumbProps {
  items: Array<{ label: string; href?: string }>
  className?: string
}

export function Breadcrumb({ items, className }: BreadcrumbProps) {
  return (
    <nav className={cn('flex items-center gap-1 text-sm', className)} aria-label="Breadcrumb">
      <ol className="flex items-center gap-1">
        {items.map((item, index) => (
          <li key={item.label} className="flex items-center gap-1">
            {index > 0 && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
            {item.href ? (
              <Link
                href={item.href}
                className={cn(
                  'font-medium transition-colors',
                  index === items.length - 1
                    ? 'text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {item.label}
              </Link>
            ) : (
              <span className="text-foreground font-medium">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}

interface PageHeaderProps {
  title: string
  subtitle?: string
  breadcrumbItems?: Array<{ label: string; href?: string }>
  action?: React.ReactNode
  className?: string
}

export function PageHeader({
  title,
  subtitle,
  breadcrumbItems,
  action,
  className,
}: PageHeaderProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const backHref = breadcrumbItems?.[0]?.href || '/clients'
  const backSearchParams = searchParams.toString()
    ? `${backHref}?${searchParams.toString()}`
    : backHref

  return (
    <header className={cn('sticky top-0 z-30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border', className)}>
      <div className="container mx-auto px-4 py-4">
        {breadcrumbItems && (
          <Breadcrumb
            items={[
              { label: breadcrumbItems[0].label, href: backSearchParams },
              ...breadcrumbItems.slice(1),
            ]}
            className="mb-3"
          />
        )}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-heading font-semibold tracking-tight">{title}</h1>
            {subtitle && <p className="text-muted-foreground mt-1">{subtitle}</p>}
          </div>
          {action && <div className="flex-shrink-0">{action}</div>}
        </div>
      </div>
    </header>
  )
}

export function ClientPageHeader({
  clientName,
  healthStatus,
  onBack,
}: {
  clientName: string
  healthStatus: 'on_track' | 'at_risk' | 'stalled'
  onBack: () => void
}) {
  const healthColors = {
    on_track: 'bg-green-100 text-green-800 border-green-200',
    at_risk: 'bg-amber-100 text-amber-800 border-amber-200',
    stalled: 'bg-red-100 text-red-800 border-red-200',
  }

  return (
    <header className="sticky top-0 z-30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-2 rounded-md hover:bg-accent text-muted-foreground transition-colors"
              aria-label="Back to clients"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-xl md:text-2xl font-heading font-semibold">{clientName}</h1>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${healthColors[healthStatus]}`}>
                {healthStatus.replace('_', ' ')}
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}