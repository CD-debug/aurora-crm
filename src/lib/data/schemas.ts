// Shared Zod schemas — NO 'use server' directive here.
// Server action files ('use server') can only export async functions,
// so value-level schemas live here and get imported by both
// mutations.ts (server actions) and API routes.
import { z } from 'zod'

export const clientInput = z.object({
  name: z.string().trim().min(1, 'Name is required').max(255),
  phone: z.string().trim().min(1, 'Phone is required').max(40),
  email: z.string().trim().email('Enter a valid email').max(255),
  state: z.string().trim().length(2, 'Use the 2-letter state code').toUpperCase(),
  zip: z.string().trim().min(3, 'Enter a ZIP code').max(10),
  tags: z.array(z.string().trim().min(1).max(40)).max(12).optional(),
})
