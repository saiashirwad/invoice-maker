import type { ReactNode } from 'react'

export type AdminMetric = {
  label: string
  value: string | number
}

export type AdminContextBandProps = {
  routeBadge: string
  routeLabel: string
  metrics: AdminMetric[]
  utility?: ReactNode
  className?: string
}

export function AdminContextBand({
  routeBadge,
  routeLabel,
  metrics,
  utility,
  className = '',
}: AdminContextBandProps) {
  return (
    <header
      className={`sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--background)] px-4 py-4 sm:px-8 ${className}`}
    >
      <div className="mx-auto flex max-w-[1280px] flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-[0.15em] text-[var(--muted-foreground)]">
            {routeBadge}
          </p>
          <h1 className="mt-1 text-lg font-semibold text-[var(--foreground)] md:text-xl">
            {routeLabel}
          </h1>
          <div className="mt-3 flex flex-wrap gap-2">
            {metrics.map((metric) => (
              <span
                key={`${metric.label}-${metric.value}`}
                className="inline-flex items-center rounded-full border border-[var(--border)] bg-[var(--card)] px-2.5 py-1 text-xs text-[var(--muted-foreground)]"
              >
                <span className="mr-1.5 text-[var(--foreground)]">
                  {metric.label}:
                </span>
                <span className="font-medium tabular-nums text-[var(--foreground)]">
                  {metric.value}
                </span>
              </span>
            ))}
          </div>
        </div>
        {utility && (
          <div className="w-full pt-3 text-right sm:w-auto sm:pt-0">
            {utility}
          </div>
        )}
      </div>
    </header>
  )
}
