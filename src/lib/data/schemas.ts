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
  // Intake fields — all optional (existing records have nulls)
  dob: z.iso.date('Enter a valid date of birth').nullable().optional(),
  ssn_last4: z
    .string()
    .regex(/^\d{4}$/, 'Exactly 4 digits')
    .nullable()
    .optional(),
  co_client_name: z.string().trim().max(255).nullable().optional(),
  address: z.string().trim().max(500).nullable().optional(),
  phone2: z.string().trim().max(40).nullable().optional(),
  retainer_fee: z.coerce.number().finite().nonnegative().nullable().optional(),
})

export const propertyIntakeInput = z.object({
  usage_frequency: z.enum(['annual', 'biennial', 'odd_year', 'even_year']).nullable().optional(),
  usage_type: z.enum(['fixed_week', 'floating_week', 'points_based']).nullable().optional(),
  fees_current: z.boolean().optional(),
  fees_behind_amount: z.coerce.number().finite().nonnegative().nullable().optional(),
  maintenance_fees_billed: z.coerce.number().finite().nonnegative().nullable().optional(),
})
