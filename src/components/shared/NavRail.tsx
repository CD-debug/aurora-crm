'use client'

import Link from 'next/link'
import { cn } from '@/lib/utils'
import { LayoutDashboard, Users, ListChecks, BarChart3, Settings } from 'lucide-react'
import { GlobalSearch } from './GlobalSearch'
import { AuroraMark } from './AuroraMark'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/clients', label: 'Clients', icon: Users },
  { href: '/tasks', label: 'Tasks', icon: ListChecks },
  { href: '/reports', label: 'Reports', icon: BarChart3 },
  { href: '/settings', label: 'Settings', icon: Settings },
] as const

const ITEM_HEIGHT = 44

export function NavRail() {
  const pathname = usePathname()
  const [activeIdx, setActiveIdx] = useState(-1)

  useEffect(() => {
    const idx = navItems.findIndex(
      (item) => pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
    )
    setActiveIdx(idx)
  }, [pathname])

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-16 bg-sidebar border-r border-sidebar-border flex flex-col items-center">
      <Link
        href="/"
        className="mt-4 mb-6 flex items-center justify-center"
        aria-label="Aurora home"
      >
        <AuroraMark size="sm" />
      </Link>

      <nav className="relative flex flex-col items-center gap-1" aria-label="Main navigation">
        <span
          className="absolute left-0 w-[3px] h-6 rounded-r-full bg-aurora-arc transition-[top] duration-200 ease-out"
          style={{ top: activeIdx >= 0 ? activeIdx * ITEM_HEIGHT + 2 : 0, opacity: activeIdx >= 0 ? 1 : 0 }}
        />

        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'group relative flex items-center justify-center w-12 h-11 rounded-xl text-sm font-medium transition-all duration-150',
                isActive
                  ? 'text-foreground bg-primary/10'
                  : 'text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent'
              )}
              aria-label={item.label}
              tabIndex={0}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" aria-hidden="true" />

              <span
                className={cn(
                  'absolute left-full ml-3 px-3 py-1.5 rounded-lg whitespace-nowrap text-sm font-medium pointer-events-none',
                  'bg-foreground text-background shadow-lg border border-border/30',
                  'opacity-0 -translate-x-1 scale-95 transition-all duration-150 ease-out',
                  'group-hover:opacity-100 group-hover:translate-x-0 group-hover:scale-100',
                  'group-focus-visible:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:scale-100'
                )}
              >
                <span className="absolute right-full top-1/2 -translate-y-1/2 w-2 h-2 bg-foreground rotate-45 -mr-1 rounded-sm" />
                {item.label}
              </span>
            </Link>
          )
        })}
      </nav>

      <div className="mt-auto mb-6">
        <GlobalSearch />
      </div>
    </aside>
  )
}
