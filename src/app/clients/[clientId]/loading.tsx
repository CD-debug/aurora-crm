// Skeleton for Client 360 — header, stats grid, properties, two-column below.
function Sk({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-muted ${className}`} />
}

export default function ClientDetailLoading() {
  return (
    <div className="flex min-h-screen bg-background">
      <aside className="fixed left-0 top-0 z-40 h-screen w-16 bg-sidebar border-r border-sidebar-border" />
      <main className="flex-1 ml-16 overflow-auto">
        {/* Sticky header skeleton */}
        <header className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border">
          <div className="container mx-auto px-4 py-3">
            <div className="mb-2 flex items-center gap-2">
              <Sk className="h-4 w-12" />
              <span className="text-muted-foreground text-sm">/</span>
              <Sk className="h-4 w-32" />
            </div>
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <Sk className="h-7 w-48" />
                <Sk className="h-6 w-20" />
                <Sk className="h-6 w-20" />
              </div>
              <div className="flex items-center gap-3">
                <Sk className="h-4 w-32" />
              </div>
            </div>
          </div>
        </header>

        <div className="container mx-auto px-4 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {/* Stepper */}
              <Sk className="h-12" />
              {/* Stat cards: 9-tile grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {Array.from({ length: 9 }).map((_, i) => (
                  <div key={i} className="rounded-lg border bg-card p-3 space-y-2">
                    <Sk className="h-3.5 w-1/2" />
                    <Sk className="h-5 w-3/5" />
                  </div>
                ))}
              </div>
              {/* Properties block */}
              <div className="rounded-xl border bg-card p-5 space-y-3">
                <Sk className="h-5 w-32" />
                <Sk className="h-16 w-full" />
                <Sk className="h-16 w-full" />
              </div>
            </div>
            {/* Tasks right column */}
            <div className="rounded-xl border bg-card p-4 space-y-3">
              <Sk className="h-5 w-32" />
              <Sk className="h-12 w-full" />
              <Sk className="h-8 w-full" />
              <Sk className="h-8 w-full" />
              <Sk className="h-8 w-full" />
            </div>
          </div>
        </div>
        <span className="sr-only">Loading client…</span>
      </main>
    </div>
  )
}
