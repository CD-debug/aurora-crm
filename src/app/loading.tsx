export default function GlobalLoading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <div className="w-10 h-10 rounded-full border-[3px] border-border border-t-primary animate-spin" />
      <p className="mt-4 text-muted-foreground">Loading…</p>
    </div>
  )
}
