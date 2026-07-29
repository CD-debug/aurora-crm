'use client'

import Link from 'next/link'
import { cn } from '@/lib/utils'
import { ChevronRight } from 'lucide-react'

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
