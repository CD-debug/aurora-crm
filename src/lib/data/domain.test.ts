import { describe, it, expect } from 'vitest'
import {
  STAGES,
  STAGE_LABELS,
  HEALTH_LABELS,
  stageIndex,
  stagePercent,
  taskStatus,
  isDueSoon,
  daysSince,
  financialProgress,
  findDuplicates,
  filterClients,
  normalizePhone,
} from './domain'
import type { Client, ClientWithHealth, Property } from './types'

describe('stageIndex / stagePercent', () => {
  it('returns pipeline position', () => {
    expect(stageIndex('consultation')).toBe(0)
    expect(stageIndex('resolved')).toBe(3)
  })

  it('percent grows 0 -> 33 -> 67 -> 100 across stages', () => {
    expect(stagePercent('consultation')).toBe(0)
    expect(stagePercent('exit_plan')).toBe(33)
    expect(stagePercent('in_progress')).toBe(67)
    expect(stagePercent('resolved')).toBe(100)
  })

  it('exposes labels for every stage', () => {
    for (const s of STAGES) expect(STAGE_LABELS[s]).toBeTruthy()
  })
})

describe('taskStatus', () => {
  const now = new Date('2026-07-24T12:00:00Z')

  it('completed wins over overdue', () => {
    expect(taskStatus({ due_date: '2020-01-01', completed_at: '2026-06-01T00:00:00Z' }, now)).toBe('completed')
  })

  it('past due date and not completed is overdue', () => {
    expect(taskStatus({ due_date: '2026-07-23', completed_at: null }, now)).toBe('overdue')
  })

  it('due today is upcoming (boundary is inclusive)', () => {
    expect(taskStatus({ due_date: '2026-07-24', completed_at: null }, now)).toBe('upcoming')
  })

  it('future due is upcoming', () => {
    expect(taskStatus({ due_date: '2027-01-01', completed_at: null }, now)).toBe('upcoming')
  })
})

describe('isDueSoon', () => {
  const now = new Date('2026-07-24T12:00:00Z')

  it('within 3 days and upcoming is dueSoon', () => {
    expect(isDueSoon({ due_date: '2026-07-27', completed_at: null }, now)).toBe(true)
  })

  it('overdue is never dueSoon', () => {
    expect(isDueSoon({ due_date: '2026-07-20', completed_at: null }, now)).toBe(false)
  })

  it('far future is not dueSoon', () => {
    expect(isDueSoon({ due_date: '2027-01-01', completed_at: null }, now)).toBe(false)
  })

  it('completed is never dueSoon', () => {
    expect(isDueSoon({ due_date: '2026-07-26', completed_at: '2026-07-25T00:00:00Z' }, now)).toBe(false)
  })
})

describe('daysSince', () => {
  it('counts full days', () => {
    expect(daysSince('2026-07-22T00:00:00Z', new Date('2026-07-24T00:00:00Z'))).toBe(2)
  })
})

describe('financialProgress', () => {
  it('sums owed from active properties and eliminated from paid_off', () => {
    const props: Array<Pick<Property, 'status' | 'loan_balance' | 'value_eliminated'>> = [
      { status: 'active', loan_balance: 10000, value_eliminated: null },
      { status: 'paid_off', loan_balance: 0, value_eliminated: 5000 },
    ]
    const fin = financialProgress(props as unknown as Property[])
    expect(fin.owed).toBe(10000)
    expect(fin.eliminated).toBe(5000)
    expect(fin.percent).toBe(33)
  })

  it('falls back to loan_balance when value_eliminated is null on a paid_off property', () => {
    const props: Array<Pick<Property, 'status' | 'loan_balance' | 'value_eliminated'>> = [
      { status: 'paid_off', loan_balance: 4000, value_eliminated: null },
    ]
    const fin = financialProgress(props as unknown as Property[])
    expect(fin.eliminated).toBe(4000)
  })

  it('handles all nulls cleanly', () => {
    const fin = financialProgress([])
    expect(fin).toEqual({ owed: 0, eliminated: 0, percent: 0 })
  })
})

describe('normalizePhone', () => {
  it('strips US country code', () => {
    expect(normalizePhone('+1 (555) 555-5555')).toBe('5555555555')
  })
  it('leaves raw digits', () => {
    expect(normalizePhone('5555555555')).toBe('5555555555')
  })
  it('drops non-digits', () => {
    expect(normalizePhone('555.555.5555')).toBe('5555555555')
  })
})

describe('findDuplicates', () => {
  const base: Array<Pick<Client, 'id' | 'name' | 'email' | 'phone'>> = [
    { id: '1', name: 'Jane Doe', email: 'Jane@Example.com', phone: '555-555-5555' },
    { id: '2', name: 'Joe Smith', email: 'joe@example.com', phone: '555-111-2222' },
  ]

  it('matches by case-insensitive email', () => {
    expect(findDuplicates(base, { name: 'Z', email: 'jane@EXAMPLE.com', phone: '999' }).map((c) => c.id))
      .toEqual(['1'])
  })

  it('matches by normalized phone', () => {
    expect(findDuplicates(base, { name: 'Z', email: '', phone: '+1 (555) 555-5555' }).map((c) => c.id))
      .toEqual(['1'])
  })

  it('matches by exact case-insensitive name', () => {
    expect(findDuplicates(base, { name: 'jane doe', email: '', phone: '' }).map((c) => c.id))
      .toEqual(['1'])
  })

  it('ignores empty fields', () => {
    expect(findDuplicates(base, { name: 'Z', email: '', phone: '' })).toEqual([])
  })

  it('excludes the record with excludeId', () => {
    expect(findDuplicates(base, { name: 'jane doe', email: 'jane@example.com', phone: '5555555555' }, '1')).toEqual([])
  })
})

describe('filterClients', () => {
  const make = (overrides: Partial<ClientWithHealth>): ClientWithHealth =>
    ({
      id: 'a', author_id: 'u', name: 'Jane', phone: '5555555555', email: 'jane@example.com',
      state: 'FL', zip: '33101', stage: 'consultation', stage_entered_at: '2026-07-01',
      case_opened_at: '2026-07-01', resolved_at: null, assigned_rep_id: null,
      tags: [], created_at: '2026-07-01', updated_at: '2026-07-01',
      last_contact_at: null, open_task_count: 0, overdue_task_count: 0,
      next_task_due: null, health_status: 'on_track',
      ...overrides,
    }) as ClientWithHealth

  const rows: ClientWithHealth[] = [
    make({ id: '1', name: 'Jane Doe', state: 'FL', stage: 'in_progress', health_status: 'at_risk', tags: ['VIP'], phone: '5551111111', email: 'jane@example.com' }),
    make({ id: '2', name: 'Joe Smith', state: 'CA', stage: 'resolved', health_status: 'on_track', tags: [], phone: '5553333333', email: 'joe@example.com' }),
    make({ id: '3', name: 'Alice Wong', state: 'NY', stage: 'exit_plan', health_status: 'stalled', tags: ['Referral'], phone: '5552222222', email: 'alice@example.com' }),
  ]

  it('search matches name, phone, or email (case-insensitive substring)', () => {
    expect(filterClients(rows, { search: 'wong' }).map((c) => c.id)).toEqual(['3'])
    expect(filterClients(rows, { search: '5551111111' }).map((c) => c.id)).toEqual(['1'])
    expect(filterClients(rows, { search: 'jane@example.com' }).map((c) => c.id)).toEqual(['1'])
  })

  it('health filter', () => {
    expect(filterClients(rows, { health: 'stalled' }).map((c) => c.id)).toEqual(['3'])
    expect(filterClients(rows, { health: 'on_track' }).map((c) => c.id)).toEqual(['2'])
  })

  it('stage=active is a pseudo-filter that excludes resolved', () => {
    expect(filterClients(rows, { stage: 'active' }).map((c) => c.id).sort()).toEqual(['1', '3'])
  })

  it('stage=resolved matches the resolved case', () => {
    expect(filterClients(rows, { stage: 'resolved' }).map((c) => c.id)).toEqual(['2'])
  })

  it('tag filter', () => {
    expect(filterClients(rows, { tag: 'VIP' }).map((c) => c.id)).toEqual(['1'])
    expect(filterClients(rows, { tag: 'Referral' }).map((c) => c.id)).toEqual(['3'])
  })

  it('combines all filters', () => {
    expect(filterClients(rows, { state: 'FL', health: 'at_risk', tag: 'VIP' }).map((c) => c.id)).toEqual(['1'])
  })

  it('exposes labels for every health', () => {
    for (const k of ['on_track', 'at_risk', 'stalled'] as const) {
      expect(HEALTH_LABELS[k]).toBeTruthy()
    }
  })
})
