'use client'

import { Suspense } from 'react'
import LoginForm from './login-form'

function LoginSkeleton() {
  return (
    <div className="min-h-screen animate-pulse grid grid-cols-1 lg:grid-cols-[1fr_1.1fr]">
      <div className="hidden lg:flex flex-col justify-between bg-[oklch(0.18_0.02_255)] p-10">
        <div className="h-8 w-32 rounded bg-background/10" />
        <div className="space-y-3">
          <div className="h-8 w-64 rounded bg-background/10" />
          <div className="h-3 w-40 rounded bg-background/10" />
        </div>
      </div>
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-4">
          <div className="flex flex-col items-center mb-6">
            <div className="w-10 h-10 rounded bg-muted" />
            <div className="mt-4 h-6 w-28 rounded bg-muted" />
            <div className="mt-2 h-3 w-44 rounded bg-muted" />
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="h-3 w-12 rounded bg-muted" />
              <div className="h-9 w-full rounded bg-muted" />
            </div>
            <div className="space-y-2">
              <div className="h-3 w-16 rounded bg-muted" />
              <div className="h-9 w-full rounded bg-muted" />
            </div>
            <div className="h-9 w-full rounded bg-muted" />
          </div>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginSkeleton />}>
      <LoginForm />
    </Suspense>
  )
}
