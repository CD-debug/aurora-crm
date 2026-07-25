// Shared TanStack Query keys (PRD §5.1/§7.4). A mutation on any page
// invalidates these so every other view of the same record refetches.
export const queryKeys = {
  clients: {
    all: ['clients'] as const,
    detail: (id: string) => ['clients', 'detail', id] as const,
    search: (q: string) => ['clients', 'search', q] as const,
  },
  tasks: {
    all: ['tasks'] as const,
  },
} as const
