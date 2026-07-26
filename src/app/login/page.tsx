'use client'

import { Suspense } from 'react'
import LoginForm from './login-form'

function LoginSkeleton() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0D9C8D]/12 via-background to-[#4338CA]/12 p-6">
      <div className="w-full max-w-md rounded-2xl border bg-card p-8 shadow-sm animate-pulse">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-muted" />
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
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginSkeleton />}>
      <LoginForm />
    </Suspense>
  )
}
