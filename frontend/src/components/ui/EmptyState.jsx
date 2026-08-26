import { Inbox } from 'lucide-react'

export default function EmptyState({
  title = 'Sin datos',
  description = 'No hay información para mostrar.',
  icon: Icon = Inbox,
  action,
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-gray-400 dark:text-slate-500">
      <Icon className="h-12 w-12" strokeWidth={1.2} />
      <p className="text-base font-medium text-gray-500 dark:text-slate-400">{title}</p>
      {description && <p className="text-sm">{description}</p>}
      {action && <div className="mt-1">{action}</div>}
    </div>
  )
}
