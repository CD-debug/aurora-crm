export default function ClientDetailLoading() {
  return (
    <div className="p-6 space-y-4">
      <div className="h-6 w-64 rounded-md bg-muted animate-pulse" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-lg border bg-card p-4 space-y-3">
            <div className="h-4 w-3/5 rounded bg-muted animate-pulse" />
            <div className="h-3.5 w-4/5 rounded bg-muted animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  )
}
