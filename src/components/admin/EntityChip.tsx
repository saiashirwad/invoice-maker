type EntityChipProps = {
  entity: string
  className?: string
}

const ENTITY_STYLES: Record<string, string> = {
  SV: 'border-sky-300/70 text-sky-700 dark:border-sky-700/70 dark:text-sky-200',
  LP: 'border-emerald-300/70 text-emerald-700 dark:border-emerald-700/70 dark:text-emerald-200',
}

export function EntityChip({ entity, className = '' }: EntityChipProps) {
  const styles =
    ENTITY_STYLES[entity.trim().toUpperCase()] ??
    'border-zinc-400/40 text-zinc-700 dark:border-zinc-700/70 dark:text-zinc-200'

  return (
    <span
      className={`inline-flex items-center rounded-full border bg-transparent px-2.5 py-1 text-[11px] font-medium ${styles} ${className}`}
    >
      {entity.toUpperCase()}
    </span>
  )
}
