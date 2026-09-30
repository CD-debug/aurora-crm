'use client'

import Link from 'next/link'
import { cn } from '@/lib/utils'
import { LayoutDashboard, Users, ListChecks, Settings, Menu, X, Search } from 'lucide-react'
import { GlobalSearch } from './GlobalSearch'
import { AuroraMark } from './AuroraMark'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/clients', label: 'Clients', icon: Users },
  { href: '/tasks', label: 'Tasks', icon: ListChecks },
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
    <aside className="hidden lg:fixed lg:left-0 lg:top-0 lg:z-40 lg:h-screen lg:w-16 bg-sidebar border-r border-sidebar-border lg:flex lg:flex-col lg:items-center">
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

export function MobileNavBar() {
  const pathname = usePathname()
  const [activeIdx, setActiveIdx] = useState(-1)

  useEffect(() => {
    const idx = navItems.findIndex(
      (item) => pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
    )
    setActiveIdx(idx)
  }, [pathname])

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-sidebar border-t border-sidebar-border">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item, index) => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center gap-1 px-3 py-2 rounded-xl text-xs font-medium transition-colors',
                isActive
                  ? 'text-primary bg-primary/10'
                  : 'text-sidebar-foreground/70 active:text-sidebar-foreground'
              )}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
            >
              <item.icon className="w-5 h-5" aria-hidden="true" />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

export function MobileNavDrawer() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button
        className="lg:hidden fixed bottom-24 right-4 z-50 rounded-full shadow-lg"
        onClick={() => setOpen(true)}
        aria-label="Open navigation"
        variant="default"
        size="icon"
      >
        <Menu className="w-6 h-6" />
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-72 p-0">
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <Link href="/" className="flex items-center justify-center" aria-label="Aurora home">
                <AuroraMark size="sm" />
              </Link>
              <Button variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label="Close">
                <X className="w-5 h-5" />
              </Button>
            </div>

            <nav className="flex-1 p-4 space-y-1 overflow-y-auto" aria-label="Main navigation">
              {navItems.map((item) => {
                const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      'flex items-center gap-3 px-3 py-3 rounded-xl text-base font-medium transition-colors',
                      isActive
                        ? 'bg-primary/10 text-primary'
                        : 'text-sidebar-foreground hover:bg-sidebar-accent'
                    )}
                    aria-label={item.label}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <item.icon className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
                    {item.label}
                  </Link>
                )
              })}
            </nav>

            <div className="p-4 border-t">
              <GlobalSearch />
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}