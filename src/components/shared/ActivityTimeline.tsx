import { Clock, FileText, CheckCircle, Home } from 'lucide-react'

interface TimelineItem {
  id: string
  type: 'note' | 'task' | 'property' | 'stage_change'
  title: string
  description?: string
  date: string
}

export function ActivityTimeline({ items }: { items: TimelineItem[] }) {
  const sorted = [...items].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  return (
    <div className="relative space-y-4 before:absolute before:left-[11px] before:top-2 before:h-[calc(100%-16px)] before:w-px before:bg-muted">
      {sorted.map(item => (
        <div key={item.id} className="relative flex gap-3">
          <div className="relative z-10 mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border bg-background">
            {item.type === 'note' && <FileText className="h-3 w-3 text-blue-500" />}
            {item.type === 'task' && <CheckCircle className="h-3 w-3 text-green-500" />}
            {item.type === 'property' && <Home className="h-3 w-3 text-orange-500" />}
            {item.type === 'stage_change' && <Clock className="h-3 w-3 text-purple-500" />}
          </div>
          <div className="flex-1 pb-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">{item.title}</p>
              <time className="text-xs text-muted-foreground">{new Date(item.date).toLocaleDateString()}</time>
            </div>
            {item.description && <p className="text-sm text-muted-foreground mt-0.5">{item.description}</p>}
          </div>
        </div>
      ))}
    </div>
  )
}
