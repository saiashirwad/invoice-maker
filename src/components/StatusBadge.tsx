const statusStyles: Record<string, { badge: string; dot: string }> = {
  draft: {
    badge: 'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300',
    dot: 'bg-stone-400 dark:bg-stone-500',
  },
  submitted: {
    badge: 'bg-sky-50 text-sky-700 dark:bg-sky-900 dark:text-sky-300',
    dot: 'bg-sky-500 dark:bg-sky-400',
  },
  approved: {
    badge:
      'bg-emerald-50 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300',
    dot: 'bg-emerald-500 dark:bg-emerald-400',
  },
  rejected: {
    badge: 'bg-rose-50 text-rose-700 dark:bg-rose-900 dark:text-rose-300',
    dot: 'bg-rose-500 dark:bg-rose-400',
  },
  paid: {
    badge:
      'bg-violet-50 text-violet-700 dark:bg-violet-900 dark:text-violet-300',
    dot: 'bg-violet-500 dark:bg-violet-400',
  },
}

const fallback = {
  badge: 'bg-stone-100 text-stone-600',
  dot: 'bg-stone-400',
}

function sentenceCase(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()
}

export function StatusBadge({ status }: { status: string }) {
  const styles = statusStyles[status] ?? fallback
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium tracking-wide ${styles.badge}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${styles.dot}`} />
      {sentenceCase(status)}
    </span>
  )
}
