'use client'

export default function SettingsError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex min-h-screen bg-background items-center justify-center p-8">
      <div className="max-w-lg text-center space-y-4">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-surface-danger/10 mb-2">
          <svg className="w-8 h-8 text-surface-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
        </div>
        <h1 className="text-xl font-semibold">Settings Page Error</h1>
        <p className="text-sm text-muted-foreground break-all">
          {error.message || error.digest ? `Digest: ${error.digest}` : 'Something went wrong.'}
        </p>
        <pre className="text-xs text-left bg-muted p-4 rounded-lg overflow-auto max-h-48 text-muted-foreground">
          {error.stack || 'No stack trace available'}
        </pre>
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Try Again
        </button>
      </div>
    </div>
  )
}
