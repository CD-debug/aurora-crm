'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { motion } from 'framer-motion'

function AuroraOrb({ size = 'md' }: { size?: 'sm' | 'md' }) {
  const dim = size === 'md' ? 'w-12 h-12' : 'w-10 h-10'
  return (
    <div className={`${dim} rounded-2xl bg-aurora-arc text-white font-heading font-bold text-2xl flex items-center justify-center shadow-lg`}>
      A
    </div>
  )
}

export default function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const redirectTo = searchParams.get('redirectTo') || '/'

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      toast.error(error.message)
      setLoading(false)
    } else {
      toast.success('Welcome back.')
      router.push(redirectTo)
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0D9C8D]/12 via-background to-[#4338CA]/12 p-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md"
      >
        <div className="rounded-2xl border bg-card p-8 shadow-sm">
          <div className="flex flex-col items-center text-center mb-6">
            <AuroraOrb size="md" />
            <h1 className="mt-4 text-2xl font-heading font-semibold tracking-tight">Aurora</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Sign in to your Aurora workspace.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
                autoComplete="email"
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
                disabled={loading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>

          <div className="mt-6 pt-5 border-t border-border space-y-2">
            <p className="text-xs text-muted-foreground text-center">
              Demo access:{' '}
              <button
                type="button"
                onClick={() => {
                  setEmail('demo@auroracrm.com')
                  setPassword('Aurora2026!')
                }}
                className="font-mono text-xs text-foreground/80 hover:text-foreground underline-offset-2 hover:underline"
              >
                demo@auroracrm.com
              </button>
            </p>
            <p className="text-xs text-muted-foreground text-center">
              New timeshare inquiry?{' '}
              <Link href="/lead" className="text-primary hover:underline">
                Get a free consultation
              </Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
