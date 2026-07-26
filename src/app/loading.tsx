// Skeleton placeholders that mirror the content layout (PRD §8.7) so the page
// doesn't shift when real data arrives.
function Sk({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-muted ${className}`} />
}

export default function GlobalLoading() {
  return (
    <div className="flex min-h-screen bg-background">
      <aside className="fixed left-0 top-0 z-40 h-screen w-16 bg-sidebar border-r border-sidebar-border" />
      <main className="flex-1 ml-16">
        <div className="container mx-auto px-4 py-6 space-y-6">
          {/* Page heading */}
          <div className="space-y-2">
            <Sk className="h-7 w-48" />
            <Sk className="h-4 w-80" />
          </div>
          {/* Metric tiles */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Sk key={i} className="h-20" />
            ))}
          </div>
          {/* Pipeline + attention */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Sk className="lg:col-span-2 h-64" />
            <Sk className="h-64" />
          </div>
        </div>
        <span className="sr-only">Loading…</span>
      </main>
    </div>
  )
}
