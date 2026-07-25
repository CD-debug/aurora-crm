'use client'

import { Button } from '@/components/ui/button'

export default function ClientDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] p-8 text-center">
      <h2 className="text-xl font-heading font-semibold mb-2">Unable to load client</h2>
      <p className="text-muted-foreground mb-6">
        The client you&apos;re looking for couldn&apos;t be loaded.
      </p>
      <Button onClick={reset}>Try again</Button>
    </div>
  )
}
