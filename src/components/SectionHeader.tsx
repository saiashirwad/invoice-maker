export function SectionHeader({
  label,
  count,
  total,
  dot,
}: {
  label: string
  count: number
  total?: string
  dot?: string
}) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <div className="flex items-center gap-2">
        {dot && <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />}
        <h2 className="text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
          {label} ({count})
        </h2>
      </div>
      {total && (
        <span className="text-xs tabular-nums text-[var(--muted-foreground)]">
          {total}
        </span>
      )}
    </div>
  )
}
