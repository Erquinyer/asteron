const Block = ({ className = '' }) => (
  <div className={`bg-surface2 rounded animate-pulse ${className}`} />
)

export const KpiStripSkeleton = () => (
  <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-border rounded-card
    overflow-hidden border border-border"
  >
    {[0, 1, 2, 3].map(i => (
      <div key={i} className="bg-surface p-4 space-y-3">
        <Block className="h-3 w-20" />
        <Block className="h-7 w-16" />
        <Block className="h-1 w-full" />
        <Block className="h-2.5 w-24" />
      </div>
    ))}
  </div>
)

export const CardSkeleton = ({ height = 200 }) => (
  <div className="bg-surface border border-border rounded-card shadow-card dark:shadow-card-dk p-[18px] space-y-3">
    <Block className="h-4 w-40" />
    <Block className="h-3 w-28" />
    <div style={{ height }} className="bg-surface2 rounded-control animate-pulse mt-2" />
  </div>
)

export const ListSkeleton = ({ rows = 5 }) => (
  <div className="bg-surface border border-border rounded-card shadow-card dark:shadow-card-dk overflow-hidden">
    <div className="px-[18px] py-4 border-b border-border">
      <Block className="h-4 w-32" />
    </div>
    <div className="divide-y divide-border">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="px-[18px] py-3 flex items-center gap-3">
          <Block className="h-8 w-8 rounded-[8px] shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Block className="h-3 w-2/3" />
            <Block className="h-2.5 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  </div>
)
