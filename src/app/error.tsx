'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Global error:', error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 text-center">
      <h1 className="text-2xl font-heading font-semibold mb-2">Something went wrong</h1>
      <p className="text-muted-foreground mb-6 max-w-md">
        We encountered an unexpected error. Please try refreshing the page.
      </p>
      <Button onClick={reset}>Try again</Button>
    </div>
  )
}
