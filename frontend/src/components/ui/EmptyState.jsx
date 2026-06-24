import { Inbox } from 'lucide-react'

export default function EmptyState({ title = 'Sin datos', description = 'No hay información para mostrar.' }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-gray-400">
      <Inbox className="h-12 w-12" strokeWidth={1.2} />
      <p className="text-base font-medium text-gray-500">{title}</p>
      {description && <p className="text-sm">{description}</p>}
    </div>
  )
}
