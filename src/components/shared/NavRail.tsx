'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useRef } from 'react'
import { cn } from '@/lib/utils'
import { LayoutDashboard, Users, ListChecks, Search } from 'lucide-react'
import { GlobalSearch } from './GlobalSearch'

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/clients', label: 'Clients', icon: Users },
  { href: '/tasks', label: 'Tasks', icon: ListChecks },
] as const

const ITEM_HEIGHT = 44

export function NavRail() {
  const pathname = usePathname()
  const [activeIdx, setActiveIdx] = useState(() => {
    return navItems.findIndex(
      (item) => pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
    )
  })
  const prevPath = useRef(pathname)

  if (pathname !== prevPath.current) {
    prevPath.current = pathname
    const idx = navItems.findIndex(
      (item) => pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
    )
    if (idx !== activeIdx) setActiveIdx(idx)
  }

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-16 bg-sidebar border-r border-sidebar-border flex flex-col items-center">
      {/* Logo orb */}
      <Link
        href="/"
        className="mt-4 mb-6 flex items-center justify-center w-9 h-9 rounded-xl bg-aurora-arc text-white font-heading font-bold text-lg transition-transform hover:scale-110"
        aria-label="Aurora home"
      >
        A
      </Link>

      {/* Nav items */}
      <nav className="relative flex flex-col items-center gap-1" aria-label="Main navigation">
        {/* Magic indicator — slides behind active icon */}
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
                  : 'text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent hover:scale-110'
              )}
              aria-label={item.label}
              tabIndex={0}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" aria-hidden="true" />

              {/* Floating tooltip — appears on hover or keyboard focus */}
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

      {/* Search */}
      <div className="mt-auto mb-6">
        <GlobalSearch variant="icon" />
      </div>
    </aside>
  )
}
