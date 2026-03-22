import type { ReactNode } from 'react'
import { ArrowRight } from 'lucide-react'

export function InvoiceQuickView({
  amount,
  date,
  fromEntity,
  toEntity,
  toEntityPreformatted,
  amountExtra,
  children,
}: {
  amount: string
  date: string
  fromEntity?: string
  toEntity: string
  toEntityPreformatted?: boolean
  amountExtra?: ReactNode
  children?: ReactNode
}) {
  return (
    <>
      {/* Amount + date */}
      <div className="rounded-lg bg-[var(--muted)] px-4 py-3">
        <div className="flex items-baseline justify-between">
          <div className="text-2xl font-bold tabular-nums text-[var(--foreground)]">
            {amount}
          </div>
          <div className="text-right text-sm text-[var(--muted-foreground)]">
            {date}
          </div>
        </div>
        {amountExtra}
      </div>

      {/* Entity details */}
      <div className="flex items-center gap-3 text-sm">
        {fromEntity && (
          <>
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
                From
              </div>
              <div className="mt-0.5 truncate text-[var(--foreground)]">
                {fromEntity}
              </div>
            </div>
            <ArrowRight
              size={14}
              className="shrink-0 text-[var(--muted-foreground)]"
            />
          </>
        )}
        <div className={fromEntity ? 'min-w-0 flex-1' : ''}>
          <div className="text-[11px] font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
            {fromEntity ? 'Bill To' : 'Pay To'}
          </div>
          <div
            className={`mt-1 text-[var(--foreground)] ${toEntityPreformatted ? 'whitespace-pre-line' : 'truncate'}`}
          >
            {toEntity}
          </div>
        </div>
      </div>

      {children}
    </>
  )
}
