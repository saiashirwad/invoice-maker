import type { ReactNode } from 'react'
import { StatusBadge } from './StatusBadge'

export const invoiceRowClass =
  'flex w-full items-center justify-between gap-4 border-l-2 border-l-[var(--background)] pl-2.5 py-4 text-left transition-all hover:bg-[var(--accent)] hover:shadow-[0_1px_2px_rgba(0,0,0,0.04)] focus-visible:bg-[var(--accent)] [outline:none] [box-shadow:none]'

export function formatInvoiceDate(timestamp: number | Date | null): string {
  if (!timestamp) return ''
  const d = typeof timestamp === 'number' ? new Date(timestamp) : timestamp
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function getBillToName(billTo: string): string {
  return billTo.split(/\\n|\n/)[0].trim() || billTo
}

export function InvoiceRow({
  invoiceNumber,
  status,
  date,
  entityName,
  amount,
  leading,
  trailing,
  subtitle,
  entityBadge,
}: {
  invoiceNumber: string
  status: string
  date: number | Date | null
  entityName: string
  amount: string
  leading?: ReactNode
  trailing?: ReactNode
  subtitle?: ReactNode
  entityBadge?: string
}) {
  return (
    <>
      {leading}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2.5">
          <span className="text-sm font-medium text-[var(--foreground)]">
            #{invoiceNumber}
          </span>
          <StatusBadge status={status} />
          {entityBadge && (
            <span className="rounded bg-[var(--muted)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--muted-foreground)]">
              {entityBadge}
            </span>
          )}
          <span className="shrink-0 text-xs text-[var(--muted-foreground)]">
            {formatInvoiceDate(date)}
          </span>
        </div>
        {(entityName || subtitle) && (
          <p className="mt-0.5 truncate text-xs text-[var(--muted-foreground)]">
            {entityName}
            {subtitle && (
              <>
                <span className="mx-1.5">&middot;</span>
                {subtitle}
              </>
            )}
          </p>
        )}
      </div>
      <span className="shrink-0 text-sm font-semibold tabular-nums text-[var(--foreground)]">
        {amount}
      </span>
      {trailing}
    </>
  )
}
