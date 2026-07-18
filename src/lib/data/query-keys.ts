export const queryKeys = {
  clients: {
    all: ['clients'] as const,
    list: (filters?: Record<string, string>) => ['clients', 'list', filters] as const,
    detail: (id: string) => ['clients', 'detail', id] as const,
  },
  properties: {
    all: ['properties'] as const,
    byClient: (clientId: string) => ['properties', 'client', clientId] as const,
  },
  notes: {
    all: ['notes'] as const,
    byClient: (clientId: string) => ['notes', 'client', clientId] as const,
  },
  tasks: {
    all: ['tasks'] as const,
    list: (filters?: Record<string, string>) => ['tasks', 'list', filters] as const,
    byClient: (clientId: string) => ['tasks', 'client', clientId] as const,
  },
  dashboard: {
    metrics: ['dashboard', 'metrics'] as const,
  },
} as const

export type QueryKeys = typeof queryKeys