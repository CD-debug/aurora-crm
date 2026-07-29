'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import { AuroraMark } from '@/components/shared'

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

  const fillDemo = () => {
    setEmail('demo@auroracrm.com')
    setPassword('Aurora2026!')
  }

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-[1fr_1.1fr]">
      {/* Left brand panel */}
      <div className="hidden lg:flex flex-col justify-between bg-[oklch(0.18_0.02_255)] p-10">
        <div>
          <div className="flex items-center gap-3">
            <AuroraMark size="md" showWordmark />
            <span className="font-heading font-medium tracking-[-0.02em] text-xl text-background">
              Aurora
            </span>
          </div>
        </div>
        <div className="space-y-6">
          <p className="font-heading text-3xl leading-tight text-background font-normal tracking-[-0.02em]">
            Case management for timeshare exit.
          </p>
          <p className="text-sm text-background/40 font-mono">
            v2.0 · trusted by 47 firms
          </p>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-sm"
        >
          {/* Mobile brand lockup */}
          <div className="flex flex-col items-center text-center mb-8 lg:hidden">
            <AuroraMark size="md" showWordmark />
            <p className="text-sm text-muted-foreground mt-2">
              Sign in to your Aurora workspace.
            </p>
          </div>

          {/* Desktop heading */}
          <div className="hidden lg:block mb-8">
            <h1 className="text-2xl font-heading font-semibold tracking-tight">Sign in</h1>
            <p className="text-sm text-muted-foreground mt-1">to your Aurora workspace.</p>
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

          <div className="mt-6 pt-5 border-t border-border space-y-3">
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <span>Demo access:</span>
              <Badge
                variant="outline"
                className="cursor-pointer font-mono text-xs hover:bg-muted/40"
                onClick={fillDemo}
              >
                demo@auroracrm.com
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              New timeshare inquiry?{' '}
              <Link href="/lead" className="text-primary hover:underline">
                Get a free consultation
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
